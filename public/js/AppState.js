/**
 * AppState - gerenciamento centralizado de estado de mensagens e badges.
 * Responsável por sincronizar leituras, contadores e broadcasts entre abas.
 */
class AppState {
  constructor() {
    this.messages = new Map();
    this.readStatus = new Map();
    this.notifications = new Map();
    this.currentChat = null;
    this.isMobile = window.innerWidth <= 768;
    this.broadcastChannel = null;
    this.eventListeners = new Map();
    this.pendingReadSync = new Set();
    this.legacyReadKeys = new Set();

    this.setupBroadcastChannel();
    this.loadPersistedState();
    this.setupEventListeners();

    console.log('[AppState] Initialized');
  }

  setupBroadcastChannel() {
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('privapp-state');
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
        console.log('[AppState] BroadcastChannel ready');
      } catch (error) {
        console.warn('[AppState] BroadcastChannel unavailable:', error);
      }
    }
  }

  setupEventListeners() {
    document.addEventListener('markMessagesAsRead', (event) => {
      const { chatId } = event.detail || {};
      if (chatId) {
        this.markChatAsRead(chatId);
      }
    });

    document.addEventListener('stopNotifications', (event) => {
      const { chatId } = event.detail || {};
      if (chatId) {
        this.stopNotifications(chatId);
      }
    });

    document.addEventListener('updateBadges', (event) => {
      const { chatId, count } = event.detail || {};
      if (chatId !== undefined && count !== undefined) {
        this.updateBadgeCount(chatId, count);
      }
    });
  }

  loadPersistedState() {
    try {
      const readStatusData = localStorage.getItem('privapp-read-status');
      if (readStatusData) {
        const readStatusArray = JSON.parse(readStatusData);
        this.readStatus = new Map(readStatusArray);
      }

      const notificationsData = localStorage.getItem('privapp-notifications');
      if (notificationsData) {
        const notificationsArray = JSON.parse(notificationsData);
        this.notifications = new Map(notificationsArray);
      }

      console.log('[AppState] State restored from storage');
    } catch (error) {
      console.error('[AppState] Failed to restore state:', error);
      this.readStatus.clear();
      this.notifications.clear();
    }
  }

  persistState() {
    try {
      const readStatusArray = Array.from(this.readStatus.entries());
      localStorage.setItem('privapp-read-status', JSON.stringify(readStatusArray));

      const notificationsArray = Array.from(this.notifications.entries());
      localStorage.setItem('privapp-notifications', JSON.stringify(notificationsArray));
    } catch (error) {
      console.error('[AppState] Failed to persist state:', error);
    }
  }

  getChatIdForMessage(message) {
    if (!message) {
      return null;
    }
    if (message.chatId) {
      return message.chatId;
    }
    if (message.fromMe) {
      return message.to || null;
    }
    return message.from || message.to || null;
  }

  buildLegacyKeys(message) {
    const keys = [];
    if (!message) {
      return keys;
    }
    if (message.id) {
      keys.push(String(message.id));
    }
    if (message.timestamp) {
      keys.push(String(message.timestamp));
    }
    const timestamp = message.timestamp || '';
    if (timestamp || message.from) {
      keys.push(`${timestamp}_${message.from || ''}`);
    }
    if (timestamp || message.to) {
      keys.push(`${timestamp}_${message.to || ''}`);
    }
    if (message.tempId) {
      keys.push(`temp_${message.tempId}`);
    }
    return keys.filter(Boolean);
  }

  normalizeMessage(raw) {
    if (!raw) {
      return null;
    }
    const message = { ...raw };
    message.isRead = Boolean(message.isRead || message.lida);
    message.readAt = message.readAt || null;
    message.chatId = this.getChatIdForMessage(message);

    if (!message.isRead && this.legacyReadKeys.size > 0) {
      const candidateKeys = this.buildLegacyKeys(message);
      if (candidateKeys.some(key => this.legacyReadKeys.has(key))) {
        message.isRead = true;
        message.readAt = message.readAt || new Date().toISOString();
      }
    }

    if (message.isRead) {
      message.lida = true;
    }

    return message;
  }

  setMessages(messages) {
    this.messages.clear();

    const list = Array.isArray(messages) ? messages : [];
    list.forEach((rawMessage) => {
      const normalized = this.normalizeMessage(rawMessage);
      if (!normalized || !normalized.id) {
        return;
      }
      this.messages.set(normalized.id, normalized);
      if (normalized.isRead) {
        this.ensureReadStatus(normalized);
      }
    });

    this.persistState();
    console.log(`[AppState] Messages synced: ${this.messages.size}`);
  }

  addMessage(message) {
    const normalized = this.normalizeMessage(message);
    if (!normalized || !normalized.id) {
      return null;
    }

    const existing = this.messages.get(normalized.id);
    const isNew = !existing;
    const merged = isNew ? normalized : { ...existing, ...normalized };

    this.messages.set(merged.id, merged);

    if (merged.isRead) {
      this.ensureReadStatus(merged);
    }

    const payload = {
      messageId: merged.id,
      updates: merged
    };

    if (isNew) {
      this.broadcastMessage('message-added', { message: merged });
    } else {
      this.broadcastMessage('message-updated', payload);
    }

    return merged;
  }

  updateMessage(messageId, updates) {
    const current = this.messages.get(messageId);
    if (!current) {
      return;
    }
    const merged = this.normalizeMessage({ ...current, ...updates, id: messageId });
    this.messages.set(messageId, merged);

    if (merged.isRead) {
      this.ensureReadStatus(merged);
    }

    this.broadcastMessage('message-updated', { messageId, updates: merged });
  }

  ensureReadStatus(message) {
    const chatId = this.getChatIdForMessage(message);
    if (!chatId) {
      return;
    }
    const readAtIso = message.readAt || new Date().toISOString();
    this.readStatus.set(message.id, {
      timestamp: Date.parse(readAtIso) || Date.now(),
      chatId,
      readAt: readAtIso
    });
  }

  markMessageAsRead(messageId, chatId, options = {}) {
    const { suppressBroadcast = false, readAt = null, skipPersist = false } = options;
    const readTimestamp = readAt ? (Date.parse(readAt) || Date.now()) : Date.now();
    const readAtIso = readAt || new Date(readTimestamp).toISOString();

    const existing = this.messages.get(messageId);
    if (existing) {
      this.messages.set(messageId, { ...existing, isRead: true, lida: true, readAt: readAtIso });
    }

    this.readStatus.set(messageId, {
      timestamp: readTimestamp,
      chatId,
      readAt: readAtIso
    });

    if (!skipPersist) {
      this.persistState();
    }

    if (!suppressBroadcast) {
      this.broadcastReadStatus(messageId, chatId, readAtIso);
    }

    console.log('[AppState] Message marked as read:', messageId);
  }

  markChatAsRead(chatId) {
    if (!chatId) {
      return;
    }

    let markedCount = 0;

    for (const [messageId, message] of this.messages) {
      if (message.isRead) {
        continue;
      }
      if ((message.from === chatId || message.to === chatId) && !message.fromMe) {
        this.markMessageAsRead(messageId, chatId, { skipPersist: true });
        markedCount += 1;
      }
    }

    this.updateBadgeCount(chatId, 0);
    this.persistState();

    if (!this.pendingReadSync.has(chatId)) {
      this.pendingReadSync.add(chatId);
      fetch(`/api/chats/${encodeURIComponent(chatId)}/read`, { method: 'POST' })
        .catch(error => {
          console.error('[AppState] Failed to sync read state:', error);
        })
        .finally(() => {
          this.pendingReadSync.delete(chatId);
        });
    }

    console.log('[AppState] Chat marked as read:', chatId, 'Messages:', markedCount);
  }

  isMessageRead(messageId) {
    if (this.readStatus.has(messageId)) {
      return true;
    }
    const message = this.messages.get(messageId);
    return message ? Boolean(message.isRead) : false;
  }

  getUnreadCount(chatId) {
    let count = 0;
    for (const [, message] of this.messages) {
      if ((message.from === chatId || message.to === chatId) && !message.fromMe && !message.isRead) {
        count += 1;
      }
    }
    return count;
  }

  updateBadgeCount(chatId, count) {
    if (chatId === undefined || count === undefined) {
      return;
    }
    const current = this.notifications.get(chatId);
    if (current === count) {
      return;
    }
    this.notifications.set(chatId, count);
    this.persistState();
    this.broadcastMessage('badge-updated', { chatId, count });
    console.log('[AppState] Badge updated:', chatId, 'Count:', count);
  }

  getBadgeCount(chatId) {
    return this.notifications.get(chatId) || 0;
  }

  stopNotifications(chatId) {
    this.updateBadgeCount(chatId, 0);
    this.broadcastMessage('notifications-stopped', { chatId });
  }

  setCurrentChat(chatId) {
    const previousChat = this.currentChat;
    this.currentChat = chatId;

    if (previousChat !== chatId) {
      if (previousChat) {
        this.markChatAsRead(previousChat);
      }
      this.broadcastMessage('chat-changed', {
        previousChat,
        currentChat: chatId
      });
      console.log('[AppState] Current chat changed:', previousChat, '->', chatId);
    }
  }

  broadcastMessage(type, data) {
    if (!this.broadcastChannel) {
      return;
    }
    try {
      this.broadcastChannel.postMessage({
        type,
        data,
         timestamp: Date.now(),
        source: 'privapp'
      });
    } catch (error) {
      console.error('[AppState] Broadcast failed:', error);
    }
  }

  broadcastReadStatus(messageId, chatId, readAt) {
    this.broadcastMessage('message-read', { messageId, chatId, readAt });
  }

  handleBroadcastMessage(message) {
    if (!message || message.source !== 'privapp') {
      return;
    }

    switch (message.type) {
      case 'message-added':
        this.addMessage(message.data.message);
        break;
      case 'message-updated':
        this.updateMessage(message.data.messageId, message.data.updates);
        break;
      case 'message-read':
        this.markMessageAsRead(message.data.messageId, message.data.chatId, {
          suppressBroadcast: true,
          readAt: message.data.readAt || null,
          skipPersist: true
        });
        this.persistState();
        break;
      case 'chat-changed':
        this.currentChat = message.data.currentChat;
        break;
      case 'badge-updated':
        this.updateBadgeCount(message.data.chatId, message.data.count);
        break;
      case 'notifications-stopped':
        this.stopNotifications(message.data.chatId);
        break;
      default:
        console.log('[AppState] Ignored broadcast:', message.type);
    }
  }

  getChatMessages(chatId) {
    const messages = [];
    for (const [, message] of this.messages) {
      if (message.from === chatId || message.to === chatId) {
        messages.push(message);
      }
    }
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  getMessageById(messageId) {
    return this.messages.get(messageId);
  }

  getAllMessages() {
    return Array.from(this.messages.values());
  }

  getAllChats() {
    const chats = new Set();
    for (const [, message] of this.messages) {
      const chatId = this.getChatIdForMessage(message);
      if (chatId) {
        chats.add(chatId);
      }
    }
    return Array.from(chats);
  }

  getReadStatus() {
    return new Map(this.readStatus);
  }

  getNotificationStatus() {
    return new Map(this.notifications);
  }

  migrateLegacyReadStatus(entries) {
    if (!entries || (entries instanceof Set && entries.size === 0)) {
      return { total: 0, applied: 0 };
    }

    const incoming = entries instanceof Set ? entries : new Set(entries);
    this.legacyReadKeys = new Set(Array.from(incoming, value => String(value)));

    const applied = this.applyLegacyReadsToMessages();

    try {
      localStorage.removeItem('mensagensLidas');
    } catch (error) {
      console.warn('[AppState] Unable to clear legacy storage:', error);
    }

    console.log('[AppState] Legacy read status migrated:', { total: incoming.size, applied });
    return { total: incoming.size, applied };
  }

  applyLegacyReadsToMessages() {
    if (this.legacyReadKeys.size === 0) {
      return 0;
    }
    let applied = 0;
    for (const [messageId, message] of this.messages) {
      if (message.isRead) {
        continue;
      }
      if (this.shouldMarkAsReadFromLegacy(message)) {
        this.markMessageAsRead(messageId, this.getChatIdForMessage(message), {
          suppressBroadcast: true,
          skipPersist: true
        });
        applied += 1;
      }
    }
    if (applied > 0) {
      this.persistState();
    }
    return applied;
  }

  shouldMarkAsReadFromLegacy(message) {
    if (!message || this.legacyReadKeys.size === 0) {
      return false;
    }
    const candidateKeys = this.buildLegacyKeys(message);
    return candidateKeys.some(key => this.legacyReadKeys.has(key));
  }

  clearState() {
    this.messages.clear();
    this.readStatus.clear();
    this.notifications.clear();
    this.currentChat = null;
    localStorage.removeItem('privapp-read-status');
    localStorage.removeItem('privapp-notifications');
    console.log('[AppState] State cleared');
  }

  destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    this.messages.clear();
    this.readStatus.clear();
    this.notifications.clear();
    this.eventListeners.clear();
    this.pendingReadSync.clear();
    this.legacyReadKeys.clear();
    console.log('[AppState] Destroyed');
  }
}

window.AppState = AppState;

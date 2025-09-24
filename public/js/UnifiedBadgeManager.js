/**
 * UnifiedBadgeManager - Sistema unificado para gerenciar badges e leitura.
 * Integra AppState, MessageViewTracker, NotificationManager e BadgeManager.
 */
class UnifiedBadgeManager {
  constructor() {
    this.appState = null;
    this.messageViewTracker = null;
    this.notificationManager = null;
    this.badgeManager = null;

    this.isInitialized = false;
    this.eventListeners = new Map();
    this.migrationCompleted = false;

    console.log('[UnifiedBadgeManager] Constructed');
  }

  async initialize(appState, messageViewTracker, notificationManager, badgeManager) {
    this.appState = appState || null;
    this.messageViewTracker = messageViewTracker || null;
    this.notificationManager = notificationManager || null;
    this.badgeManager = badgeManager || null;

    this.validateComponents();
    this.setupUnifiedEvents();

    await this.migrateFromLegacySystem();
    this.synchronizeInitialState();

    this.isInitialized = true;
    console.log('[UnifiedBadgeManager] Initialized');
    return true;
  }

  validateComponents() {
    const components = {
      appState: this.appState,
      messageViewTracker: this.messageViewTracker,
      notificationManager: this.notificationManager,
      badgeManager: this.badgeManager
    };

    const missing = Object.entries(components)
      .filter(([, instance]) => !instance)
      .map(([name]) => name);

    if (missing.length > 0) {
      console.warn('[UnifiedBadgeManager] Components missing:', missing);
    }
  }

  setupUnifiedEvents() {
    this.addEventListener('nova-mensagem', (event) => {
      this.handleNewMessage(event.detail);
    });

    this.addEventListener('contato-selecionado', (event) => {
      this.handleChatSelected(event.detail.chatId);
    });

    this.addEventListener('scroll-to-bottom', (event) => {
      this.handleScrollToBottom(event.detail.chatId);
    });

    this.addEventListener('mark-as-read', (event) => {
      this.handleMarkAsRead(event.detail.chatId);
    });
  }

  addEventListener(eventName, handler) {
    if (!eventName || typeof handler !== 'function') {
      return;
    }
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, []);
    }
    this.eventListeners.get(eventName).push(handler);
    document.addEventListener(eventName, handler);
  }

  handleNewMessage(detail = {}) {
    const message = detail.message || detail;
    if (!message) {
      return;
    }

    const alreadyPersisted = Boolean(detail && detail.messageAdded);
    const chatId = message.fromMe ? (message.to || message.chatId) : (message.from || message.chatId);
    if (!chatId) {
      return;
    }

    if (this.appState && !alreadyPersisted) {
      this.appState.addMessage(message);
    }

    if (!this.shouldShowBadge(chatId, message)) {
      return;
    }

    const currentCount = this.getBadgeCount(chatId);
    this.updateBadge(chatId, currentCount + 1);

    if (this.notificationManager) {
      this.notificationManager.playNotificationSound(chatId);
    }
  }

  shouldShowBadge(chatId, message) {
    if (!chatId || !message) {
      return false;
    }

    if (message.fromMe) {
      return false;
    }

    if (this.notificationManager) {
      return this.notificationManager.shouldNotify(chatId, message);
    }

    const currentChat = this.getCurrentChat();
    return chatId !== currentChat;
  }

  markChatAsRead(chatId) {
    if (!chatId) {
      return;
    }

    if (this.messageViewTracker) {
      this.messageViewTracker.markChatAsViewed(chatId, true);
    }

    if (this.notificationManager) {
      this.notificationManager.markChatAsViewed(chatId);
    }

    if (this.appState) {
      this.appState.markChatAsRead(chatId);
    } else if (this.badgeManager) {
      this.badgeManager.updateBadge(chatId, 0);
    }

    if (window.showReadConfirmation) {
      window.showReadConfirmation(chatId);
    }

    this.emitEvent('chat-marked-as-read', { chatId });
  }

  updateBadge(chatId, count) {
    if (this.appState) {
      this.appState.updateBadgeCount(chatId, count);
    } else if (this.badgeManager) {
      this.badgeManager.updateBadge(chatId, count);
    }
  }

  getBadgeCount(chatId) {
    if (this.appState) {
      return this.appState.getUnreadCount(chatId);
    }
    if (this.badgeManager) {
      return this.badgeManager.getBadgeCount(chatId);
    }
    if (typeof window.contarMensagensNaoLidas === 'function') {
      return window.contarMensagensNaoLidas(chatId);
    }
    return 0;
  }

  getCurrentChat() {
    if (this.appState && this.appState.currentChat) {
      return this.appState.currentChat;
    }
    if (this.messageViewTracker && this.messageViewTracker.currentChat) {
      return this.messageViewTracker.currentChat;
    }
    return window.contatoSelecionado || null;
  }

  async migrateFromLegacySystem() {
    try {
      const legacyReadMessages = localStorage.getItem('mensagensLidas');
      if (legacyReadMessages && this.appState) {
        const readSet = new Set(JSON.parse(legacyReadMessages));
        this.appState.migrateLegacyReadStatus(readSet);
      }

      if (window.naoLidas && this.appState) {
        Object.entries(window.naoLidas).forEach(([chatId, count]) => {
          if (count > 0) {
            this.appState.updateBadgeCount(chatId, Number(count));
          }
        });
      }

      this.migrationCompleted = true;
      console.log('[UnifiedBadgeManager] Legacy data migrated');
    } catch (error) {
      console.error('[UnifiedBadgeManager] Failed to migrate legacy data:', error);
    }
  }

  synchronizeInitialState() {
    const currentChat = this.getCurrentChat();
    if (currentChat) {
      if (this.messageViewTracker) {
        this.messageViewTracker.setCurrentChat(currentChat);
      }
      if (this.notificationManager) {
        this.notificationManager.setCurrentChat(currentChat);
      }
    }
  }

  emitEvent(eventName, detail) {
    if (!eventName) {
      return;
    }
    document.dispatchEvent(new CustomEvent(eventName, { detail }));
  }

  getStats() {
    return {
      initialized: this.isInitialized,
      migrationCompleted: this.migrationCompleted,
      components: {
        appState: Boolean(this.appState),
        messageViewTracker: Boolean(this.messageViewTracker),
        notificationManager: Boolean(this.notificationManager),
        badgeManager: Boolean(this.badgeManager)
      },
      currentChat: this.getCurrentChat()
    };
  }

  destroy() {
    for (const [eventName, handlers] of this.eventListeners.entries()) {
      handlers.forEach((handler) => document.removeEventListener(eventName, handler));
    }
    this.eventListeners.clear();
    this.isInitialized = false;
    this.migrationCompleted = false;
    console.log('[UnifiedBadgeManager] Destroyed');
  }
}

window.UnifiedBadgeManager = UnifiedBadgeManager;

window.initializeUnifiedBadgeSystem = async function initializeUnifiedBadgeSystem() {
  console.log('[UnifiedBadgeManager] Bootstrapping');
  const unifiedManager = new UnifiedBadgeManager();
  const success = await unifiedManager.initialize(
    window.appState,
    window.messageViewTracker,
    window.notificationManager,
    window.badgeManager
  );

  if (success) {
    window.unifiedBadgeManager = unifiedManager;
    console.log('[UnifiedBadgeManager] Active', unifiedManager.getStats());
    return unifiedManager;
  }

  console.warn('[UnifiedBadgeManager] Initialization failed');
  return null;
};


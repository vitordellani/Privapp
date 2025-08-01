/**
 * AppState - Sistema de Estado Centralizado
 * Melhora a sincronização entre componentes e corrige problemas de duplicação
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
    
    this.setupBroadcastChannel();
    this.loadPersistedState();
    this.setupEventListeners();
    
    console.log('[AppState] Inicializado');
  }

  setupBroadcastChannel() {
    // Usar BroadcastChannel para sincronizar entre abas
    if ('BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('privapp-state');
        
        this.broadcastChannel.onmessage = (event) => {
          this.handleBroadcastMessage(event.data);
        };
        
        console.log('[AppState] BroadcastChannel configurado');
      } catch (error) {
        console.warn('[AppState] BroadcastChannel não disponível:', error);
      }
    }
  }

  setupEventListeners() {
    // Escutar eventos do MessageViewTracker
    document.addEventListener('markMessagesAsRead', (event) => {
      const { chatId } = event.detail;
      this.markChatAsRead(chatId);
    });

    // Escutar eventos do NotificationManager
    document.addEventListener('stopNotifications', (event) => {
      const { chatId } = event.detail;
      this.stopNotifications(chatId);
    });

    document.addEventListener('updateBadges', (event) => {
      const { chatId, count } = event.detail;
      this.updateBadgeCount(chatId, count);
    });
  }

  loadPersistedState() {
    // Carregar estado persistido do localStorage
    try {
      // Carregar mensagens lidas
      const readStatusData = localStorage.getItem('privapp-read-status');
      if (readStatusData) {
        const readStatusArray = JSON.parse(readStatusData);
        this.readStatus = new Map(readStatusArray);
      }

      // Carregar notificações
      const notificationsData = localStorage.getItem('privapp-notifications');
      if (notificationsData) {
        const notificationsArray = JSON.parse(notificationsData);
        this.notifications = new Map(notificationsArray);
      }

      console.log('[AppState] Estado carregado do localStorage');
    } catch (error) {
      console.error('[AppState] Erro ao carregar estado:', error);
    }
  }

  persistState() {
    // Persistir estado no localStorage
    try {
      // Salvar mensagens lidas
      const readStatusArray = Array.from(this.readStatus.entries());
      localStorage.setItem('privapp-read-status', JSON.stringify(readStatusArray));

      // Salvar notificações
      const notificationsArray = Array.from(this.notifications.entries());
      localStorage.setItem('privapp-notifications', JSON.stringify(notificationsArray));

      console.log('[AppState] Estado persistido no localStorage');
    } catch (error) {
      console.error('[AppState] Erro ao persistir estado:', error);
    }
  }

  setMessages(messages) {
    // Atualizar mensagens no estado
    this.messages.clear();
    
    messages.forEach(msg => {
      this.messages.set(msg.id, msg);
    });
    
    console.log('[AppState] Mensagens atualizadas:', this.messages.size);
  }

  addMessage(message) {
    // Adicionar nova mensagem
    if (!this.messages.has(message.id)) {
      this.messages.set(message.id, message);
      
      // Broadcast para outras abas
      this.broadcastMessage('message-added', { message });
      
      console.log('[AppState] Nova mensagem adicionada:', message.id);
    }
  }

  updateMessage(messageId, updates) {
    // Atualizar mensagem existente
    const message = this.messages.get(messageId);
    if (message) {
      const updatedMessage = { ...message, ...updates };
      this.messages.set(messageId, updatedMessage);
      
      // Broadcast para outras abas
      this.broadcastMessage('message-updated', { messageId, updates });
      
      console.log('[AppState] Mensagem atualizada:', messageId);
    }
  }

  markMessageAsRead(messageId, chatId) {
    const readInfo = {
      timestamp: Date.now(),
      chatId: chatId
    };
    
    this.readStatus.set(messageId, readInfo);
    
    // Persistir estado
    this.persistState();
    
    // Broadcast para outras abas
    this.broadcastReadStatus(messageId, chatId);
    
    console.log('[AppState] Mensagem marcada como lida:', messageId);
  }

  markChatAsRead(chatId) {
    // Marcar todas as mensagens do chat como lidas
    let markedCount = 0;
    
    for (const [messageId, message] of this.messages) {
      if ((message.from === chatId || message.to === chatId) && !message.fromMe) {
        if (!this.readStatus.has(messageId)) {
          this.markMessageAsRead(messageId, chatId);
          markedCount++;
        }
      }
    }
    
    // Atualizar contador de notificações
    this.updateBadgeCount(chatId, 0);
    
    console.log('[AppState] Chat marcado como lido:', chatId, 'Mensagens:', markedCount);
  }

  isMessageRead(messageId) {
    return this.readStatus.has(messageId);
  }

  getUnreadCount(chatId) {
    let count = 0;
    
    for (const [messageId, message] of this.messages) {
      if ((message.from === chatId || message.to === chatId) && 
          !message.fromMe && 
          !this.readStatus.has(messageId)) {
        count++;
      }
    }
    
    return count;
  }

  setCurrentChat(chatId) {
    const previousChat = this.currentChat;
    this.currentChat = chatId;
    
    if (previousChat !== chatId) {
      // Marcar chat anterior como lido
      if (previousChat) {
        this.markChatAsRead(previousChat);
      }
      
      // Broadcast mudança de chat
      this.broadcastMessage('chat-changed', { 
        previousChat, 
        currentChat: chatId 
      });
      
      console.log('[AppState] Chat atual alterado:', previousChat, '→', chatId);
    }
  }

  updateBadgeCount(chatId, count) {
    this.notifications.set(chatId, count);
    
    // Persistir estado
    this.persistState();
    
    // Broadcast para outras abas
    this.broadcastMessage('badge-updated', { chatId, count });
    
    console.log('[AppState] Badge atualizado:', chatId, 'Count:', count);
  }

  getBadgeCount(chatId) {
    return this.notifications.get(chatId) || 0;
  }

  stopNotifications(chatId) {
    this.updateBadgeCount(chatId, 0);
    
    // Broadcast para outras abas
    this.broadcastMessage('notifications-stopped', { chatId });
    
    console.log('[AppState] Notificações paradas para:', chatId);
  }

  broadcastMessage(type, data) {
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type,
          data,
          timestamp: Date.now(),
          source: 'privapp'
        });
      } catch (error) {
        console.error('[AppState] Erro ao enviar broadcast:', error);
      }
    }
  }

  broadcastReadStatus(messageId, chatId) {
    this.broadcastMessage('message-read', { messageId, chatId });
  }

  handleBroadcastMessage(message) {
    if (message.source !== 'privapp') return;
    
    switch (message.type) {
      case 'message-added':
        this.addMessage(message.data.message);
        break;
        
      case 'message-updated':
        this.updateMessage(message.data.messageId, message.data.updates);
        break;
        
      case 'message-read':
        this.markMessageAsRead(message.data.messageId, message.data.chatId);
        break;
        
      case 'chat-changed':
        this.setCurrentChat(message.data.currentChat);
        break;
        
      case 'badge-updated':
        this.updateBadgeCount(message.data.chatId, message.data.count);
        break;
        
      case 'notifications-stopped':
        this.stopNotifications(message.data.chatId);
        break;
        
      default:
        console.log('[AppState] Broadcast não reconhecido:', message.type);
    }
  }

  getChatMessages(chatId) {
    const messages = [];
    
    for (const [messageId, message] of this.messages) {
      if (message.from === chatId || message.to === chatId) {
        messages.push(message);
      }
    }
    
    // Ordenar por timestamp
    return messages.sort((a, b) => a.timestamp - b.timestamp);
  }

  getMessageById(messageId) {
    return this.messages.get(messageId);
  }

  getAllMessages() {
    return Array.from(this.messages.values());
  }

  getReadStatus() {
    return new Map(this.readStatus);
  }

  getNotificationStatus() {
    return new Map(this.notifications);
  }

  clearState() {
    this.messages.clear();
    this.readStatus.clear();
    this.notifications.clear();
    this.currentChat = null;
    
    // Limpar localStorage
    localStorage.removeItem('privapp-read-status');
    localStorage.removeItem('privapp-notifications');
    
    console.log('[AppState] Estado limpo');
  }

  destroy() {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
    }
    
    this.messages.clear();
    this.readStatus.clear();
    this.notifications.clear();
    this.eventListeners.clear();
    
    console.log('[AppState] Destruído');
  }
}

// Exportar para uso global
window.AppState = AppState; 
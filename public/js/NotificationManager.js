/**
 * NotificationManager - Sistema de Gerenciamento de Notificações Inteligente
 * Corrige o problema de notificações persistentes no modo mobile
 */

class NotificationManager {
  constructor() {
    this.activeNotifications = new Map();
    this.viewedChats = new Set();
    this.mutedChats = new Set();
    this.notificationSettings = new Map();
    this.isMobileView = window.innerWidth <= 768;
    this.currentChat = null;
    this.isWindowFocused = true;
    this.isPageVisible = true;
    
    this.setupMobileDetection();
    this.setupFocusDetection();
    this.setupVisibilityDetection();
    this.loadNotificationSettings();
    
    console.log('[NotificationManager] Inicializado');
  }

  setupMobileDetection() {
    // Detectar mudanças de viewport
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobileView;
      this.isMobileView = window.innerWidth <= 768;
      
      if (wasMobile !== this.isMobileView) {
        this.handleViewportChange();
      }
    });
  }

  setupFocusDetection() {
    // Detectar foco da janela
    window.addEventListener('focus', () => {
      this.isWindowFocused = true;
      this.handleWindowFocus();
    });

    window.addEventListener('blur', () => {
      this.isWindowFocused = false;
    });
  }

  setupVisibilityDetection() {
    // Detectar visibilidade da página
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      
      if (this.isPageVisible) {
        this.handlePageVisible();
      }
    });
  }

  loadNotificationSettings() {
    // Carregar configurações de notificação do localStorage
    try {
      const settings = localStorage.getItem('notificationSettings');
      if (settings) {
        this.notificationSettings = new Map(JSON.parse(settings));
      }
    } catch (error) {
      console.error('[NotificationManager] Erro ao carregar configurações:', error);
    }
  }

  saveNotificationSettings() {
    // Salvar configurações de notificação no localStorage
    try {
      const settings = Array.from(this.notificationSettings.entries());
      localStorage.setItem('notificationSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('[NotificationManager] Erro ao salvar configurações:', error);
    }
  }

  shouldNotify(chatId, message = null) {
    // Log inicial para debugging
    console.log('[NotificationManager] Verificando se deve notificar:', {
      chatId,
      currentChat: this.currentChat,
      isMobileView: this.isMobileView,
      windowFocused: document.hasFocus(),
      pageVisible: !document.hidden
    });
    
    // 1. Chat está mutado
    if (this.mutedChats.has(chatId)) {
      console.log('[NotificationManager] ❌ Chat mutado:', chatId);
      return false;
    }

    // 2. Chat está sendo visualizado
    if (this.viewedChats.has(chatId)) {
      console.log('[NotificationManager] ❌ Chat sendo visualizado:', chatId);
      return false;
    }

    // 3. Verificação específica para mobile - PRIORIDADE ALTA
    if (this.isMobileView && this.isMobileChatOpen(chatId)) {
      console.log('[NotificationManager] ❌ Chat mobile aberto e ativo:', chatId);
      // Marcar como visualizado automaticamente
      this.markChatAsViewed(chatId);
      return false;
    }

    // 4. Chat está ativo em desktop e janela em foco
    if (!this.isMobileView && this.isChatActive(chatId)) {
      console.log('[NotificationManager] ❌ Chat desktop ativo:', chatId);
      return false;
    }

    // 5. Verificação adicional de contexto
    if (this.currentChat === chatId && document.hasFocus() && !document.hidden) {
      console.log('[NotificationManager] ❌ Chat atual com foco:', chatId);
      return false;
    }

    // 6. Janela não está em foco (configurável)
    const settings = this.getChatSettings(chatId);
    if (!settings.notifyWhenFocused && this.isWindowFocused) {
      return false;
    }

    // 7. Página não está visível (configurável)
    if (!settings.notifyWhenHidden && !this.isPageVisible) {
      return false;
    }

    // 8. Verificar configurações específicas do chat
    if (settings.disabled) {
      return false;
    }

    console.log('[NotificationManager] ✅ Deve notificar:', chatId);
    return true;
  }

  isChatActive(chatId) {
    return this.currentChat === chatId && this.isWindowFocused && this.isPageVisible;
  }

  isMobileChatOpen(chatId) {
    // Verificação aprimorada para chat aberto no mobile
    if (!this.isMobileView) return false;
    
    const chatAreaSection = document.getElementById('chatAreaSection');
    const isVisible = chatAreaSection && chatAreaSection.classList.contains('show');
    const isCurrentChat = this.currentChat === chatId;
    const isWindowFocused = document.hasFocus();
    const isPageVisible = !document.hidden;
    
    // Log detalhado para debugging
    console.log('[NotificationManager] Mobile chat check:', {
      chatId,
      isVisible,
      isCurrentChat,
      isWindowFocused,
      isPageVisible,
      result: isVisible && isCurrentChat && isWindowFocused && isPageVisible
    });
    
    return isVisible && isCurrentChat && isWindowFocused && isPageVisible;
  }

  getChatSettings(chatId) {
    if (!this.notificationSettings.has(chatId)) {
      // Configurações padrão
      const defaultSettings = {
        disabled: false,
        notifyWhenFocused: true,
        notifyWhenHidden: true,
        continuousNotifications: false,
        customSound: null,
        volume: 1.0
      };
      
      this.notificationSettings.set(chatId, defaultSettings);
      this.saveNotificationSettings();
    }
    
    return this.notificationSettings.get(chatId);
  }

  setChatSettings(chatId, settings) {
    const currentSettings = this.getChatSettings(chatId);
    const newSettings = { ...currentSettings, ...settings };
    
    this.notificationSettings.set(chatId, newSettings);
    this.saveNotificationSettings();
    
    console.log('[NotificationManager] Configurações atualizadas para:', chatId, newSettings);
  }

  markChatAsViewed(chatId) {
    this.viewedChats.add(chatId);
    this.stopNotifications(chatId);
    
    console.log('[NotificationManager] Chat marcado como visualizado:', chatId);
  }

  setCurrentChat(chatId) {
    const previousChat = this.currentChat;
    this.currentChat = chatId;
    
    if (previousChat !== chatId) {
      // Marcar chat anterior como visualizado
      if (previousChat) {
        this.markChatAsViewed(previousChat);
      }
      
      // Se for mobile e a conversa estiver aberta, marcar como visualizada
      if (this.isMobileView && this.isMobileChatOpen(chatId)) {
        this.markChatAsViewed(chatId);
      }
    }
    
    console.log('[NotificationManager] Chat atual definido:', chatId);
  }

  onMobileChatOpened(chatId) {
    // Callback quando o chat é aberto no mobile
    if (!this.isMobileView) return;
    
    console.log('[NotificationManager] Chat aberto no mobile:', chatId);
    
    // Marcar imediatamente como visualizado
    this.markChatAsViewed(chatId);
    
    // Parar todas as notificações para este chat
    this.stopNotifications(chatId);
    
    // Aguardar um pouco e verificar novamente
    setTimeout(() => {
      if (this.isMobileChatOpen(chatId)) {
        this.markChatAsViewed(chatId);
        console.log('[NotificationManager] ✅ Confirmação: Chat mobile marcado como visualizado:', chatId);
      }
    }, 300);
  }

  handleViewportChange() {
    // Viewport mudou (desktop ↔ mobile)
    if (this.currentChat && this.isMobileView && this.isMobileChatOpen(this.currentChat)) {
      this.markChatAsViewed(this.currentChat);
    }
  }

  handleWindowFocus() {
    // Janela ganhou foco
    if (this.currentChat) {
      this.markChatAsViewed(this.currentChat);
    }
  }

  handlePageVisible() {
    // Página ficou visível
    if (this.currentChat) {
      this.markChatAsViewed(this.currentChat);
    }
  }

  playNotificationSound(chatId) {
    const settings = this.getChatSettings(chatId);
    
    // Verificar se deve tocar som
    if (settings.disabled) return;
    
    try {
      let audioSource = settings.customSound;
      
      // Se não há som personalizado, usar padrão
      if (!audioSource) {
        audioSource = '/sounds/notification.mp3'; // Som padrão
      }
      
      const audio = new Audio(audioSource);
      audio.volume = settings.volume;
      
      // Tocar som
      audio.play().catch(error => {
        console.warn('[NotificationManager] Erro ao tocar som:', error);
      });
      
    } catch (error) {
      console.error('[NotificationManager] Erro ao tocar notificação:', error);
    }
  }

  startContinuousNotifications(chatId) {
    const settings = this.getChatSettings(chatId);
    
    if (!settings.continuousNotifications) return;
    
    // Parar notificação contínua anterior se existir
    this.stopContinuousNotifications(chatId);
    
    // Iniciar loop de notificações
    const playLoop = () => {
      if (!this.shouldNotify(chatId)) {
        this.stopContinuousNotifications(chatId);
        return;
      }
      
      this.playNotificationSound(chatId);
      
      // Agendar próxima notificação
      const timer = setTimeout(playLoop, 2000); // Repetir a cada 2s
      this.activeNotifications.set(chatId, timer);
    };
    
    // Iniciar loop
    playLoop();
  }

  stopNotifications(chatId) {
    this.stopContinuousNotifications(chatId);
    this.viewedChats.add(chatId);
  }

  stopContinuousNotifications(chatId) {
    const timer = this.activeNotifications.get(chatId);
    if (timer) {
      clearTimeout(timer);
      this.activeNotifications.delete(chatId);
    }
  }

  muteChat(chatId) {
    this.mutedChats.add(chatId);
    this.stopNotifications(chatId);
    
    console.log('[NotificationManager] Chat mutado:', chatId);
  }

  unmuteChat(chatId) {
    this.mutedChats.delete(chatId);
    
    console.log('[NotificationManager] Chat desmutado:', chatId);
  }

  isChatMuted(chatId) {
    return this.mutedChats.has(chatId);
  }

  clearViewedChats() {
    this.viewedChats.clear();
  }

  getNotificationStatus(chatId) {
    return {
      shouldNotify: this.shouldNotify(chatId),
      isViewed: this.viewedChats.has(chatId),
      isMuted: this.mutedChats.has(chatId),
      isActive: this.isChatActive(chatId),
      isMobileOpen: this.isMobileChatOpen(chatId),
      settings: this.getChatSettings(chatId)
    };
  }

  destroy() {
    // Parar todas as notificações ativas
    for (const [chatId, timer] of this.activeNotifications) {
      clearTimeout(timer);
    }
    
    this.activeNotifications.clear();
    this.viewedChats.clear();
    this.mutedChats.clear();
    this.notificationSettings.clear();
    
    console.log('[NotificationManager] Destruído');
  }
}

// Exportar para uso global
window.NotificationManager = NotificationManager;
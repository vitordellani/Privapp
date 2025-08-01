/**
 * MessageViewTracker - Sistema de Rastreamento de Visualização de Mensagens
 * Corrige o bug de notificações persistentes no modo mobile
 */

class MessageViewTracker {
  constructor() {
    this.viewedMessages = new Set();
    this.currentChat = null;
    this.isMobileView = window.innerWidth <= 768;
    this.visibilityObserver = null;
    this.focusObserver = null;
    this.lastViewTime = new Map();
    this.viewThreshold = 2000; // 2 segundos para considerar como visualizado
    
    this.setupVisibilityDetection();
    this.setupFocusDetection();
    this.setupMobileDetection();
    
    console.log('[MessageViewTracker] Inicializado');
  }

  setupVisibilityDetection() {
    // Detectar quando a conversa está visível
    this.visibilityObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && this.currentChat) {
          this.onChatVisible(this.currentChat);
        }
      });
    }, {
      threshold: 0.5, // 50% da área visível
      rootMargin: '0px'
    });

    // Observar área de mensagens
    this.observeMessagesContainer();
  }

  setupFocusDetection() {
    // Detectar quando a janela ganha foco
    window.addEventListener('focus', () => {
      if (this.currentChat) {
        this.onWindowFocus(this.currentChat);
      }
    });

    // Detectar mudanças de visibilidade da página
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentChat) {
        this.onPageVisible(this.currentChat);
      }
    });
  }

  setupMobileDetection() {
    // Detectar mudanças de viewport
    window.addEventListener('resize', () => {
      const wasMobile = this.isMobileView;
      this.isMobileView = window.innerWidth <= 768;
      
      if (wasMobile !== this.isMobileView) {
        this.onViewportChange();
      }
    });
  }

  observeMessagesContainer() {
    const messagesContainer = document.querySelector('.messages-container');
    if (messagesContainer) {
      this.visibilityObserver.observe(messagesContainer);
    } else {
      // Tentar novamente após um delay se o container não existir
      setTimeout(() => this.observeMessagesContainer(), 1000);
    }
  }

  setCurrentChat(chatId) {
    const previousChat = this.currentChat;
    this.currentChat = chatId;
    
    if (previousChat !== chatId) {
      // Marcar chat anterior como visualizado
      if (previousChat) {
        this.markChatAsViewed(previousChat);
      }
      
      // Iniciar rastreamento do novo chat
      if (chatId) {
        this.startTrackingChat(chatId);
      }
    }
    
    console.log('[MessageViewTracker] Chat atual:', chatId);
  }

  startTrackingChat(chatId) {
    // Marcar tempo de início da visualização
    this.lastViewTime.set(chatId, Date.now());
    
    // Se for mobile e a conversa estiver aberta, marcar como visualizada
    if (this.isMobileView && this.isChatOpen(chatId)) {
      this.markChatAsViewed(chatId);
    }
  }

  onChatVisible(chatId) {
    // Chat está visível na tela
    this.lastViewTime.set(chatId, Date.now());
    
    // Se for mobile, marcar como visualizado imediatamente
    if (this.isMobileView) {
      this.markChatAsViewed(chatId);
    }
  }

  onWindowFocus(chatId) {
    // Janela ganhou foco
    if (this.currentChat === chatId) {
      this.markChatAsViewed(chatId);
    }
  }

  onPageVisible(chatId) {
    // Página ficou visível
    if (this.currentChat === chatId) {
      this.markChatAsViewed(chatId);
    }
  }

  onViewportChange() {
    // Viewport mudou (desktop ↔ mobile)
    if (this.currentChat) {
      if (this.isMobileView && this.isChatOpen(this.currentChat)) {
        this.markChatAsViewed(this.currentChat);
      }
    }
  }

  isChatOpen(chatId) {
    // Verificação aprimorada para chat aberto
    if (!this.isMobileView) {
      // No desktop, considera aberto se é o chat atual
      return this.currentChat === chatId;
    }
    
    // No mobile, verificação mais rigorosa
    const chatAreaSection = document.getElementById('chatAreaSection');
    const isVisible = chatAreaSection && chatAreaSection.classList.contains('show');
    const isCurrentChat = this.currentChat === chatId;
    const isWindowFocused = document.hasFocus();
    const isPageVisible = !document.hidden;
    
    const result = isVisible && isCurrentChat && isWindowFocused && isPageVisible;
    
    console.log('[MessageViewTracker] Chat open check:', {
      chatId,
      isMobileView: this.isMobileView,
      isVisible,
      isCurrentChat,
      isWindowFocused,
      isPageVisible,
      result
    });
    
    return result;
  }

  markChatAsViewed(chatId, force = false) {
    if (!chatId) return;
    
    const now = Date.now();
    const lastView = this.lastViewTime.get(chatId) || 0;
    
    // Verificar se passou tempo suficiente desde a última visualização (exceto se forçado)
    if (!force && now - lastView < this.viewThreshold) {
      console.log('[MessageViewTracker] Visualização muito recente, ignorando:', chatId);
      return;
    }
    
    // Verificar se realmente deve marcar como visualizado
    if (!this.isChatOpen(chatId) && !force) {
      console.log('[MessageViewTracker] Chat não está aberto, não marcando como visualizado:', chatId);
      return;
    }
    
    console.log('[MessageViewTracker] ✅ Marcando chat como visualizado:', {
      chatId,
      force,
      isMobile: this.isMobileView,
      chatOpen: this.isChatOpen(chatId)
    });
    
    // Marcar mensagens como lidas
    this.markMessagesAsRead(chatId);
    
    // Parar notificações
    this.stopNotifications(chatId);
    
    // Atualizar badges
    this.updateBadges(chatId);
    
    // Atualizar tempo de visualização
    this.lastViewTime.set(chatId, now);
    
    // Mostrar feedback visual no mobile
    if (this.isMobileView) {
      this.showMobileViewFeedback(chatId);
    }
  }

  markMessagesAsRead(chatId) {
    // Emitir evento para marcar mensagens como lidas
    const event = new CustomEvent('markMessagesAsRead', {
      detail: { chatId }
    });
    document.dispatchEvent(event);
  }

  stopNotifications(chatId) {
    // Emitir evento para parar notificações
    const event = new CustomEvent('stopNotifications', {
      detail: { chatId }
    });
    document.dispatchEvent(event);
  }

  updateBadges(chatId) {
    // Emitir evento para atualizar badges
    const event = new CustomEvent('updateBadges', {
      detail: { chatId, count: 0 }
    });
    document.dispatchEvent(event);
    
    // Mostrar indicador de visualização no mobile
    this.showViewIndicator(chatId);
  }

  showMobileViewFeedback(chatId) {
    // Mostrar feedback visual de visualização no mobile
    if (!this.isMobileView) return;
    
    // Remove indicador anterior se existir
    const existingIndicator = document.querySelector('.mobile-view-indicator');
    if (existingIndicator) {
      existingIndicator.remove();
    }
    
    const indicator = document.createElement('div');
    indicator.className = 'mobile-view-indicator';
    indicator.innerHTML = `
      <div class="indicator-content">
        <svg class="indicator-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Mensagens visualizadas</span>
      </div>
    `;
    
    document.body.appendChild(indicator);
    
    // Animar entrada
    requestAnimationFrame(() => {
      indicator.classList.add('show');
    });
    
    // Remover após 2 segundos
    setTimeout(() => {
      indicator.classList.remove('show');
      setTimeout(() => {
        if (indicator.parentElement) {
          indicator.remove();
        }
      }, 300);
    }, 2000);
    
    console.log('[MessageViewTracker] Feedback visual mostrado para:', chatId);
  }

  onMobileChatOpened(chatId) {
    // Callback quando o chat é aberto no mobile
    if (!this.isMobileView) return;
    
    console.log('[MessageViewTracker] Chat aberto no mobile:', chatId);
    
    // Aguardar um pouco para garantir que a UI foi atualizada
    setTimeout(() => {
      this.markChatAsViewed(chatId, true);
    }, 200);
  }

  getChatName(chatId) {
    // Buscar nome do chat nas mensagens
    const messages = window.todasMensagens || [];
    const chatMessage = messages.find(m => m.from === chatId || m.to === chatId);
    
    if (chatMessage) {
      if (chatId.endsWith('@g.us')) {
        return chatMessage.groupName || 'Grupo';
      } else {
        return chatMessage.senderName || chatId;
      }
    }
    
    return chatId;
  }

  isMessageViewed(messageId) {
    return this.viewedMessages.has(messageId);
  }

  markMessageAsViewed(messageId) {
    this.viewedMessages.add(messageId);
  }

  destroy() {
    if (this.visibilityObserver) {
      this.visibilityObserver.disconnect();
    }
    
    this.viewedMessages.clear();
    this.lastViewTime.clear();
    
    console.log('[MessageViewTracker] Destruído');
  }
}

// Exportar para uso global
window.MessageViewTracker = MessageViewTracker;
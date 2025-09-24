/**
 * BadgeManager - gerenciamento otimizado de badges com cache de elementos.
 */
class BadgeManager {
  constructor() {
    this.chatElementsCache = new Map();
    this.badgeElementsCache = new Map();
    this.mutationObserver = null;
    this.setupMutationObserver();
    console.log('[BadgeManager] Initialized');
  }

  setupMutationObserver() {
    this.mutationObserver = new MutationObserver((mutations) => {
      const shouldClear = mutations.some((mutation) => mutation.type === 'childList');
      if (shouldClear) {
        this.clearCache();
      }
    });

    const chatList = document.querySelector('.chat-list');
    if (chatList) {
      this.mutationObserver.observe(chatList, { childList: true, subtree: true });
    } else {
      setTimeout(() => this.setupMutationObserver(), 1000);
    }
  }

  getChatElement(chatId) {
    if (this.chatElementsCache.has(chatId)) {
      const cached = this.chatElementsCache.get(chatId);
      if (cached && document.contains(cached)) {
        return cached;
      }
      this.chatElementsCache.delete(chatId);
    }

    let element = document.querySelector(`[data-chat-id="${chatId}"]`);
    if (!element) {
      const chatItems = document.querySelectorAll('.chat-item');
      for (const item of chatItems) {
        const nameElement = item.querySelector('.chat-name-text');
        if (!nameElement) {
          continue;
        }
        const displayedName = nameElement.textContent.trim();
        const contactName = typeof getNomeContato === 'function' ? getNomeContato(chatId, chatId) : chatId;
        if (displayedName === contactName || displayedName.includes(chatId)) {
          element = item;
          break;
        }
      }
    }

    if (element) {
      this.chatElementsCache.set(chatId, element);
    }

    return element;
  }

  getBadgeElement(chatElement) {
    if (!chatElement) {
      return null;
    }
    const badge = chatElement.querySelector('.unread-badge');
    return badge || null;
  }

  updateBadge(chatId, count) {
    const chatElement = this.getChatElement(chatId);
    if (!chatElement) {
      return;
    }

    const chatNameContainer = chatElement.querySelector('.chat-name');
    if (!chatNameContainer) {
      return;
    }

    let badge = this.badgeElementsCache.get(chatId) || this.getBadgeElement(chatElement);
    if (badge && !document.contains(badge)) {
      badge = null;
      this.badgeElementsCache.delete(chatId);
    }

    const previousCount = badge ? parseInt(badge.dataset.count || badge.textContent || '0', 10) || 0 : 0;

    if (count > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'unread-badge';
        chatNameContainer.appendChild(badge);
        this.badgeElementsCache.set(chatId, badge);
      }

      badge.textContent = count > 99 ? '99+' : String(count);
      badge.dataset.count = String(count);
      badge.classList.remove('hidden', 'fade-out', 'reading', 'slide-out', 'bounce-in', 'glow', 'count-up', 'pulse');

      badge.classList.add('bounce-in');
      setTimeout(() => badge.classList.remove('bounce-in'), 600);

      if (count > previousCount) {
        badge.classList.add('count-up');
        setTimeout(() => badge.classList.remove('count-up'), 300);
      }

      if (count > 5) {
        badge.classList.add('glow');
      } else {
        badge.classList.remove('glow');
      }
    } else if (badge) {
      this.animateRemoval(badge, chatId);
    }
  }

  animateRemoval(badge, chatId) {
    badge.classList.remove('bounce-in', 'glow', 'count-up', 'pulse');
    badge.classList.add('reading');

    setTimeout(() => {
      badge.classList.remove('reading');
      badge.classList.add('slide-out');

      setTimeout(() => {
        badge.classList.add('hidden');
        badge.classList.remove('slide-out');
        badge.removeAttribute('data-count');
        setTimeout(() => {
          if (badge.parentNode) {
            badge.parentNode.removeChild(badge);
          }
          this.badgeElementsCache.delete(chatId);
        }, 100);
      }, 400);
    }, 300);
  }

  getBadgeCount(chatId) {
    const badge = this.badgeElementsCache.get(chatId);
    if (badge && document.contains(badge) && !badge.classList.contains('hidden')) {
      return parseInt(badge.dataset.count || badge.textContent || '0', 10) || 0;
    }

    const chatElement = this.getChatElement(chatId);
    if (!chatElement) {
      return 0;
    }

    const liveBadge = this.getBadgeElement(chatElement);
    if (!liveBadge || liveBadge.classList.contains('hidden')) {
      return 0;
    }

    return parseInt(liveBadge.dataset.count || liveBadge.textContent || '0', 10) || 0;
  }

  clearCache() {
    this.chatElementsCache.clear();
    this.badgeElementsCache.clear();
  }

  getStats() {
    return {
      cachedChats: this.chatElementsCache.size,
      cachedBadges: this.badgeElementsCache.size,
      totalCacheSize: this.chatElementsCache.size + this.badgeElementsCache.size
    };
  }

  destroy() {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    this.clearCache();
    console.log('[BadgeManager] Destroyed');
  }
}

window.BadgeManager = BadgeManager;
console.log('[BadgeManager] Ready');

/**
 * Sistema de Pré-carregamento Inteligente de Mídia
 * Carrega mídia antecipadamente baseado na visibilidade e proximidade
 * Otimizado para conexões de alta latência Brasil-Finlândia
 */
class IntelligentPreloader {
  constructor(options = {}) {
    this.options = {
      rootMargin: options.rootMargin || '200px', // Distância para começar pré-carregamento
      threshold: options.threshold || 0.1, // 10% do elemento visível
      maxConcurrentPreloads: options.maxConcurrentPreloads || 3,
      preloadDelay: options.preloadDelay || 100, // Delay antes de iniciar pré-carregamento
      enableLazyLoading: options.enableLazyLoading !== false, // Lazy loading habilitado por padrão
      ...options
    };
    
    this.preloadQueue = [];
    this.activePreloads = 0;
    this.preloadedUrls = new Set();
    this.observer = null;
    this.lazyObserver = null;
    this.requestManager = null;
    
    this.init();
    
    console.log('[PRELOADER] Sistema de pré-carregamento inteligente inicializado');
  }

  /**
   * Inicializar sistema
   */
  init() {
    // Verificar suporte ao Intersection Observer
    if (!('IntersectionObserver' in window)) {
      console.warn('[PRELOADER] IntersectionObserver não suportado, desabilitando pré-carregamento');
      return;
    }

    // Configurar observer para pré-carregamento
    this.observer = new IntersectionObserver(
      this.handleIntersection.bind(this),
      {
        rootMargin: this.options.rootMargin,
        threshold: this.options.threshold
      }
    );

    // Configurar observer para lazy loading
    if (this.options.enableLazyLoading) {
      this.lazyObserver = new IntersectionObserver(
        this.handleLazyLoading.bind(this),
        {
          rootMargin: '50px',
          threshold: 0.1
        }
      );
    }

    // Tentar usar o ParallelRequestManager se disponível
    if (typeof window.parallelRequestManager !== 'undefined') {
      this.requestManager = window.parallelRequestManager;
    }

    // Observar elementos existentes
    this.observeExistingElements();

    // Observar novos elementos adicionados dinamicamente
    this.setupMutationObserver();
  }

  /**
   * Observar elementos existentes na página
   */
  observeExistingElements() {
    // Observar imagens com data-src
    const lazyImages = document.querySelectorAll('img[data-src]:not([data-preloader-observed])');
    lazyImages.forEach(img => this.observeElement(img));

    // Observar áudios com data-src
    const lazyAudios = document.querySelectorAll('audio[data-src]:not([data-preloader-observed])');
    lazyAudios.forEach(audio => this.observeElement(audio));

    // Observar vídeos com data-src
    const lazyVideos = document.querySelectorAll('video[data-src]:not([data-preloader-observed])');
    lazyVideos.forEach(video => this.observeElement(video));

    console.log(`[PRELOADER] Observando ${lazyImages.length + lazyAudios.length + lazyVideos.length} elementos`);
  }

  /**
   * Observar um elemento específico
   */
  observeElement(element) {
    if (!element || element.dataset.preloaderObserved) return;

    // Marcar como observado
    element.dataset.preloaderObserved = 'true';

    // Adicionar aos observers
    if (this.observer) {
      this.observer.observe(element);
    }

    if (this.lazyObserver && element.dataset.src) {
      this.lazyObserver.observe(element);
    }
  }

  /**
   * Configurar MutationObserver para elementos dinâmicos
   */
  setupMutationObserver() {
    const mutationObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Observar o próprio elemento se for mídia
            if (this.isMediaElement(node) && node.dataset.src) {
              this.observeElement(node);
            }

            // Observar elementos filhos
            const mediaElements = node.querySelectorAll && node.querySelectorAll('img[data-src], audio[data-src], video[data-src]');
            if (mediaElements) {
              mediaElements.forEach(element => this.observeElement(element));
            }
          }
        });
      });
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Verificar se é elemento de mídia
   */
  isMediaElement(element) {
    return element.tagName && ['IMG', 'AUDIO', 'VIDEO'].includes(element.tagName.toUpperCase());
  }

  /**
   * Lidar com intersecções para pré-carregamento
   */
  handleIntersection(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const src = element.dataset.src;

        if (src && !this.preloadedUrls.has(src)) {
          // Adicionar à fila de pré-carregamento
          this.addToPreloadQueue({
            url: src,
            element: element,
            priority: this.getPreloadPriority(element),
            type: this.getMediaType(element)
          });
        }
      }
    });
  }

  /**
   * Lidar com lazy loading
   */
  handleLazyLoading(entries) {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        const src = element.dataset.src;

        if (src) {
          // Carregar imediatamente
          this.loadElementImmediate(element, src);
          
          // Parar de observar este elemento
          if (this.lazyObserver) {
            this.lazyObserver.unobserve(element);
          }
        }
      }
    });
  }

  /**
   * Carregar elemento imediatamente
   */
  async loadElementImmediate(element, src) {
    try {
      element.classList.add('loading');
      
      if (element.tagName === 'IMG') {
        // Para imagens, definir src diretamente
        element.src = src;
        
        element.onload = () => {
          element.classList.remove('loading');
          element.classList.add('loaded');
        };
        
        element.onerror = () => {
          element.classList.remove('loading');
          element.classList.add('error');
        };
      } else if (element.tagName === 'AUDIO' || element.tagName === 'VIDEO') {
        // Para áudio/vídeo, definir src
        element.src = src;
        element.load();
        
        element.addEventListener('loadeddata', () => {
          element.classList.remove('loading');
          element.classList.add('loaded');
        });
        
        element.addEventListener('error', () => {
          element.classList.remove('loading');
          element.classList.add('error');
        });
      }
      
      console.log(`[PRELOADER] 🚀 Carregamento imediato: ${src}`);
      
    } catch (error) {
      console.error('[PRELOADER] Erro no carregamento imediato:', error);
      element.classList.remove('loading');
      element.classList.add('error');
    }
  }

  /**
   * Obter prioridade de pré-carregamento
   */
  getPreloadPriority(element) {
    // Imagens têm prioridade alta
    if (element.tagName === 'IMG') return 'high';
    
    // Áudios têm prioridade média
    if (element.tagName === 'AUDIO') return 'medium';
    
    // Vídeos têm prioridade baixa (são maiores)
    if (element.tagName === 'VIDEO') return 'low';
    
    return 'normal';
  }

  /**
   * Obter tipo de mídia
   */
  getMediaType(element) {
    return element.tagName.toLowerCase();
  }

  /**
   * Adicionar à fila de pré-carregamento
   */
  addToPreloadQueue(item) {
    // Verificar se já está na fila
    const exists = this.preloadQueue.some(queued => queued.url === item.url);
    if (exists) return;

    this.preloadQueue.push(item);
    
    // Ordenar por prioridade
    this.preloadQueue.sort((a, b) => {
      const priorities = { high: 4, medium: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    // Processar fila
    setTimeout(() => {
      this.processPreloadQueue();
    }, this.options.preloadDelay);
  }

  /**
   * Processar fila de pré-carregamento
   */
  async processPreloadQueue() {
    if (this.activePreloads >= this.options.maxConcurrentPreloads || this.preloadQueue.length === 0) {
      return;
    }

    const item = this.preloadQueue.shift();
    if (!item || this.preloadedUrls.has(item.url)) {
      this.processPreloadQueue(); // Tentar próximo item
      return;
    }

    this.activePreloads++;
    this.preloadedUrls.add(item.url);

    try {
      await this.preloadMedia(item);
      console.log(`[PRELOADER] ✅ Pré-carregado: ${item.url}`);
    } catch (error) {
      console.debug(`[PRELOADER] ⚠️ Falha no pré-carregamento: ${item.url}`, error);
    } finally {
      this.activePreloads--;
      // Processar próximo item
      setTimeout(() => {
        this.processPreloadQueue();
      }, 50);
    }
  }

  /**
   * Pré-carregar mídia
   */
  async preloadMedia(item) {
    const { url, type, priority } = item;

    // Usar ParallelRequestManager se disponível
    if (this.requestManager) {
      return await this.requestManager.request(url, {
        priority: 'low', // Pré-carregamento sempre com prioridade baixa
        timeout: type === 'video' ? 20000 : 10000
      });
    }

    // Fallback para fetch simples
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        priority: 'low'
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      
      // Para imagens, criar object URL para cache
      if (type === 'img') {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      }
      
      return response;
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Pré-carregar URLs específicas
   */
  async preloadUrls(urls, priority = 'normal') {
    if (!Array.isArray(urls)) return;

    const items = urls.map(url => ({
      url,
      priority,
      type: this.guessMediaType(url)
    }));

    items.forEach(item => this.addToPreloadQueue(item));
  }

  /**
   * Adivinhar tipo de mídia pela URL
   */
  guessMediaType(url) {
    const extension = url.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(extension)) {
      return 'img';
    }
    
    if (['mp3', 'wav', 'ogg', 'm4a'].includes(extension)) {
      return 'audio';
    }
    
    if (['mp4', 'webm', 'avi', 'mov'].includes(extension)) {
      return 'video';
    }
    
    return 'unknown';
  }

  /**
   * Pausar pré-carregamento
   */
  pause() {
    this.paused = true;
    console.log('[PRELOADER] ⏸️ Pré-carregamento pausado');
  }

  /**
   * Retomar pré-carregamento
   */
  resume() {
    this.paused = false;
    console.log('[PRELOADER] ▶️ Pré-carregamento retomado');
    this.processPreloadQueue();
  }

  /**
   * Limpar cache de URLs pré-carregadas
   */
  clearCache() {
    this.preloadedUrls.clear();
    this.preloadQueue = [];
    console.log('[PRELOADER] 🗑️ Cache limpo');
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      preloadedCount: this.preloadedUrls.size,
      queueLength: this.preloadQueue.length,
      activePreloads: this.activePreloads,
      maxConcurrent: this.options.maxConcurrentPreloads,
      observedElements: document.querySelectorAll('[data-preloader-observed]').length
    };
  }

  /**
   * Destruir instância
   */
  destroy() {
    if (this.observer) {
      this.observer.disconnect();
    }
    
    if (this.lazyObserver) {
      this.lazyObserver.disconnect();
    }
    
    this.preloadQueue = [];
    this.preloadedUrls.clear();
    
    console.log('[PRELOADER] Sistema destruído');
  }
}

// Instância global
let intelligentPreloader = null;

// Inicializar automaticamente quando DOM estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    intelligentPreloader = new IntelligentPreloader();
  });
} else {
  intelligentPreloader = new IntelligentPreloader();
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.IntelligentPreloader = IntelligentPreloader;
  window.intelligentPreloader = intelligentPreloader;
}

// Exportar para Node.js se disponível
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { IntelligentPreloader, intelligentPreloader };
}
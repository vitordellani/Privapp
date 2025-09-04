/**
 * Sistema de Paralelização de Requisições
 * Gerencia carregamento simultâneo de mídia para otimizar performance
 * em conexões de alta latência Brasil-Finlândia
 */
class ParallelRequestManager {
  constructor(maxConcurrent = 6) {
    this.maxConcurrent = maxConcurrent;
    this.activeRequests = 0;
    this.queue = [];
    this.requestCache = new Map();
    this.retryAttempts = new Map();
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 segundo
    
    console.log(`[PARALLEL-REQUEST] Inicializado com ${maxConcurrent} requisições simultâneas`);
  }

  /**
   * Fazer uma requisição com gerenciamento de fila
   */
  async request(url, options = {}) {
    // Verificar cache primeiro
    const cacheKey = this.getCacheKey(url, options);
    if (this.requestCache.has(cacheKey)) {
      const cached = this.requestCache.get(cacheKey);
      if (Date.now() - cached.timestamp < 300000) { // 5 minutos de cache
        console.log(`[PARALLEL-REQUEST] 📋 Cache hit: ${url}`);
        return cached.data;
      }
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ 
        url, 
        options, 
        resolve, 
        reject, 
        cacheKey,
        timestamp: Date.now(),
        priority: options.priority || 'normal'
      });
      this.processQueue();
    });
  }

  /**
   * Processar fila de requisições
   */
  async processQueue() {
    if (this.activeRequests >= this.maxConcurrent || this.queue.length === 0) {
      return;
    }

    // Ordenar por prioridade (high > normal > low)
    this.queue.sort((a, b) => {
      const priorities = { high: 3, normal: 2, low: 1 };
      return priorities[b.priority] - priorities[a.priority];
    });

    const request = this.queue.shift();
    this.activeRequests++;

    try {
      const data = await this.executeRequest(request);
      
      // Salvar no cache
      this.requestCache.set(request.cacheKey, {
        data,
        timestamp: Date.now()
      });
      
      request.resolve(data);
      console.log(`[PARALLEL-REQUEST] ✅ Sucesso: ${request.url}`);
      
    } catch (error) {
      const retryCount = this.retryAttempts.get(request.cacheKey) || 0;
      
      if (retryCount < this.maxRetries) {
        // Tentar novamente
        this.retryAttempts.set(request.cacheKey, retryCount + 1);
        
        setTimeout(() => {
          this.queue.unshift(request); // Adicionar no início da fila
          this.processQueue();
        }, this.retryDelay * Math.pow(2, retryCount)); // Backoff exponencial
        
        console.log(`[PARALLEL-REQUEST] 🔄 Retry ${retryCount + 1}/${this.maxRetries}: ${request.url}`);
      } else {
        request.reject(error);
        console.error(`[PARALLEL-REQUEST] ❌ Falha após ${this.maxRetries} tentativas: ${request.url}`, error);
      }
    } finally {
      this.activeRequests--;
      this.processQueue(); // Processar próximo item
    }
  }

  /**
   * Executar requisição individual
   */
  async executeRequest(request) {
    const { url, options } = request;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), options.timeout || 30000);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Determinar tipo de resposta
      const contentType = response.headers.get('content-type');
      
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      } else if (contentType && contentType.startsWith('text/')) {
        return await response.text();
      } else {
        return await response.blob();
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Carregar múltiplas mídias em paralelo
   */
  async loadMediaBatch(mediaUrls, options = {}) {
    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      return [];
    }

    console.log(`[PARALLEL-REQUEST] 🚀 Carregando ${mediaUrls.length} mídias em paralelo`);
    
    const promises = mediaUrls.map(url => {
      const mediaOptions = {
        ...options,
        priority: options.priority || 'normal',
        timeout: options.timeout || 15000
      };
      
      return this.request(url, mediaOptions).catch(error => {
        console.warn(`[PARALLEL-REQUEST] ⚠️ Falha ao carregar mídia: ${url}`, error);
        return { error: error.message, url };
      });
    });

    const results = await Promise.allSettled(promises);
    
    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.length - successful;
    
    console.log(`[PARALLEL-REQUEST] 📊 Resultado: ${successful} sucessos, ${failed} falhas`);
    
    return results.map(result => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return { error: result.reason.message };
      }
    });
  }

  /**
   * Pré-carregar mídia com prioridade baixa
   */
  async preloadMedia(mediaUrls) {
    if (!Array.isArray(mediaUrls) || mediaUrls.length === 0) {
      return;
    }

    console.log(`[PARALLEL-REQUEST] 🔄 Pré-carregando ${mediaUrls.length} mídias`);
    
    // Pré-carregar com prioridade baixa para não interferir com requisições importantes
    const preloadPromises = mediaUrls.map(url => 
      this.request(url, { 
        priority: 'low',
        timeout: 10000 // Timeout menor para pré-carregamento
      }).catch(error => {
        // Ignorar erros de pré-carregamento
        console.debug(`[PARALLEL-REQUEST] Pré-carregamento falhou: ${url}`);
        return null;
      })
    );

    // Não aguardar conclusão - executar em background
    Promise.allSettled(preloadPromises).then(results => {
      const successful = results.filter(r => r.status === 'fulfilled' && r.value !== null).length;
      console.log(`[PARALLEL-REQUEST] 📋 Pré-carregamento concluído: ${successful}/${mediaUrls.length}`);
    });
  }

  /**
   * Carregar imagens com fallback para diferentes formatos
   */
  async loadImageWithFallback(baseUrl, formats = ['webp', 'jpg', 'png']) {
    for (const format of formats) {
      try {
        const url = `${baseUrl}.${format}`;
        const result = await this.request(url, { 
          priority: 'high',
          timeout: 8000
        });
        
        console.log(`[PARALLEL-REQUEST] 🖼️ Imagem carregada: ${format}`);
        return { data: result, format, url };
        
      } catch (error) {
        console.debug(`[PARALLEL-REQUEST] Formato ${format} não disponível para ${baseUrl}`);
        continue;
      }
    }
    
    throw new Error(`Nenhum formato de imagem disponível para ${baseUrl}`);
  }

  /**
   * Gerar chave de cache
   */
  getCacheKey(url, options) {
    const optionsStr = JSON.stringify({
      method: options.method || 'GET',
      headers: options.headers || {},
      body: options.body
    });
    return `${url}:${btoa(optionsStr)}`;
  }

  /**
   * Limpar cache expirado
   */
  clearExpiredCache() {
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > 300000) { // 5 minutos
        expiredKeys.push(key);
      }
    }
    
    expiredKeys.forEach(key => {
      this.requestCache.delete(key);
      this.retryAttempts.delete(key);
    });
    
    if (expiredKeys.length > 0) {
      console.log(`[PARALLEL-REQUEST] 🗑️ Cache limpo: ${expiredKeys.length} entradas removidas`);
    }
  }

  /**
   * Obter estatísticas do gerenciador
   */
  getStats() {
    return {
      activeRequests: this.activeRequests,
      queueLength: this.queue.length,
      cacheSize: this.requestCache.size,
      maxConcurrent: this.maxConcurrent,
      retryAttempts: this.retryAttempts.size
    };
  }

  /**
   * Configurar número máximo de requisições simultâneas
   */
  setMaxConcurrent(max) {
    this.maxConcurrent = Math.max(1, Math.min(max, 12)); // Entre 1 e 12
    console.log(`[PARALLEL-REQUEST] ⚙️ Máximo de requisições simultâneas: ${this.maxConcurrent}`);
  }

  /**
   * Pausar processamento da fila
   */
  pause() {
    this.paused = true;
    console.log('[PARALLEL-REQUEST] ⏸️ Processamento pausado');
  }

  /**
   * Retomar processamento da fila
   */
  resume() {
    this.paused = false;
    console.log('[PARALLEL-REQUEST] ▶️ Processamento retomado');
    this.processQueue();
  }

  /**
   * Limpar fila e cache
   */
  clear() {
    this.queue = [];
    this.requestCache.clear();
    this.retryAttempts.clear();
    console.log('[PARALLEL-REQUEST] 🗑️ Fila e cache limpos');
  }
}

// Instância global do gerenciador
const parallelRequestManager = new ParallelRequestManager();

// Limpeza automática de cache a cada 5 minutos
setInterval(() => {
  parallelRequestManager.clearExpiredCache();
}, 300000);

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ParallelRequestManager = ParallelRequestManager;
  window.parallelRequestManager = parallelRequestManager;
}

// Exportar para Node.js se disponível
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ParallelRequestManager, parallelRequestManager };
}
/**
 * TempMediaManager - Gerenciador de Downloads Temporários de Mídia
 * 
 * Sistema de cache temporário para downloads de mídia com:
 * - Cache inteligente na memória do navegador
 * - Downloads paralelos limitados
 * - Limpeza automática LRU (Least Recently Used)
 * - Verificação de integridade SHA-256
 * - Fallback automático para streaming
 * 
 * @version 1.0.0
 * @author Sistema Privapp
 */

class TempMediaManager {
  constructor(options = {}) {
    // Configurações
    this.maxConcurrentDownloads = options.maxConcurrentDownloads || 3;
    this.maxCacheSize = options.maxCacheSize || 100 * 1024 * 1024; // 100MB
    this.defaultTimeout = options.defaultTimeout || 30000; // 30 segundos
    this.cleanupThreshold = options.cleanupThreshold || 0.8; // 80% do limite
    
    // Armazenamento
    this.downloadCache = new Map(); // Downloads em progresso
    this.tempStorage = new Map();   // Cache temporário
    this.downloadQueue = [];        // Fila de downloads
    this.activeDownloads = 0;       // Contador de downloads ativos
    
    // Métricas
    this.stats = {
      totalDownloads: 0,
      successfulDownloads: 0,
      failedDownloads: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalBytesDownloaded: 0,
      averageDownloadTime: 0
    };
    
    // Event listeners para limpeza
    this.setupAutoCleanup();
    
    console.log('[TempMediaManager] Inicializado com configurações:', {
      maxConcurrentDownloads: this.maxConcurrentDownloads,
      maxCacheSize: this.formatFileSize(this.maxCacheSize),
      defaultTimeout: this.defaultTimeout
    });
  }
  
  /**
   * Download principal de mídia com cache
   * @param {string} mediaUrl - URL do arquivo de mídia
   * @param {Object} options - Opções de download
   * @returns {Promise<MediaData>} Dados da mídia baixada
   */
  async downloadMedia(mediaUrl, options = {}) {
    const startTime = performance.now();
    const cacheKey = this.generateCacheKey(mediaUrl);
    const timeout = options.timeout || this.defaultTimeout;
    
    try {
      // Verificar cache primeiro
      if (this.tempStorage.has(cacheKey)) {
        const cachedData = this.tempStorage.get(cacheKey);
        cachedData.lastAccessed = Date.now();
        this.stats.cacheHits++;
        
        console.log(`[TempMediaManager] Cache HIT: ${mediaUrl}`);
        return cachedData;
      }
      
      this.stats.cacheMisses++;
      
      // Verificar se download já está em progresso
      if (this.downloadCache.has(cacheKey)) {
        console.log(`[TempMediaManager] Download em progresso: ${mediaUrl}`);
        return await this.downloadCache.get(cacheKey);
      }
      
      // Iniciar novo download com timeout
      const downloadPromise = Promise.race([
        this.performDownload(mediaUrl, options),
        new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error(`DOWNLOAD_TIMEOUT: Download de ${mediaUrl} excedeu ${timeout}ms`));
          }, timeout);
        })
      ]);
      
      this.downloadCache.set(cacheKey, downloadPromise);
      
      const result = await downloadPromise;
      
      // Armazenar no cache
      this.tempStorage.set(cacheKey, result);
      this.downloadCache.delete(cacheKey);
      
      // Atualizar estatísticas
      const downloadTime = performance.now() - startTime;
      this.updateStats(true, result.size, downloadTime);
      
      // Verificar se precisa limpar cache
      if (this.getCurrentCacheSize() > this.maxCacheSize * this.cleanupThreshold) {
        this.cleanupBySize();
      }
      
      console.log(`[TempMediaManager] Download concluído: ${mediaUrl} (${this.formatFileSize(result.size)})`);
      return result;
      
    } catch (error) {
      this.downloadCache.delete(cacheKey);
      this.updateStats(false, 0, performance.now() - startTime);
      
      if (error.message.includes('DOWNLOAD_TIMEOUT')) {
        console.error(`[TempMediaManager] Timeout no download: ${mediaUrl} após ${timeout}ms`);
      } else {
        console.error(`[TempMediaManager] Erro no download: ${mediaUrl}`, error);
      }
      throw error;
    }
  }
  
  /**
   * Realiza o download efetivo do arquivo com progresso detalhado
   * @param {string} mediaUrl - URL da mídia
   * @param {Function} onProgress - Callback de progresso
   * @param {string} downloadId - ID do download para logs
   * @returns {Promise<Object>} Dados do download
   */
  async performDownloadWithProgress(mediaUrl, onProgress, downloadId) {
    console.log(`[TempMediaManager] [${downloadId}] 🌐 Iniciando fetch: ${mediaUrl}`);
    
    const response = await fetch(mediaUrl, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    console.log(`[TempMediaManager] [${downloadId}] 📡 Response recebido:`, {
      status: response.status,
      contentType: response.headers.get('content-type'),
      contentLength: response.headers.get('content-length'),
      timestamp: new Date().toISOString()
    });
    
    const contentLength = parseInt(response.headers.get('content-length') || '0');
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    let lastProgressTime = Date.now();
    
    // Ler dados com callback de progresso
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      chunks.push(value);
      receivedLength += value.length;
      
      // Callback de progresso (throttled para performance)
      const now = Date.now();
      if (onProgress && contentLength > 0 && (now - lastProgressTime > 100)) {
        const percent = Math.round((receivedLength / contentLength) * 100);
        onProgress(percent);
        lastProgressTime = now;
      }
    }
    
    // Progresso final
    if (onProgress) {
      onProgress(100);
    }
    
    console.log(`[TempMediaManager] [${downloadId}] 📦 Dados recebidos:`, {
      receivedLength: receivedLength,
      expectedLength: contentLength,
      chunksCount: chunks.length,
      timestamp: new Date().toISOString()
    });
    
    return { response, chunks, receivedLength };
  }

  /**
   * Executa o download efetivo do arquivo
   * @param {string} mediaUrl - URL do arquivo
   * @param {Object} options - Opções de download
   * @returns {Promise<MediaData>} Dados da mídia
   */
  async performDownload(mediaUrl, options = {}) {
    const {
      priority = 'high',
      timeout = this.defaultTimeout,
      retries = 1,
      validateIntegrity = true,
      onProgress = null
    } = options;
    
    // Controle de downloads simultâneos
    if (this.activeDownloads >= this.maxConcurrentDownloads) {
      await this.waitForSlot();
    }
    
    this.activeDownloads++;
    
    try {
      // Obter metadados primeiro (se disponível)
      let expectedHash = null;
      try {
        const metadataResponse = await fetch(`/api/media/info/${this.extractFilename(mediaUrl)}`, {
          credentials: 'same-origin'
        });
        
        if (metadataResponse.ok) {
          const metadata = await metadataResponse.json();
          expectedHash = metadata.hash;
        }
      } catch (e) {
        console.warn('[TempMediaManager] Não foi possível obter metadados:', e.message);
      }
      
      // Configurar controle de timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        // Fazer o download
        const response = await fetch(mediaUrl, {
          signal: controller.signal,
          priority: priority,
          credentials: 'same-origin'
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        // Ler o blob com progresso
        const contentLength = parseInt(response.headers.get('content-length'), 10);
        const blob = await this.readResponseWithProgress(response, contentLength, onProgress);
        
        // Verificar integridade se solicitado
        if (validateIntegrity && expectedHash) {
          const isValid = await this.validateIntegrity(blob, expectedHash);
          if (!isValid) {
            throw new Error('Falha na verificação de integridade do arquivo');
          }
        }
        
        // Criar Object URL
        const objectUrl = URL.createObjectURL(blob);
        
        const mediaData = {
          url: objectUrl,
          blob: blob,
          size: blob.size,
          type: blob.type,
          downloadedAt: Date.now(),
          lastAccessed: Date.now(),
          hash: expectedHash,
          originalUrl: mediaUrl
        };
        
        return mediaData;
        
      } finally {
        clearTimeout(timeoutId);
      }
      
    } finally {
      this.activeDownloads--;
      this.processQueue();
    }
  }
  
  /**
   * Lê resposta com callback de progresso
   * @param {Response} response - Resposta do fetch
   * @param {number} contentLength - Tamanho do conteúdo
   * @param {Function} onProgress - Callback de progresso
   * @returns {Promise<Blob>} Blob do arquivo
   */
  async readResponseWithProgress(response, contentLength, onProgress) {
    if (!response.body || !onProgress) {
      return await response.blob();
    }
    
    const reader = response.body.getReader();
    const chunks = [];
    let receivedLength = 0;
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        chunks.push(value);
        receivedLength += value.length;
        
        if (contentLength && onProgress) {
          const progress = (receivedLength / contentLength) * 100;
          onProgress(Math.min(progress, 100));
        }
      }
      
      // Combinar chunks em um único array
      const allChunks = new Uint8Array(receivedLength);
      let position = 0;
      
      for (const chunk of chunks) {
        allChunks.set(chunk, position);
        position += chunk.length;
      }
      
      return new Blob([allChunks], { type: response.headers.get('content-type') });
      
    } finally {
      reader.releaseLock();
    }
  }
  
  /**
   * Valida integridade do arquivo usando hash
   * @param {Blob} blob - Arquivo para validar
   * @param {string} expectedHash - Hash esperado
   * @returns {Promise<boolean>} True se válido
   */
  async validateIntegrity(blob, expectedHash) {
    try {
      const arrayBuffer = await blob.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const actualHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return actualHash === expectedHash;
    } catch (error) {
      console.error('[TempMediaManager] Erro na validação de integridade:', error);
      return false;
    }
  }
  
  /**
   * Aguarda slot disponível para download
   * @returns {Promise<void>}
   */
  async waitForSlot() {
    return new Promise((resolve) => {
      const checkSlot = () => {
        if (this.activeDownloads < this.maxConcurrentDownloads) {
          resolve();
        } else {
          setTimeout(checkSlot, 100);
        }
      };
      checkSlot();
    });
  }
  
  /**
   * Processa fila de downloads
   */
  processQueue() {
    // Implementação futura para fila de prioridades
    // Por enquanto, o controle é feito via waitForSlot
  }
  
  /**
   * Gera chave única para cache
   * @param {string} url - URL do arquivo
   * @returns {string} Chave do cache
   */
  generateCacheKey(url) {
    // Remove parâmetros de query e normaliza
    const cleanUrl = url.split('?')[0];
    return btoa(cleanUrl).replace(/[^a-zA-Z0-9]/g, '');
  }
  
  /**
   * Extrai nome do arquivo da URL
   * @param {string} url - URL completa
   * @returns {string} Nome do arquivo
   */
  extractFilename(url) {
    return url.split('/').pop().split('?')[0];
  }
  
  /**
   * Limpa cache baseado em tamanho usando algoritmo LRU
   */
  cleanupBySize() {
    console.log('[TempMediaManager] Iniciando limpeza de cache...');
    
    const entries = Array.from(this.tempStorage.entries());
    const currentSize = this.getCurrentCacheSize();
    const targetSize = this.maxCacheSize * 0.6; // Limpar até 60% do limite
    
    // Ordenar por último acesso (LRU) e depois por tamanho
    entries.sort((a, b) => {
      const aAccess = a[1].lastAccessed || 0;
      const bAccess = b[1].lastAccessed || 0;
      
      if (aAccess !== bAccess) {
        return aAccess - bAccess; // Mais antigo primeiro
      }
      
      return b[1].size - a[1].size; // Maior primeiro se mesmo tempo de acesso
    });
    
    let freedSize = 0;
    let removedCount = 0;
    
    for (const [key, data] of entries) {
      if (currentSize - freedSize <= targetSize) {
        break;
      }
      
      // Revogar Object URL para liberar memória
      if (data.url) {
        URL.revokeObjectURL(data.url);
      }
      
      freedSize += data.size;
      removedCount++;
      this.tempStorage.delete(key);
    }
    
    console.log(`[TempMediaManager] Cache limpo: ${removedCount} arquivos removidos, ${this.formatFileSize(freedSize)} liberados`);
  }
  
  /**
   * Limpa todo o cache temporário
   */
  clearAllTemp() {
    console.log('[TempMediaManager] Limpando todo o cache...');
    
    for (const [key, data] of this.tempStorage) {
      if (data.url) {
        URL.revokeObjectURL(data.url);
      }
    }
    
    this.tempStorage.clear();
    this.downloadCache.clear();
    
    console.log('[TempMediaManager] Cache completamente limpo');
  }
  
  /**
   * Configura limpeza automática
   */
  setupAutoCleanup() {
    // Limpeza ao sair da página
    window.addEventListener('beforeunload', () => {
      this.clearAllTemp();
    });
    
    // Limpeza periódica
    setInterval(() => {
      const currentSize = this.getCurrentCacheSize();
      if (currentSize > this.maxCacheSize * this.cleanupThreshold) {
        this.cleanupBySize();
      }
    }, 60000); // A cada minuto
    
    // Limpeza quando página fica invisível
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        // Limpar downloads antigos quando página não está visível
        setTimeout(() => {
          if (document.hidden) {
            this.cleanupOldEntries();
          }
        }, 30000); // 30 segundos
      }
    });
  }
  
  /**
   * Remove entradas antigas do cache
   */
  cleanupOldEntries() {
    const now = Date.now();
    const maxAge = 10 * 60 * 1000; // 10 minutos
    
    for (const [key, data] of this.tempStorage) {
      if (now - data.lastAccessed > maxAge) {
        if (data.url) {
          URL.revokeObjectURL(data.url);
        }
        this.tempStorage.delete(key);
      }
    }
  }
  
  /**
   * Calcula tamanho atual do cache
   * @returns {number} Tamanho em bytes
   */
  getCurrentCacheSize() {
    let totalSize = 0;
    for (const [key, data] of this.tempStorage) {
      totalSize += data.size || 0;
    }
    return totalSize;
  }
  
  /**
   * Atualiza estatísticas
   * @param {boolean} success - Se o download foi bem-sucedido
   * @param {number} bytes - Bytes baixados
   * @param {number} time - Tempo de download
   */
  updateStats(success, bytes, time) {
    this.stats.totalDownloads++;
    
    if (success) {
      this.stats.successfulDownloads++;
      this.stats.totalBytesDownloaded += bytes;
      
      // Calcular média de tempo de download
      const currentAvg = this.stats.averageDownloadTime;
      const count = this.stats.successfulDownloads;
      this.stats.averageDownloadTime = ((currentAvg * (count - 1)) + time) / count;
    } else {
      this.stats.failedDownloads++;
    }
  }
  
  /**
   * Obtém estatísticas do sistema
   * @returns {Object} Estatísticas
   */
  getStats() {
    const cacheSize = this.getCurrentCacheSize();
    const hitRate = this.stats.totalDownloads > 0 
      ? (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100 
      : 0;
    
    return {
      ...this.stats,
      cacheSize,
      cacheEntries: this.tempStorage.size,
      activeDownloads: this.activeDownloads,
      hitRate: Math.round(hitRate * 100) / 100,
      successRate: this.stats.totalDownloads > 0 
        ? Math.round((this.stats.successfulDownloads / this.stats.totalDownloads) * 100 * 100) / 100
        : 0
    };
  }
  
  /**
   * Formata tamanho de arquivo para exibição
   * @param {number} bytes - Tamanho em bytes
   * @returns {string} Tamanho formatado
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  /**
   * Verifica se um arquivo está em cache
   * @param {string} mediaUrl - URL do arquivo
   * @returns {boolean} True se estiver em cache
   */
  isInCache(mediaUrl) {
    const cacheKey = this.generateCacheKey(mediaUrl);
    return this.tempStorage.has(cacheKey);
  }
  
  /**
   * Remove arquivo específico do cache
   * @param {string} mediaUrl - URL do arquivo
   * @returns {boolean} True se removido
   */
  removeFromCache(mediaUrl) {
    const cacheKey = this.generateCacheKey(mediaUrl);
    const data = this.tempStorage.get(cacheKey);
    
    if (data) {
      if (data.url) {
        URL.revokeObjectURL(data.url);
      }
      this.tempStorage.delete(cacheKey);
      return true;
    }
    
    return false;
  }
  
  /**
   * Obtém informações de um arquivo em cache
   * @param {string} mediaUrl - URL do arquivo
   * @returns {Object|null} Informações do arquivo
   */
  getCacheInfo(mediaUrl) {
    const cacheKey = this.generateCacheKey(mediaUrl);
    const data = this.tempStorage.get(cacheKey);
    
    if (data) {
      return {
        size: data.size,
        type: data.type,
        downloadedAt: data.downloadedAt,
        lastAccessed: data.lastAccessed,
        age: Date.now() - data.downloadedAt
      };
    }
    
    return null;
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.TempMediaManager = TempMediaManager;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TempMediaManager;
}
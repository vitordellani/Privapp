/**
 * MediaBubble - Componente de Balão de Mídia com Download Temporário
 * 
 * Gerencia a interface e estados visuais dos balões de mídia:
 * - Estados de download (inicializando, baixando, pronto, erro)
 * - Progresso visual em tempo real
 * - Integração com TempMediaManager
 * - Fallback automático para streaming
 * - Tratamento robusto de erros
 * 
 * @version 1.0.0
 * @author Sistema Privapp
 */

class MediaBubble {
  constructor(messageData, tempMediaManager, options = {}) {
    this.messageData = messageData;
    this.mediaManager = tempMediaManager;
    this.options = {
      enableProgressTracking: true,
      enableFallback: true,
      maxRetries: 2,
      timeout: 30000,
      fallbackTimeout: 45000, // Timeout para forçar fallback
      ...options
    };
    
    // Estado do componente
    this.downloadProgress = 0;
    this.isDownloading = false;
    this.currentState = 'initializing';
    this.element = null;
    this.progressTracker = null;
    this.retryCount = 0;
    this.downloadStartTime = null;
    this.fallbackTimer = null;
    this.isDestroyed = false;
    
    // Callbacks
    this.onStateChange = options.onStateChange || null;
    this.onDownloadComplete = options.onDownloadComplete || null;
    this.onError = options.onError || null;
    
    // Logs detalhados para debugging
    this.debugId = `MB_${messageData.mediaFilename}_${Date.now()}`;
    console.log(`[${this.debugId}] 🎬 MediaBubble criado:`, {
      filename: messageData.mediaFilename,
      mimetype: messageData.mimetype,
      mediaType: this.getMediaType(messageData.mimetype),
      options: this.options,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Renderiza o balão de mídia
   * @returns {HTMLElement} Elemento DOM do balão
   */
  render() {
    console.log(`[${this.debugId}] 🎨 Iniciando renderização:`, {
      filename: this.messageData.mediaFilename,
      mimetype: this.messageData.mimetype,
      elementExists: !!this.element,
      timestamp: new Date().toISOString()
    });
    
    if (this.element) {
      console.log(`[${this.debugId}] ⚠️ Elemento já renderizado, retornando existente`);
      return this.element;
    }
    
    const { mediaFilename, mimetype } = this.messageData;
    
    if (!mediaFilename || !mimetype) {
      console.log(`[${this.debugId}] 📝 Renderizando apenas texto (sem mídia)`);
      return this.renderTextOnly();
    }
    
    const mediaType = this.getMediaType(mimetype);
    const mediaUrl = `/media/${mediaFilename}`;
    
    console.log(`[${this.debugId}] 🏗️ Criando elemento DOM:`, {
      mediaType: mediaType,
      mediaUrl: mediaUrl,
      filename: mediaFilename,
      enableProgressTracking: this.options.enableProgressTracking,
      timestamp: new Date().toISOString()
    });
    
    // Criar elemento principal
    this.element = document.createElement('div');
    this.element.className = `media-bubble ${mediaType}`;
    this.element.setAttribute('data-media-url', mediaUrl);
    this.element.setAttribute('data-media-type', mediaType);
    this.element.setAttribute('data-debug-id', this.debugId);
    
    // SEMPRE renderizar HTML inicial primeiro
    const initialHTML = this.getInitialHTML(mediaType);
    this.element.innerHTML = initialHTML;
    
    console.log(`[${this.debugId}] 📝 HTML inicial inserido:`, {
      htmlLength: initialHTML.length,
      hasProgressRing: initialHTML.includes('progress-ring'),
      hasDownloadInfo: initialHTML.includes('download-info'),
      hasMediaContainer: initialHTML.includes('media-container'),
      timestamp: new Date().toISOString()
    });
    
    this.setState('initializing');
    
    // Configurar timer de fallback forçado
    this.startFallbackTimer(mediaUrl, mediaType);
    
    // Verificar se já está em cache
    if (this.tempMediaManager && this.tempMediaManager.isInCache && this.tempMediaManager.isInCache(mediaUrl)) {
      console.log(`[${this.debugId}] 💾 Mídia encontrada em cache, carregando:`, mediaUrl);
      // Pequeno delay para garantir que o DOM foi atualizado
      setTimeout(() => {
        if (!this.isDestroyed) {
          this.loadFromCache(mediaUrl, mediaType);
        }
      }, 50);
    } else {
      console.log(`[${this.debugId}] 📥 Mídia não está em cache, iniciando download`);
      
      // Iniciar download após um pequeno delay para permitir renderização
      setTimeout(() => {
        if (!this.isDestroyed) {
          console.log(`[${this.debugId}] 🚀 Iniciando startDownload()`);
          this.startDownload(mediaUrl, mediaType);
        }
      }, 100);
    }
    
    return this.element;
  }
  
  /**
   * Renderiza balão apenas com texto (sem mídia)
   * @returns {HTMLElement} Elemento DOM
   */
  renderTextOnly() {
    const element = document.createElement('div');
    element.className = 'media-bubble text-only';
    element.innerHTML = `
      <div class="message-content">
        ${this.messageData.body || '[Mensagem sem conteúdo]'}
      </div>
    `;
    return element;
  }
  
  /**
   * Carrega mídia do cache
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  async loadFromCache(mediaUrl, mediaType) {
    console.log(`[${this.debugId}] 💾 Carregando do cache:`, {
      url: mediaUrl,
      mediaType: mediaType,
      timestamp: new Date().toISOString()
    });
    
    try {
      const cachedData = await this.mediaManager.downloadMedia(mediaUrl);
      console.log(`[${this.debugId}] ✅ Dados encontrados no cache, renderizando`);
      this.renderMediaElement(cachedData, mediaType);
      this.setState('ready');
      
      // Limpar timer de fallback pois carregamento foi bem-sucedido
      this.clearFallbackTimer();
    } catch (error) {
      console.error(`[${this.debugId}] ❌ Erro ao carregar do cache:`, {
        error: error.message,
        stack: error.stack,
        url: mediaUrl,
        mediaType: mediaType,
        timestamp: new Date().toISOString()
      });
      
      // Em caso de erro, ativar fallback
      console.log(`[${this.debugId}] 🆘 Ativando fallback devido ao erro no cache`);
      this.setState('error');
      this.activateFallback(mediaUrl, mediaType);
    }
  }
  
  /**
   * Gera HTML inicial do balão
   * @param {string} mediaType - Tipo de mídia
   * @returns {string} HTML inicial
   */
  getInitialHTML(mediaType) {
    const typeIcon = this.getTypeIcon(mediaType);
    const typeLabel = this.getTypeLabel(mediaType);
    
    return `
      <div class="media-container ${mediaType}">
        <div class="media-placeholder">
          <div class="download-progress">
            <div class="progress-circle">
              <svg class="progress-ring" width="60" height="60">
                <circle class="progress-ring-circle" cx="30" cy="30" r="25" 
                        stroke="#e9ecef" stroke-width="3" fill="none"></circle>
                <circle class="progress-ring-circle active" cx="30" cy="30" r="25" 
                        stroke="#25d366" stroke-width="3" fill="none"
                        stroke-dasharray="157" stroke-dashoffset="157"></circle>
              </svg>
              <span class="progress-text">0%</span>
            </div>
            <div class="download-info">
              <span class="media-type-icon">${typeIcon}</span>
              <span class="download-status">Preparando download...</span>
              <span class="download-details"></span>
            </div>
          </div>
        </div>
      </div>
    `;
  }
  
  /**
   * Inicia o download da mídia
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  async startDownload(mediaUrl, mediaType) {
    if (this.isDownloading) {
      console.log(`[${this.debugId}] ⚠️ Download já em progresso:`, {
        url: mediaUrl,
        currentState: this.currentState,
        progress: this.downloadProgress,
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    this.isDownloading = true;
    this.downloadStartTime = Date.now();
    this.setState('downloading');
    this.updateStatus('Iniciando download...');
    
    console.log(`[${this.debugId}] 📥 Iniciando download:`, {
      url: mediaUrl,
      mediaType: mediaType,
      filename: this.messageData.mediaFilename,
      mimetype: this.messageData.mimetype,
      timeout: 30000,
      maxRetries: this.options.maxRetries,
      currentRetry: this.retryCount,
      priority: 'high',
      validateIntegrity: true,
      timestamp: new Date().toISOString()
    });
    
    try {
      // Configurar callback de progresso
      const onProgress = (percent) => {
        console.log(`[${this.debugId}] 📊 Progresso: ${percent}%`, {
          filename: this.messageData.mediaFilename,
          elapsed: Date.now() - this.downloadStartTime + 'ms',
          timestamp: new Date().toISOString()
        });
        this.updateProgress(percent);
      };
      
      // Iniciar download com progresso
      const mediaData = await this.mediaManager.downloadMedia(mediaUrl, {
        priority: 'high',
        timeout: 30000,
        retries: this.options.maxRetries,
        validateIntegrity: true,
        onProgress: onProgress
      });
      
      // Download concluído
      this.downloadProgress = 100;
      this.updateProgress(100);
      this.setState('validating');
      this.updateStatus('Verificando arquivo...');
      
      console.log(`[${this.debugId}] ✅ Download 100% concluído, validando:`, {
        url: mediaUrl,
        dataSize: mediaData?.size || 'unknown',
        dataType: mediaData?.type,
        elapsed: Date.now() - this.downloadStartTime + 'ms',
        timestamp: new Date().toISOString()
      });
      
      // Pequeno delay para mostrar validação
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Renderizar elemento de mídia
      this.renderMediaElement(mediaData, mediaType);
      this.setState('ready');
      
      // Callback de sucesso
      if (this.onDownloadComplete) {
        try {
          this.onDownloadComplete(mediaData);
        } catch (error) {
          console.error(`[${this.debugId}] ❌ Erro no callback onDownloadComplete:`, error);
        }
      }
      
      const downloadTime = Date.now() - this.downloadStartTime;
      console.log(`[${this.debugId}] 🎉 Download finalizado com sucesso:`, {
         url: mediaUrl,
         totalTime: downloadTime + 'ms',
         finalState: this.currentState,
         mediaType: mediaType,
         timestamp: new Date().toISOString()
       });
       
       // Limpar timer de fallback pois download foi bem-sucedido
       this.clearFallbackTimer();
      
    } catch (error) {
      const downloadTime = Date.now() - this.downloadStartTime;
      console.error(`[${this.debugId}] ❌ Erro no download após ${downloadTime}ms:`, {
        error: error.message,
        stack: error.stack,
        url: mediaUrl,
        mediaType: mediaType,
        retryCount: this.retryCount,
        currentState: this.currentState,
        progress: this.downloadProgress,
        timestamp: new Date().toISOString()
      });
      this.handleDownloadError(error, mediaUrl, mediaType);
    } finally {
      this.isDownloading = false;
      console.log(`[${this.debugId}] 🔄 Download finalizado, isDownloading = false`, {
        finalState: this.currentState,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Renderiza o elemento de mídia após download
   * @param {Object} mediaData - Dados da mídia baixada
   * @param {string} mediaType - Tipo de mídia
   */
  renderMediaElement(mediaData, mediaType) {
    console.log(`[${this.debugId}] 🎨 Renderizando elemento de mídia:`, {
      mediaType: mediaType,
      elementExists: !!this.element,
      timestamp: new Date().toISOString()
    });
    
    // Validar se elemento principal existe
    if (!this.element) {
      console.error(`[${this.debugId}] ❌ Elemento principal não existe para renderizar mídia`);
      throw new Error('Elemento MediaBubble não existe');
    }
    
    const mediaContainer = this.element.querySelector('.media-container');
    
    // Validar se container de mídia existe
    if (!mediaContainer) {
      console.error(`[${this.debugId}] ❌ Container de mídia não encontrado:`, {
        elementHTML: this.element.outerHTML.substring(0, 200),
        elementChildren: Array.from(this.element.children).map(child => child.className),
        timestamp: new Date().toISOString()
      });
      throw new Error('Container de mídia (.media-container) não encontrado');
    }
    
    console.log(`[${this.debugId}] ✅ Container de mídia encontrado, gerando HTML`);
    
    let mediaHTML = '';
    
    switch (mediaType) {
      case 'audio':
        mediaHTML = `
          <audio controls class="media-element audio-player" preload="metadata">
            <source src="${mediaData.url}" type="${mediaData.type}">
            Seu navegador não suporta reprodução de áudio.
          </audio>
          <div class="media-info">
            <span class="file-size">${this.formatFileSize(mediaData.size)}</span>
            <span class="download-time">Baixado agora</span>
            <span class="media-quality">Qualidade original</span>
          </div>
        `;
        break;
        
      case 'video':
        mediaHTML = `
          <video controls class="media-element video-player" preload="metadata">
            <source src="${mediaData.url}" type="${mediaData.type}">
            Seu navegador não suporta reprodução de vídeo.
          </video>
          <div class="media-info">
            <span class="file-size">${this.formatFileSize(mediaData.size)}</span>
            <span class="download-time">Baixado agora</span>
          </div>
        `;
        break;
        
      case 'image':
        mediaHTML = `
          <img src="${mediaData.url}" class="media-element image-viewer" 
               onclick="abrirImgModal('${mediaData.url}')" 
               style="max-width:200px;max-height:200px;cursor:pointer;"
               loading="lazy" alt="Imagem">
          <div class="media-info">
            <span class="file-size">${this.formatFileSize(mediaData.size)}</span>
            <span class="image-dimensions" id="img-dims-${Date.now()}"></span>
          </div>
        `;
        
        // Obter dimensões da imagem após carregamento
        setTimeout(() => {
          const img = mediaContainer.querySelector('img');
          if (img) {
            img.onload = () => {
              const dimsElement = mediaContainer.querySelector('[id^="img-dims-"]');
              if (dimsElement) {
                dimsElement.textContent = `${img.naturalWidth}×${img.naturalHeight}`;
              }
            };
          }
        }, 100);
        break;
        
      default:
        mediaHTML = `
          <div class="media-element unknown-type">
            <span class="file-icon">📄</span>
            <span class="file-name">${this.messageData.mediaFilename}</span>
            <button class="download-btn" onclick="window.open('${mediaData.url}', '_blank')">
              Baixar arquivo
            </button>
          </div>
          <div class="media-info">
            <span class="file-size">${this.formatFileSize(mediaData.size)}</span>
          </div>
        `;
    }
    
    mediaContainer.innerHTML = mediaHTML;
    mediaContainer.classList.add('media-loaded');
    
    // Adicionar animação de entrada
    setTimeout(() => {
      mediaContainer.classList.add('fade-in');
    }, 50);
  }
  
  /**
   * Trata erros de download
   * @param {Error} error - Erro ocorrido
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  handleDownloadError(error, mediaUrl, mediaType) {
    this.setState('error');
    
    let errorMessage = 'Falha no download';
    let canRetry = true;
    let canFallback = this.options.enableFallback;
    
    // Analisar tipo de erro
    if (error.message.includes('timeout') || error.message.includes('AbortError')) {
      errorMessage = 'Tempo limite excedido';
    } else if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      errorMessage = 'Erro de conexão';
    } else if (error.message.includes('integrity') || error.message.includes('INTEGRITY_FAILED')) {
      errorMessage = 'Arquivo corrompido';
      canRetry = false; // Não retry para problemas de integridade
    } else if (error.message.includes('404')) {
      errorMessage = 'Arquivo não encontrado';
      canRetry = false;
      canFallback = false;
    } else if (error.message.includes('403')) {
      errorMessage = 'Acesso negado';
      canRetry = false;
    }
    
    console.error(`[MediaBubble] Erro de download (${errorMessage}):`, error);
    
    // Renderizar estado de erro
    this.renderErrorState(errorMessage, canRetry, canFallback, mediaUrl, mediaType);
    
    // Callback de erro
    if (this.onError) {
      this.onError(error, { canRetry, canFallback });
    }
  }
  
  /**
   * Renderiza estado de erro
   * @param {string} errorMessage - Mensagem de erro
   * @param {boolean} canRetry - Se pode tentar novamente
   * @param {boolean} canFallback - Se pode usar fallback
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  renderErrorState(errorMessage, canRetry, canFallback, mediaUrl, mediaType) {
    const mediaContainer = this.element.querySelector('.media-container');
    
    let buttonsHTML = '';
    
    if (canRetry && this.retryCount < this.options.maxRetries) {
      buttonsHTML += `
        <button class="retry-button" onclick="this.closest('.media-bubble').mediaBubble.retryDownload()">
          <span class="btn-icon">🔄</span>
          Tentar novamente
        </button>
      `;
    }
    
    if (canFallback) {
      buttonsHTML += `
        <button class="fallback-button" onclick="this.closest('.media-bubble').mediaBubble.activateFallback('${mediaUrl}', '${mediaType}')">
          <span class="btn-icon">📡</span>
          Usar streaming
        </button>
      `;
    }
    
    const errorHTML = `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <div class="error-message">${errorMessage}</div>
        <div class="error-actions">
          ${buttonsHTML}
        </div>
      </div>
    `;
    
    mediaContainer.innerHTML = errorHTML;
    mediaContainer.classList.add('error');
    
    // Adicionar referência para callbacks
    this.element.mediaBubble = this;
  }
  
  /**
   * Tenta novamente o download
   */
  retryDownload() {
    if (this.retryCount >= this.options.maxRetries) {
      console.log('[MediaBubble] Máximo de tentativas excedido');
      return;
    }
    
    this.retryCount++;
    console.log(`[MediaBubble] Tentativa ${this.retryCount} de ${this.options.maxRetries}`);
    
    // Resetar estado
    this.downloadProgress = 0;
    this.isDownloading = false;
    
    // Remover do cache se existir (pode estar corrompido)
    const mediaUrl = this.element.getAttribute('data-media-url');
    if (this.mediaManager) {
      this.mediaManager.removeFromCache(mediaUrl);
    }
    
    // Renderizar estado inicial e tentar novamente
    const mediaType = this.element.getAttribute('data-media-type');
    this.element.innerHTML = this.getInitialHTML(mediaType);
    this.element.querySelector('.media-container').classList.remove('error');
    
    setTimeout(() => {
      this.startDownload(mediaUrl, mediaType);
    }, 1000); // Delay de 1 segundo antes de tentar novamente
  }
  
  /**
   * Ativa fallback para streaming
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  activateFallback(mediaUrl, mediaType) {
    console.log(`[${this.debugId}] 🆘 Ativando fallback para streaming:`, {
      url: mediaUrl,
      mediaType: mediaType,
      elementExists: !!this.element,
      timestamp: new Date().toISOString()
    });
    
    this.setState('fallback');
    
    // Validar se elemento principal existe
    if (!this.element) {
      console.error(`[${this.debugId}] ❌ Elemento principal não existe para fallback`);
      return;
    }
    
    // Renderizar elemento de mídia usando streaming direto
    let mediaContainer = this.element.querySelector('.media-container');
    
    // Se container não existe, criar um
    if (!mediaContainer) {
      console.warn(`[${this.debugId}] ⚠️ Container não existe, criando novo para fallback`);
      this.element.innerHTML = this.getInitialHTML(mediaType);
      mediaContainer = this.element.querySelector('.media-container');
      
      if (!mediaContainer) {
        console.error(`[${this.debugId}] ❌ Falha ao criar container para fallback`);
        return;
      }
    }
    
    console.log(`[${this.debugId}] ✅ Container encontrado/criado, renderizando fallback`);
    
    let fallbackHTML = '';
    
    switch (mediaType) {
      case 'audio':
        fallbackHTML = `
          <audio controls class="media-element audio-player streaming" preload="none">
            <source src="${mediaUrl}" type="${this.messageData.mimetype}">
            Seu navegador não suporta reprodução de áudio.
          </audio>
          <div class="media-info streaming">
            <span class="streaming-indicator">📡 Streaming</span>
            <span class="fallback-note">Reprodução via streaming</span>
          </div>
        `;
        break;
        
      case 'video':
        fallbackHTML = `
          <video controls class="media-element video-player streaming" preload="none">
            <source src="${mediaUrl}" type="${this.messageData.mimetype}">
            Seu navegador não suporta reprodução de vídeo.
          </video>
          <div class="media-info streaming">
            <span class="streaming-indicator">📡 Streaming</span>
            <span class="fallback-note">Reprodução via streaming</span>
          </div>
        `;
        break;
        
      case 'image':
        fallbackHTML = `
          <img src="${mediaUrl}" class="media-element image-viewer streaming" 
               onclick="abrirImgModal('${mediaUrl}')" 
               style="max-width:200px;max-height:200px;cursor:pointer;"
               loading="lazy" alt="Imagem">
          <div class="media-info streaming">
            <span class="streaming-indicator">📡 Carregamento direto</span>
          </div>
        `;
        break;
        
      default:
        fallbackHTML = `
          <div class="media-element unknown-type streaming">
            <span class="file-icon">📄</span>
            <span class="file-name">${this.messageData.mediaFilename}</span>
            <button class="download-btn" onclick="window.open('${mediaUrl}', '_blank')">
              Abrir arquivo
            </button>
          </div>
          <div class="media-info streaming">
            <span class="streaming-indicator">📡 Acesso direto</span>
          </div>
        `;
    }
    
    mediaContainer.innerHTML = fallbackHTML;
    mediaContainer.classList.remove('error');
    mediaContainer.classList.add('streaming', 'media-loaded');
  }
  
  /**
   * Atualiza o progresso do download
   * @param {number} percent - Percentual de progresso (0-100)
   */
  updateProgress(percent) {
    this.downloadProgress = Math.min(Math.max(percent, 0), 100);
    
    const progressText = this.element.querySelector('.progress-text');
    const progressCircle = this.element.querySelector('.progress-ring-circle.active');
    const downloadDetails = this.element.querySelector('.download-details');
    
    if (progressText) {
      progressText.textContent = `${Math.round(this.downloadProgress)}%`;
    }
    
    if (progressCircle) {
      const circumference = 2 * Math.PI * 25; // raio = 25
      const offset = circumference - (this.downloadProgress / 100) * circumference;
      progressCircle.style.strokeDashoffset = offset;
    }
    
    // Atualizar detalhes se disponível
    if (downloadDetails && this.downloadStartTime) {
      const elapsed = Date.now() - this.downloadStartTime;
      const speed = this.downloadProgress > 0 ? (elapsed / this.downloadProgress) * (100 - this.downloadProgress) : 0;
      const eta = speed > 0 ? Math.round(speed / 1000) : 0;
      
      if (eta > 0 && this.downloadProgress < 95) {
        downloadDetails.textContent = `ETA: ${eta}s`;
      } else {
        downloadDetails.textContent = '';
      }
    }
  }
  
  /**
   * Atualiza o status do download
   * @param {string} status - Novo status
   */
  updateStatus(status) {
    const statusElement = this.element.querySelector('.download-status');
    if (statusElement) {
      statusElement.textContent = status;
    }
  }
  
  /**
   * Define o estado atual do componente
   * @param {string} newState - Novo estado
   */
  setState(newState) {
    const oldState = this.currentState;
    const stateChangeTime = Date.now();
    const timeSinceStart = this.downloadStartTime ? stateChangeTime - this.downloadStartTime : 0;
    
    this.currentState = newState;
    
    console.log(`[${this.debugId}] 🔄 Estado: ${oldState} → ${newState}`, {
      filename: this.messageData.mediaFilename,
      mimetype: this.messageData.mimetype,
      timeSinceStart: `${timeSinceStart}ms`,
      retryCount: this.retryCount,
      timestamp: new Date().toISOString(),
      elementExists: !!this.element,
      progressTrackerExists: !!this.progressTracker
    });
    
    // Atualizar classes CSS
    if (this.element) {
      this.element.classList.remove(`state-${oldState}`);
      this.element.classList.add(`state-${newState}`);
    }
    
    // Callback de mudança de estado
    if (this.onStateChange) {
      try {
        this.onStateChange(newState, oldState);
      } catch (error) {
        console.error(`[${this.debugId}] ❌ Erro no callback onStateChange:`, error);
      }
    }
  }
  
  /**
   * Obtém o tipo de mídia baseado no MIME type
   * @param {string} mimetype - Tipo MIME
   * @returns {string} Tipo de mídia
   */
  getMediaType(mimetype) {
    if (mimetype.startsWith('image/')) return 'image';
    if (mimetype.startsWith('audio/')) return 'audio';
    if (mimetype.startsWith('video/')) return 'video';
    return 'unknown';
  }
  
  /**
   * Obtém ícone para o tipo de mídia
   * @param {string} mediaType - Tipo de mídia
   * @returns {string} Ícone emoji
   */
  getTypeIcon(mediaType) {
    const icons = {
      'audio': '🎵',
      'video': '🎬',
      'image': '🖼️',
      'unknown': '📄'
    };
    return icons[mediaType] || icons.unknown;
  }
  
  /**
   * Obtém label para o tipo de mídia
   * @param {string} mediaType - Tipo de mídia
   * @returns {string} Label do tipo
   */
  getTypeLabel(mediaType) {
    const labels = {
      'audio': 'Áudio',
      'video': 'Vídeo',
      'image': 'Imagem',
      'unknown': 'Arquivo'
    };
    return labels[mediaType] || labels.unknown;
  }
  
  /**
   * Formata tamanho de arquivo
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
   * Obtém informações do estado atual
   * @returns {Object} Informações do estado
   */
  getStateInfo() {
    return {
      state: this.currentState,
      progress: this.downloadProgress,
      isDownloading: this.isDownloading,
      retryCount: this.retryCount,
      mediaType: this.element ? this.element.getAttribute('data-media-type') : null,
      mediaUrl: this.element ? this.element.getAttribute('data-media-url') : null
    };
  }
  
  /**
   * Inicia timer para fallback forçado
   * @param {string} mediaUrl - URL da mídia
   * @param {string} mediaType - Tipo de mídia
   */
  startFallbackTimer(mediaUrl, mediaType) {
    if (this.fallbackTimer) {
      clearTimeout(this.fallbackTimer);
    }
    
    console.log(`[${this.debugId}] ⏰ Timer de fallback iniciado: ${this.options.fallbackTimeout}ms`);
    
    this.fallbackTimer = setTimeout(() => {
      if (!this.isDestroyed && this.currentState !== 'ready' && this.currentState !== 'fallback') {
        console.warn(`[${this.debugId}] ⚠️ Timeout atingido, forçando fallback após ${this.options.fallbackTimeout}ms:`, {
          currentState: this.currentState,
          filename: this.messageData.mediaFilename,
          url: mediaUrl,
          timestamp: new Date().toISOString()
        });
        
        this.setState('error');
        this.activateFallback(mediaUrl, mediaType);
      }
    }, this.options.fallbackTimeout);
  }
  
  /**
   * Limpa timer de fallback
   */
  clearFallbackTimer() {
    if (this.fallbackTimer) {
      console.log(`[${this.debugId}] ⏰ Timer de fallback cancelado`);
      clearTimeout(this.fallbackTimer);
      this.fallbackTimer = null;
    }
  }

  /**
   * Destrói o componente e limpa recursos
   */
  destroy() {
    console.log(`[${this.debugId}] 💀 Destruindo componente: ${this.messageData.mediaFilename}`);
    
    this.isDestroyed = true;
    
    // Limpar timer de fallback
    this.clearFallbackTimer();
    
    if (this.element) {
      // Remover event listeners
      this.element.mediaBubble = null;
      
      // Revogar URLs de objeto se necessário
      const mediaElement = this.element.querySelector('.media-element');
      if (mediaElement) {
        const src = mediaElement.src || mediaElement.querySelector('source')?.src;
        if (src && src.startsWith('blob:')) {
          URL.revokeObjectURL(src);
        }
      }
    }
    
    console.log('[MediaBubble] Componente destruído');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.MediaBubble = MediaBubble;
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MediaBubble;
}
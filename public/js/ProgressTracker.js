/**
 * ProgressTracker - Controle de Progresso Visual Avançado
 * 
 * Gerencia o progresso visual de downloads com:
 * - Animações suaves e responsivas
 * - Cálculo de ETA (Estimated Time of Arrival)
 * - Velocidade de download em tempo real
 * - Estados visuais diferenciados
 * - Suporte a múltiplos tipos de indicadores
 * 
 * @version 1.0.0
 * @author Sistema Privapp
 */

class ProgressTracker {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      type: 'circle', // 'circle', 'bar', 'minimal'
      size: 60,
      strokeWidth: 3,
      showPercentage: true,
      showETA: true,
      showSpeed: true,
      animationDuration: 300,
      updateInterval: 200,
      smoothing: true,
      colors: {
        background: '#e9ecef',
        progress: '#25d366',
        text: '#333',
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107'
      },
      ...options
    };
    
    // Estado do progresso
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.startTime = null;
    this.lastUpdateTime = null;
    this.progressHistory = [];
    this.isAnimating = false;
    this.state = 'idle'; // 'idle', 'active', 'complete', 'error'
    
    // Elementos DOM
    this.elements = {};
    
    // Timers
    this.animationFrame = null;
    this.updateTimer = null;
    
    this.init();
  }
  
  /**
   * Inicializa o tracker de progresso
   */
  init() {
    this.createElements();
    this.setupEventListeners();
    console.log('[ProgressTracker] Inicializado:', this.options.type);
  }
  
  /**
   * Cria os elementos DOM necessários
   */
  createElements() {
    // Limpar container
    this.container.innerHTML = '';
    
    switch (this.options.type) {
      case 'circle':
        this.createCircularProgress();
        break;
      case 'bar':
        this.createBarProgress();
        break;
      case 'minimal':
        this.createMinimalProgress();
        break;
      default:
        this.createCircularProgress();
    }
    
    // Criar elementos de informação
    this.createInfoElements();
  }
  
  /**
   * Cria progresso circular
   */
  createCircularProgress() {
    const { size, strokeWidth, colors } = this.options;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    
    const svg = document.createElement('svg');
    svg.className = 'progress-ring';
    svg.setAttribute('width', size);
    svg.setAttribute('height', size);
    
    // Círculo de fundo
    const backgroundCircle = document.createElement('circle');
    backgroundCircle.className = 'progress-ring-background';
    backgroundCircle.setAttribute('cx', size / 2);
    backgroundCircle.setAttribute('cy', size / 2);
    backgroundCircle.setAttribute('r', radius);
    backgroundCircle.setAttribute('stroke', colors.background);
    backgroundCircle.setAttribute('stroke-width', strokeWidth);
    backgroundCircle.setAttribute('fill', 'none');
    
    // Círculo de progresso
    const progressCircle = document.createElement('circle');
    progressCircle.className = 'progress-ring-progress';
    progressCircle.setAttribute('cx', size / 2);
    progressCircle.setAttribute('cy', size / 2);
    progressCircle.setAttribute('r', radius);
    progressCircle.setAttribute('stroke', colors.progress);
    progressCircle.setAttribute('stroke-width', strokeWidth);
    progressCircle.setAttribute('stroke-linecap', 'round');
    progressCircle.setAttribute('fill', 'none');
    progressCircle.setAttribute('stroke-dasharray', circumference);
    progressCircle.setAttribute('stroke-dashoffset', circumference);
    progressCircle.style.transform = 'rotate(-90deg)';
    progressCircle.style.transformOrigin = '50% 50%';
    progressCircle.style.transition = `stroke-dashoffset ${this.options.animationDuration}ms ease-out`;
    
    svg.appendChild(backgroundCircle);
    svg.appendChild(progressCircle);
    
    // Container do progresso
    const progressContainer = document.createElement('div');
    progressContainer.className = 'progress-circle-container';
    progressContainer.appendChild(svg);
    
    // Texto de percentual
    if (this.options.showPercentage) {
      const percentText = document.createElement('div');
      percentText.className = 'progress-percentage';
      percentText.textContent = '0%';
      percentText.style.position = 'absolute';
      percentText.style.top = '50%';
      percentText.style.left = '50%';
      percentText.style.transform = 'translate(-50%, -50%)';
      percentText.style.fontSize = `${size * 0.2}px`;
      percentText.style.fontWeight = '600';
      percentText.style.color = colors.text;
      progressContainer.appendChild(percentText);
    }
    
    progressContainer.style.position = 'relative';
    progressContainer.style.display = 'inline-block';
    
    this.container.appendChild(progressContainer);
    
    // Armazenar referências
    this.elements.svg = svg;
    this.elements.progressCircle = progressCircle;
    this.elements.percentText = percentText;
    this.elements.circumference = circumference;
  }
  
  /**
   * Cria progresso em barra
   */
  createBarProgress() {
    const { colors } = this.options;
    
    const progressBar = document.createElement('div');
    progressBar.className = 'progress-bar-container';
    progressBar.style.width = '100%';
    progressBar.style.height = '8px';
    progressBar.style.backgroundColor = colors.background;
    progressBar.style.borderRadius = '4px';
    progressBar.style.overflow = 'hidden';
    progressBar.style.position = 'relative';
    
    const progressFill = document.createElement('div');
    progressFill.className = 'progress-bar-fill';
    progressFill.style.width = '0%';
    progressFill.style.height = '100%';
    progressFill.style.backgroundColor = colors.progress;
    progressFill.style.transition = `width ${this.options.animationDuration}ms ease-out`;
    progressFill.style.borderRadius = '4px';
    
    progressBar.appendChild(progressFill);
    this.container.appendChild(progressBar);
    
    // Armazenar referências
    this.elements.progressBar = progressBar;
    this.elements.progressFill = progressFill;
  }
  
  /**
   * Cria progresso minimal
   */
  createMinimalProgress() {
    const spinner = document.createElement('div');
    spinner.className = 'progress-spinner';
    spinner.innerHTML = '⏳';
    spinner.style.fontSize = '24px';
    spinner.style.animation = 'spin 1s linear infinite';
    
    this.container.appendChild(spinner);
    this.elements.spinner = spinner;
  }
  
  /**
   * Cria elementos de informação
   */
  createInfoElements() {
    const infoContainer = document.createElement('div');
    infoContainer.className = 'progress-info';
    infoContainer.style.marginTop = '8px';
    infoContainer.style.fontSize = '12px';
    infoContainer.style.color = this.options.colors.text;
    infoContainer.style.textAlign = 'center';
    
    // Status
    const statusElement = document.createElement('div');
    statusElement.className = 'progress-status';
    statusElement.textContent = 'Preparando...';
    statusElement.style.fontWeight = '500';
    infoContainer.appendChild(statusElement);
    
    // Detalhes (ETA, velocidade)
    if (this.options.showETA || this.options.showSpeed) {
      const detailsElement = document.createElement('div');
      detailsElement.className = 'progress-details';
      detailsElement.style.marginTop = '4px';
      detailsElement.style.opacity = '0.7';
      infoContainer.appendChild(detailsElement);
      this.elements.detailsElement = detailsElement;
    }
    
    this.container.appendChild(infoContainer);
    this.elements.statusElement = statusElement;
    this.elements.infoContainer = infoContainer;
  }
  
  /**
   * Configura event listeners
   */
  setupEventListeners() {
    // Listener para mudanças de visibilidade
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.isAnimating) {
        this.pauseAnimation();
      } else if (!document.hidden && this.state === 'active') {
        this.resumeAnimation();
      }
    });
  }
  
  /**
   * Inicia o tracking de progresso
   * @param {string} status - Status inicial
   */
  start(status = 'Iniciando...') {
    this.startTime = Date.now();
    this.lastUpdateTime = this.startTime;
    this.progressHistory = [];
    this.state = 'active';
    
    this.updateStatus(status);
    this.updateProgress(0);
    
    // Iniciar timer de atualização
    this.updateTimer = setInterval(() => {
      this.updateDetails();
    }, this.options.updateInterval);
    
    console.log('[ProgressTracker] Iniciado');
  }
  
  /**
   * Atualiza o progresso
   * @param {number} progress - Progresso (0-100)
   * @param {Object} options - Opções adicionais
   */
  updateProgress(progress, options = {}) {
    const { 
      status = null,
      force = false,
      animate = true
    } = options;
    
    // Validar progresso
    progress = Math.min(Math.max(progress, 0), 100);
    
    // Evitar atualizações desnecessárias
    if (!force && Math.abs(progress - this.targetProgress) < 0.1) {
      return;
    }
    
    this.targetProgress = progress;
    
    // Adicionar ao histórico
    const now = Date.now();
    this.progressHistory.push({
      progress,
      timestamp: now
    });
    
    // Manter apenas últimos 10 pontos
    if (this.progressHistory.length > 10) {
      this.progressHistory.shift();
    }
    
    this.lastUpdateTime = now;
    
    // Atualizar status se fornecido
    if (status) {
      this.updateStatus(status);
    }
    
    // Animar progresso
    if (animate && this.options.smoothing) {
      this.animateToProgress(progress);
    } else {
      this.setProgress(progress);
    }
    
    // Atualizar detalhes
    this.updateDetails();
  }
  
  /**
   * Anima suavemente para o progresso alvo
   * @param {number} targetProgress - Progresso alvo
   */
  animateToProgress(targetProgress) {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.isAnimating = true;
    const startProgress = this.currentProgress;
    const progressDiff = targetProgress - startProgress;
    const startTime = performance.now();
    
    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / this.options.animationDuration, 1);
      
      // Função de easing (ease-out)
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const currentProgress = startProgress + (progressDiff * easedProgress);
      
      this.setProgress(currentProgress);
      
      if (progress < 1) {
        this.animationFrame = requestAnimationFrame(animate);
      } else {
        this.isAnimating = false;
        this.animationFrame = null;
      }
    };
    
    this.animationFrame = requestAnimationFrame(animate);
  }
  
  /**
   * Define o progresso diretamente
   * @param {number} progress - Progresso (0-100)
   */
  setProgress(progress) {
    this.currentProgress = progress;
    
    switch (this.options.type) {
      case 'circle':
        this.updateCircularProgress(progress);
        break;
      case 'bar':
        this.updateBarProgress(progress);
        break;
      case 'minimal':
        this.updateMinimalProgress(progress);
        break;
    }
  }
  
  /**
   * Atualiza progresso circular
   * @param {number} progress - Progresso (0-100)
   */
  updateCircularProgress(progress) {
    if (!this.elements.progressCircle) return;
    
    const { circumference } = this.elements;
    const offset = circumference - (progress / 100) * circumference;
    
    this.elements.progressCircle.style.strokeDashoffset = offset;
    
    if (this.elements.percentText) {
      this.elements.percentText.textContent = `${Math.round(progress)}%`;
    }
  }
  
  /**
   * Atualiza progresso em barra
   * @param {number} progress - Progresso (0-100)
   */
  updateBarProgress(progress) {
    if (!this.elements.progressFill) return;
    
    this.elements.progressFill.style.width = `${progress}%`;
  }
  
  /**
   * Atualiza progresso minimal
   * @param {number} progress - Progresso (0-100)
   */
  updateMinimalProgress(progress) {
    if (!this.elements.spinner) return;
    
    // Mudar ícone baseado no progresso
    if (progress < 25) {
      this.elements.spinner.innerHTML = '⏳';
    } else if (progress < 50) {
      this.elements.spinner.innerHTML = '⌛';
    } else if (progress < 75) {
      this.elements.spinner.innerHTML = '🔄';
    } else {
      this.elements.spinner.innerHTML = '✅';
    }
  }
  
  /**
   * Atualiza o status
   * @param {string} status - Novo status
   */
  updateStatus(status) {
    if (this.elements.statusElement) {
      this.elements.statusElement.textContent = status;
    }
  }
  
  /**
   * Atualiza detalhes (ETA, velocidade)
   */
  updateDetails() {
    if (!this.elements.detailsElement || !this.startTime) return;
    
    const details = [];
    
    // Calcular velocidade
    if (this.options.showSpeed && this.progressHistory.length >= 2) {
      const speed = this.calculateSpeed();
      if (speed > 0) {
        details.push(`${this.formatSpeed(speed)}`);
      }
    }
    
    // Calcular ETA
    if (this.options.showETA && this.currentProgress > 5 && this.currentProgress < 95) {
      const eta = this.calculateETA();
      if (eta > 0) {
        details.push(`ETA: ${this.formatTime(eta)}`);
      }
    }
    
    this.elements.detailsElement.textContent = details.join(' • ');
  }
  
  /**
   * Calcula velocidade de progresso
   * @returns {number} Velocidade em %/s
   */
  calculateSpeed() {
    if (this.progressHistory.length < 2) return 0;
    
    const recent = this.progressHistory.slice(-3); // Últimos 3 pontos
    if (recent.length < 2) return 0;
    
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const progressDiff = last.progress - first.progress;
    const timeDiff = (last.timestamp - first.timestamp) / 1000; // segundos
    
    return timeDiff > 0 ? progressDiff / timeDiff : 0;
  }
  
  /**
   * Calcula ETA (tempo estimado)
   * @returns {number} ETA em segundos
   */
  calculateETA() {
    const speed = this.calculateSpeed();
    if (speed <= 0) return 0;
    
    const remainingProgress = 100 - this.currentProgress;
    return remainingProgress / speed;
  }
  
  /**
   * Formata velocidade para exibição
   * @param {number} speed - Velocidade em %/s
   * @returns {string} Velocidade formatada
   */
  formatSpeed(speed) {
    if (speed < 1) {
      return `${(speed * 100).toFixed(0)}%/min`;
    } else {
      return `${speed.toFixed(1)}%/s`;
    }
  }
  
  /**
   * Formata tempo para exibição
   * @param {number} seconds - Tempo em segundos
   * @returns {string} Tempo formatado
   */
  formatTime(seconds) {
    if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      return `${hours}h ${minutes}m`;
    }
  }
  
  /**
   * Completa o progresso
   * @param {string} status - Status de conclusão
   */
  complete(status = 'Concluído!') {
    this.state = 'complete';
    this.updateProgress(100, { status, force: true });
    
    // Mudar cor para sucesso
    this.setColor(this.options.colors.success);
    
    // Parar timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    // Limpar detalhes
    if (this.elements.detailsElement) {
      this.elements.detailsElement.textContent = '';
    }
    
    console.log('[ProgressTracker] Concluído');
  }
  
  /**
   * Marca como erro
   * @param {string} status - Status de erro
   */
  error(status = 'Erro no download') {
    this.state = 'error';
    this.updateStatus(status);
    
    // Mudar cor para erro
    this.setColor(this.options.colors.error);
    
    // Parar animações
    this.pauseAnimation();
    
    // Parar timer
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    console.log('[ProgressTracker] Erro:', status);
  }
  
  /**
   * Pausa animações
   */
  pauseAnimation() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
      this.isAnimating = false;
    }
  }
  
  /**
   * Resume animações
   */
  resumeAnimation() {
    if (this.state === 'active' && !this.isAnimating) {
      this.animateToProgress(this.targetProgress);
    }
  }
  
  /**
   * Muda a cor do progresso
   * @param {string} color - Nova cor
   */
  setColor(color) {
    if (this.elements.progressCircle) {
      this.elements.progressCircle.setAttribute('stroke', color);
    }
    
    if (this.elements.progressFill) {
      this.elements.progressFill.style.backgroundColor = color;
    }
  }
  
  /**
   * Reseta o tracker
   */
  reset() {
    this.state = 'idle';
    this.currentProgress = 0;
    this.targetProgress = 0;
    this.startTime = null;
    this.lastUpdateTime = null;
    this.progressHistory = [];
    
    this.pauseAnimation();
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
    
    this.setProgress(0);
    this.updateStatus('Preparando...');
    this.setColor(this.options.colors.progress);
    
    if (this.elements.detailsElement) {
      this.elements.detailsElement.textContent = '';
    }
    
    console.log('[ProgressTracker] Resetado');
  }
  
  /**
   * Obtém informações do estado atual
   * @returns {Object} Informações do estado
   */
  getState() {
    return {
      state: this.state,
      currentProgress: this.currentProgress,
      targetProgress: this.targetProgress,
      isAnimating: this.isAnimating,
      speed: this.calculateSpeed(),
      eta: this.calculateETA(),
      elapsed: this.startTime ? Date.now() - this.startTime : 0
    };
  }
  
  /**
   * Destrói o tracker e limpa recursos
   */
  destroy() {
    this.pauseAnimation();
    
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }
    
    // Limpar container
    if (this.container) {
      this.container.innerHTML = '';
    }
    
    console.log('[ProgressTracker] Destruído');
  }
}

// Exportar para uso global
if (typeof window !== 'undefined') {
  window.ProgressTracker = ProgressTracker;
  
  // Adicionar CSS de animação se não existir
  if (!document.querySelector('#progress-tracker-styles')) {
    const style = document.createElement('style');
    style.id = 'progress-tracker-styles';
    style.textContent = `
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      
      .progress-circle-container {
        user-select: none;
      }
      
      .progress-ring-progress {
        transition: stroke-dashoffset 0.3s ease-out;
      }
      
      .progress-bar-fill {
        transition: width 0.3s ease-out;
      }
      
      .progress-spinner {
        display: inline-block;
      }
    `;
    document.head.appendChild(style);
  }
}

// Exportar para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ProgressTracker;
}
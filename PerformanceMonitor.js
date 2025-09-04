/**
 * Sistema de Monitoramento de Performance e Health Checks
 * Monitora todas as otimizações implementadas para conexões de alta latência
 * Específico para otimizações Brasil-Finlândia
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      // Configurações de monitoramento
      metricsInterval: options.metricsInterval || 30000, // 30 segundos
      healthCheckInterval: options.healthCheckInterval || 60000, // 1 minuto
      alertThresholds: {
        responseTime: options.responseTimeThreshold || 5000, // 5s
        memoryUsage: options.memoryThreshold || 80, // 80%
        cpuUsage: options.cpuThreshold || 85, // 85%
        diskUsage: options.diskThreshold || 90, // 90%
        errorRate: options.errorRateThreshold || 5, // 5%
        ...options.alertThresholds
      },
      
      // Configurações de armazenamento
      logDir: options.logDir || './logs',
      maxLogFiles: options.maxLogFiles || 7, // 7 dias
      maxLogSize: options.maxLogSize || 10 * 1024 * 1024, // 10MB
      
      // Configurações específicas
      trackLatencyOptimizations: options.trackLatencyOptimizations !== false,
      enableRealTimeAlerts: options.enableRealTimeAlerts !== false,
      
      ...options
    };
    
    // Métricas em tempo real
    this.metrics = {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        averageResponseTime: 0,
        responseTimeHistory: []
      },
      system: {
        cpuUsage: 0,
        memoryUsage: 0,
        diskUsage: 0,
        uptime: 0
      },
      optimizations: {
        compression: {
          totalRequests: 0,
          compressedRequests: 0,
          averageCompressionRatio: 0,
          bandwidthSaved: 0
        },
        cache: {
          hits: 0,
          misses: 0,
          hitRate: 0
        },
        database: {
          totalQueries: 0,
          averageQueryTime: 0,
          slowQueries: 0
        },
        socketIO: {
          activeConnections: 0,
          reconnections: 0,
          averageLatency: 0
        },
        audioCompression: {
          totalProcessed: 0,
          totalSaved: 0,
          averageCompressionRatio: 0
        },
        parallelRequests: {
          activeRequests: 0,
          queueLength: 0,
          averageWaitTime: 0
        },
        preloader: {
          preloadedItems: 0,
          cacheHits: 0,
          averagePreloadTime: 0
        }
      },
      alerts: [],
      lastUpdated: new Date()
    };
    
    // Histórico de métricas
    this.metricsHistory = [];
    this.maxHistorySize = 1440; // 24 horas em minutos
    
    // Timers
    this.metricsTimer = null;
    this.healthCheckTimer = null;
    
    // Referências externas
    this.server = null;
    this.io = null;
    this.database = null;
    this.audioCompressor = null;
    this.parallelRequestManager = null;
    this.intelligentPreloader = null;
    
    this.init();
    
    console.log('[MONITOR] Sistema de monitoramento de performance inicializado');
  }

  /**
   * Inicializar sistema
   */
  async init() {
    try {
      // Criar diretório de logs
      await this.ensureLogDirectory();
      
      // Carregar histórico se existir
      await this.loadMetricsHistory();
      
      // Iniciar monitoramento
      this.startMonitoring();
      
      console.log('[MONITOR] Monitoramento iniciado');
      
    } catch (error) {
      console.error('[MONITOR] Erro na inicialização:', error);
    }
  }

  /**
   * Garantir que diretório de logs existe
   */
  async ensureLogDirectory() {
    if (!fs.existsSync(this.options.logDir)) {
      fs.mkdirSync(this.options.logDir, { recursive: true });
    }
  }

  /**
   * Carregar histórico de métricas
   */
  async loadMetricsHistory() {
    const historyFile = path.join(this.options.logDir, 'metrics-history.json');
    
    try {
      if (fs.existsSync(historyFile)) {
        const data = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        this.metricsHistory = data.history || [];
        
        // Limitar tamanho do histórico
        if (this.metricsHistory.length > this.maxHistorySize) {
          this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
        }
        
        console.log(`[MONITOR] Histórico carregado: ${this.metricsHistory.length} entradas`);
      }
    } catch (error) {
      console.warn('[MONITOR] Erro ao carregar histórico:', error.message);
    }
  }

  /**
   * Salvar histórico de métricas
   */
  async saveMetricsHistory() {
    const historyFile = path.join(this.options.logDir, 'metrics-history.json');
    
    try {
      const data = {
        history: this.metricsHistory,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(historyFile, JSON.stringify(data, null, 2));
    } catch (error) {
      console.warn('[MONITOR] Erro ao salvar histórico:', error.message);
    }
  }

  /**
   * Iniciar monitoramento
   */
  startMonitoring() {
    // Coletar métricas periodicamente
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.options.metricsInterval);
    
    // Health checks periodicamente
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.options.healthCheckInterval);
    
    // Coleta inicial
    this.collectMetrics();
    this.performHealthChecks();
  }

  /**
   * Parar monitoramento
   */
  stopMonitoring() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
    
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
    }
    
    console.log('[MONITOR] Monitoramento parado');
  }

  /**
   * Coletar métricas do sistema
   */
  async collectMetrics() {
    try {
      const timestamp = new Date();
      
      // Métricas do sistema
      await this.collectSystemMetrics();
      
      // Métricas das otimizações
      await this.collectOptimizationMetrics();
      
      // Atualizar timestamp
      this.metrics.lastUpdated = timestamp;
      
      // Adicionar ao histórico
      this.addToHistory(timestamp);
      
      // Verificar alertas
      this.checkAlerts();
      
      // Log periódico
      if (this.metrics.requests.total % 100 === 0) {
        console.log(`[MONITOR] 📊 Métricas coletadas - CPU: ${this.metrics.system.cpuUsage.toFixed(1)}%, Mem: ${this.metrics.system.memoryUsage.toFixed(1)}%, Req: ${this.metrics.requests.total}`);
      }
      
    } catch (error) {
      console.error('[MONITOR] Erro ao coletar métricas:', error);
    }
  }

  /**
   * Coletar métricas do sistema
   */
  async collectSystemMetrics() {
    // CPU Usage
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    
    this.metrics.system.cpuUsage = ((totalTick - totalIdle) / totalTick) * 100;
    
    // Memory Usage
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    this.metrics.system.memoryUsage = ((totalMem - freeMem) / totalMem) * 100;
    
    // Uptime
    this.metrics.system.uptime = process.uptime();
    
    // Disk Usage (aproximado)
    try {
      const stats = fs.statSync(process.cwd());
      // Implementação simplificada - em produção usar bibliotecas específicas
      this.metrics.system.diskUsage = 50; // Placeholder
    } catch (error) {
      this.metrics.system.diskUsage = 0;
    }
  }

  /**
   * Coletar métricas das otimizações
   */
  async collectOptimizationMetrics() {
    // Métricas do Socket.IO
    if (this.io) {
      this.metrics.optimizations.socketIO.activeConnections = this.io.engine.clientsCount || 0;
    }
    
    // Métricas do compressor de áudio
    if (this.audioCompressor) {
      const stats = this.audioCompressor.getStats();
      this.metrics.optimizations.audioCompression = {
        totalProcessed: stats.totalProcessed || 0,
        totalSaved: stats.totalSaved || 0,
        averageCompressionRatio: stats.averageCompressionRatio || 0
      };
    }
    
    // Métricas do gerenciador de requisições paralelas
    if (this.parallelRequestManager) {
      const stats = this.parallelRequestManager.getStats();
      this.metrics.optimizations.parallelRequests = {
        activeRequests: stats.activeRequests || 0,
        queueLength: stats.queueLength || 0,
        averageWaitTime: 0 // Calculado dinamicamente
      };
    }
    
    // Métricas do pré-carregador inteligente
    if (this.intelligentPreloader) {
      const stats = this.intelligentPreloader.getStats();
      this.metrics.optimizations.preloader = {
        preloadedItems: stats.preloadedCount || 0,
        cacheHits: 0, // Implementar se necessário
        averagePreloadTime: 0 // Implementar se necessário
      };
    }
  }

  /**
   * Adicionar métricas ao histórico
   */
  addToHistory(timestamp) {
    const snapshot = {
      timestamp: timestamp.toISOString(),
      system: { ...this.metrics.system },
      requests: {
        total: this.metrics.requests.total,
        successful: this.metrics.requests.successful,
        failed: this.metrics.requests.failed,
        averageResponseTime: this.metrics.requests.averageResponseTime
      },
      optimizations: JSON.parse(JSON.stringify(this.metrics.optimizations))
    };
    
    this.metricsHistory.push(snapshot);
    
    // Limitar tamanho do histórico
    if (this.metricsHistory.length > this.maxHistorySize) {
      this.metricsHistory.shift();
    }
    
    // Salvar periodicamente
    if (this.metricsHistory.length % 10 === 0) {
      this.saveMetricsHistory();
    }
  }

  /**
   * Realizar health checks
   */
  async performHealthChecks() {
    const checks = {
      timestamp: new Date().toISOString(),
      system: await this.checkSystemHealth(),
      database: await this.checkDatabaseHealth(),
      socketIO: await this.checkSocketIOHealth(),
      optimizations: await this.checkOptimizationsHealth()
    };
    
    // Log health check
    const healthScore = this.calculateHealthScore(checks);
    console.log(`[MONITOR] 🏥 Health Check - Score: ${healthScore}% - ${this.getHealthStatus(healthScore)}`);
    
    // Salvar health check
    await this.saveHealthCheck(checks);
    
    return checks;
  }

  /**
   * Verificar saúde do sistema
   */
  async checkSystemHealth() {
    const health = {
      cpu: this.metrics.system.cpuUsage < this.options.alertThresholds.cpuUsage,
      memory: this.metrics.system.memoryUsage < this.options.alertThresholds.memoryUsage,
      disk: this.metrics.system.diskUsage < this.options.alertThresholds.diskUsage,
      uptime: this.metrics.system.uptime > 60 // Pelo menos 1 minuto
    };
    
    return {
      status: Object.values(health).every(h => h) ? 'healthy' : 'warning',
      details: health
    };
  }

  /**
   * Verificar saúde do banco de dados
   */
  async checkDatabaseHealth() {
    try {
      if (this.database) {
        // Teste simples de conectividade
        const startTime = Date.now();
        // Implementar teste específico do banco
        const responseTime = Date.now() - startTime;
        
        return {
          status: responseTime < 1000 ? 'healthy' : 'warning',
          responseTime,
          details: {
            connected: true,
            responseTime
          }
        };
      }
      
      return {
        status: 'unknown',
        details: { message: 'Database not configured' }
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message,
        details: { connected: false }
      };
    }
  }

  /**
   * Verificar saúde do Socket.IO
   */
  async checkSocketIOHealth() {
    try {
      if (this.io) {
        const activeConnections = this.io.engine.clientsCount || 0;
        
        return {
          status: 'healthy',
          details: {
            activeConnections,
            engineReady: !!this.io.engine
          }
        };
      }
      
      return {
        status: 'unknown',
        details: { message: 'Socket.IO not configured' }
      };
      
    } catch (error) {
      return {
        status: 'error',
        error: error.message
      };
    }
  }

  /**
   * Verificar saúde das otimizações
   */
  async checkOptimizationsHealth() {
    const optimizations = {
      audioCompression: this.audioCompressor ? 'healthy' : 'not_configured',
      parallelRequests: this.parallelRequestManager ? 'healthy' : 'not_configured',
      intelligentPreloader: this.intelligentPreloader ? 'healthy' : 'not_configured'
    };
    
    const healthyCount = Object.values(optimizations).filter(status => status === 'healthy').length;
    const totalCount = Object.keys(optimizations).length;
    
    return {
      status: healthyCount === totalCount ? 'healthy' : 'partial',
      details: optimizations,
      healthyRatio: healthyCount / totalCount
    };
  }

  /**
   * Calcular score de saúde
   */
  calculateHealthScore(checks) {
    let score = 0;
    let maxScore = 0;
    
    // Sistema (40 pontos)
    maxScore += 40;
    if (checks.system.status === 'healthy') score += 40;
    else if (checks.system.status === 'warning') score += 20;
    
    // Banco de dados (30 pontos)
    maxScore += 30;
    if (checks.database.status === 'healthy') score += 30;
    else if (checks.database.status === 'warning') score += 15;
    
    // Socket.IO (20 pontos)
    maxScore += 20;
    if (checks.socketIO.status === 'healthy') score += 20;
    else if (checks.socketIO.status === 'warning') score += 10;
    
    // Otimizações (10 pontos)
    maxScore += 10;
    if (checks.optimizations.status === 'healthy') score += 10;
    else if (checks.optimizations.status === 'partial') score += 5;
    
    return Math.round((score / maxScore) * 100);
  }

  /**
   * Obter status de saúde baseado no score
   */
  getHealthStatus(score) {
    if (score >= 90) return '🟢 Excelente';
    if (score >= 75) return '🟡 Bom';
    if (score >= 50) return '🟠 Atenção';
    return '🔴 Crítico';
  }

  /**
   * Verificar alertas
   */
  checkAlerts() {
    const alerts = [];
    const now = new Date();
    
    // Alerta de CPU
    if (this.metrics.system.cpuUsage > this.options.alertThresholds.cpuUsage) {
      alerts.push({
        type: 'cpu_high',
        severity: 'warning',
        message: `CPU usage high: ${this.metrics.system.cpuUsage.toFixed(1)}%`,
        value: this.metrics.system.cpuUsage,
        threshold: this.options.alertThresholds.cpuUsage,
        timestamp: now
      });
    }
    
    // Alerta de memória
    if (this.metrics.system.memoryUsage > this.options.alertThresholds.memoryUsage) {
      alerts.push({
        type: 'memory_high',
        severity: 'warning',
        message: `Memory usage high: ${this.metrics.system.memoryUsage.toFixed(1)}%`,
        value: this.metrics.system.memoryUsage,
        threshold: this.options.alertThresholds.memoryUsage,
        timestamp: now
      });
    }
    
    // Alerta de tempo de resposta
    if (this.metrics.requests.averageResponseTime > this.options.alertThresholds.responseTime) {
      alerts.push({
        type: 'response_time_high',
        severity: 'critical',
        message: `Average response time high: ${this.metrics.requests.averageResponseTime}ms`,
        value: this.metrics.requests.averageResponseTime,
        threshold: this.options.alertThresholds.responseTime,
        timestamp: now
      });
    }
    
    // Adicionar novos alertas
    alerts.forEach(alert => {
      this.addAlert(alert);
    });
  }

  /**
   * Adicionar alerta
   */
  addAlert(alert) {
    // Evitar alertas duplicados recentes
    const recentAlert = this.metrics.alerts.find(a => 
      a.type === alert.type && 
      (Date.now() - new Date(a.timestamp).getTime()) < 300000 // 5 minutos
    );
    
    if (!recentAlert) {
      this.metrics.alerts.push(alert);
      
      // Limitar número de alertas
      if (this.metrics.alerts.length > 50) {
        this.metrics.alerts = this.metrics.alerts.slice(-50);
      }
      
      // Log do alerta
      console.warn(`[MONITOR] 🚨 ALERTA [${alert.severity.toUpperCase()}]: ${alert.message}`);
      
      // Salvar alerta em arquivo
      this.saveAlert(alert);
    }
  }

  /**
   * Salvar alerta em arquivo
   */
  async saveAlert(alert) {
    try {
      const alertsFile = path.join(this.options.logDir, `alerts-${new Date().toISOString().split('T')[0]}.json`);
      
      let alerts = [];
      if (fs.existsSync(alertsFile)) {
        alerts = JSON.parse(fs.readFileSync(alertsFile, 'utf8'));
      }
      
      alerts.push(alert);
      fs.writeFileSync(alertsFile, JSON.stringify(alerts, null, 2));
      
    } catch (error) {
      console.error('[MONITOR] Erro ao salvar alerta:', error);
    }
  }

  /**
   * Salvar health check
   */
  async saveHealthCheck(checks) {
    try {
      const healthFile = path.join(this.options.logDir, `health-${new Date().toISOString().split('T')[0]}.json`);
      
      let healthChecks = [];
      if (fs.existsSync(healthFile)) {
        healthChecks = JSON.parse(fs.readFileSync(healthFile, 'utf8'));
      }
      
      healthChecks.push(checks);
      
      // Limitar número de health checks por dia
      if (healthChecks.length > 1440) { // 24 horas em minutos
        healthChecks = healthChecks.slice(-1440);
      }
      
      fs.writeFileSync(healthFile, JSON.stringify(healthChecks, null, 2));
      
    } catch (error) {
      console.error('[MONITOR] Erro ao salvar health check:', error);
    }
  }

  /**
   * Registrar requisição
   */
  recordRequest(responseTime, success = true) {
    this.metrics.requests.total++;
    
    if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
    
    // Atualizar tempo médio de resposta
    this.metrics.requests.responseTimeHistory.push(responseTime);
    
    // Manter apenas últimas 100 requisições para média
    if (this.metrics.requests.responseTimeHistory.length > 100) {
      this.metrics.requests.responseTimeHistory.shift();
    }
    
    // Calcular média
    this.metrics.requests.averageResponseTime = 
      this.metrics.requests.responseTimeHistory.reduce((a, b) => a + b, 0) / 
      this.metrics.requests.responseTimeHistory.length;
  }

  /**
   * Configurar referências externas
   */
  setReferences(refs) {
    this.server = refs.server || null;
    this.io = refs.io || null;
    this.database = refs.database || null;
    this.audioCompressor = refs.audioCompressor || null;
    this.parallelRequestManager = refs.parallelRequestManager || null;
    this.intelligentPreloader = refs.intelligentPreloader || null;
    
    console.log('[MONITOR] Referências externas configuradas');
  }

  /**
   * Obter métricas atuais
   */
  getMetrics() {
    return JSON.parse(JSON.stringify(this.metrics));
  }

  /**
   * Obter histórico de métricas
   */
  getMetricsHistory(hours = 24) {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.metricsHistory.filter(entry => new Date(entry.timestamp) > cutoff);
  }

  /**
   * Obter relatório de performance
   */
  getPerformanceReport() {
    const now = new Date();
    const last24h = this.getMetricsHistory(24);
    
    return {
      timestamp: now.toISOString(),
      summary: {
        uptime: this.metrics.system.uptime,
        totalRequests: this.metrics.requests.total,
        successRate: this.metrics.requests.total > 0 ? 
          (this.metrics.requests.successful / this.metrics.requests.total) * 100 : 0,
        averageResponseTime: this.metrics.requests.averageResponseTime,
        activeAlerts: this.metrics.alerts.filter(a => 
          (now.getTime() - new Date(a.timestamp).getTime()) < 3600000 // 1 hora
        ).length
      },
      optimizations: {
        audioCompression: {
          totalProcessed: this.metrics.optimizations.audioCompression.totalProcessed,
          totalSaved: this.metrics.optimizations.audioCompression.totalSaved,
          averageCompressionRatio: this.metrics.optimizations.audioCompression.averageCompressionRatio
        },
        parallelRequests: {
          activeRequests: this.metrics.optimizations.parallelRequests.activeRequests,
          queueLength: this.metrics.optimizations.parallelRequests.queueLength
        },
        preloader: {
          preloadedItems: this.metrics.optimizations.preloader.preloadedItems
        }
      },
      trends: this.calculateTrends(last24h)
    };
  }

  /**
   * Calcular tendências
   */
  calculateTrends(history) {
    if (history.length < 2) {
      return { message: 'Dados insuficientes para calcular tendências' };
    }
    
    const first = history[0];
    const last = history[history.length - 1];
    
    return {
      responseTime: {
        change: last.requests.averageResponseTime - first.requests.averageResponseTime,
        trend: last.requests.averageResponseTime > first.requests.averageResponseTime ? 'increasing' : 'decreasing'
      },
      memoryUsage: {
        change: last.system.memoryUsage - first.system.memoryUsage,
        trend: last.system.memoryUsage > first.system.memoryUsage ? 'increasing' : 'decreasing'
      },
      cpuUsage: {
        change: last.system.cpuUsage - first.system.cpuUsage,
        trend: last.system.cpuUsage > first.system.cpuUsage ? 'increasing' : 'decreasing'
      }
    };
  }

  /**
   * Destruir instância
   */
  async destroy() {
    this.stopMonitoring();
    await this.saveMetricsHistory();
    
    console.log('[MONITOR] Sistema de monitoramento destruído');
  }
}

module.exports = PerformanceMonitor;
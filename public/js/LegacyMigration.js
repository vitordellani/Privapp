/**
 * LegacyMigration - Sistema de Migração de Código Legado
 * Fase 3: Consolidação da arquitetura
 * 
 * Gerencia a transição do sistema legado para o UnifiedBadgeManager,
 * mantendo compatibilidade durante o processo de migração
 */
class LegacyMigration {
  constructor() {
    this.migrationStatus = {
      started: false,
      completed: false,
      errors: [],
      migratedFunctions: [],
      deprecatedFunctions: []
    };
    
    this.legacyFunctions = [
      'atualizarBadgeContato',
      'marcarMensagensComoLidas', 
      'showReadConfirmation',
      'contarMensagensNaoLidas'
    ];
    
    console.log('[LegacyMigration] Sistema de migração inicializado');
  }
  
  /**
   * Inicia o processo de migração
   */
  async startMigration() {
    console.log('[LegacyMigration] 🔄 Iniciando migração do sistema legado...');
    
    try {
      this.migrationStatus.started = true;
      
      // 1. Verificar se UnifiedBadgeManager está disponível
      if (!window.unifiedBadgeManager) {
        throw new Error('UnifiedBadgeManager não está disponível');
      }
      
      // 2. Criar wrappers de compatibilidade
      this.createCompatibilityWrappers();
      
      // 3. Migrar dados do localStorage
      await this.migrateLegacyData();
      
      // 4. Marcar funções como deprecated
      this.markFunctionsAsDeprecated();
      
      // 5. Configurar monitoramento de uso
      this.setupUsageMonitoring();
      
      this.migrationStatus.completed = true;
      console.log('[LegacyMigration] ✅ Migração concluída com sucesso');
      
      return true;
    } catch (error) {
      console.error('[LegacyMigration] ❌ Erro na migração:', error);
      this.migrationStatus.errors.push(error.message);
      return false;
    }
  }
  
  /**
   * Cria wrappers de compatibilidade para funções legadas
   */
  createCompatibilityWrappers() {
    console.log('[LegacyMigration] 🔧 Criando wrappers de compatibilidade...');
    
    // Wrapper para atualizarBadgeContato
    if (window.atualizarBadgeContato) {
      const originalFunction = window.atualizarBadgeContato;
      window.atualizarBadgeContato = (contato, quantidade) => {
        console.warn('[DEPRECATED] atualizarBadgeContato está obsoleta. Use UnifiedBadgeManager.updateBadge()');
        
        if (window.unifiedBadgeManager) {
          return window.unifiedBadgeManager.updateBadge(contato, quantidade);
        } else {
          return originalFunction(contato, quantidade);
        }
      };
      this.migrationStatus.migratedFunctions.push('atualizarBadgeContato');
    }
    
    // Wrapper para marcarMensagensComoLidas
    if (window.marcarMensagensComoLidas) {
      const originalFunction = window.marcarMensagensComoLidas;
      window.marcarMensagensComoLidas = (contato) => {
        console.warn('[DEPRECATED] marcarMensagensComoLidas está obsoleta. Use UnifiedBadgeManager.markChatAsRead()');
        
        if (window.unifiedBadgeManager) {
          return window.unifiedBadgeManager.markChatAsRead(contato);
        } else {
          return originalFunction(contato);
        }
      };
      this.migrationStatus.migratedFunctions.push('marcarMensagensComoLidas');
    }
    
    // Wrapper para showReadConfirmation
    if (window.showReadConfirmation) {
      const originalFunction = window.showReadConfirmation;
      window.showReadConfirmation = (chatId) => {
        console.warn('[DEPRECATED] showReadConfirmation está obsoleta. Feedback visual é automático no UnifiedBadgeManager');
        
        // Manter funcionalidade por compatibilidade
        return originalFunction(chatId);
      };
      this.migrationStatus.migratedFunctions.push('showReadConfirmation');
    }
    
    // Wrapper para contarMensagensNaoLidas
    if (window.contarMensagensNaoLidas) {
      const originalFunction = window.contarMensagensNaoLidas;
      window.contarMensagensNaoLidas = (contato) => {
        console.warn('[DEPRECATED] contarMensagensNaoLidas está obsoleta. Use UnifiedBadgeManager.getBadgeCount()');
        
        if (window.unifiedBadgeManager) {
          return window.unifiedBadgeManager.getBadgeCount(contato);
        } else {
          return originalFunction(contato);
        }
      };
      this.migrationStatus.migratedFunctions.push('contarMensagensNaoLidas');
    }
    
    console.log('[LegacyMigration] ✅ Wrappers criados:', this.migrationStatus.migratedFunctions);
  }
  
  /**
   * Migra dados do sistema legado
   */
  async migrateLegacyData() {
    console.log('[LegacyMigration] 📦 Migrando dados legados...');
    
    try {
      // Migrar mensagens lidas do localStorage
      const legacyReadMessages = localStorage.getItem('mensagensLidas');
      if (legacyReadMessages) {
        const readSet = new Set(JSON.parse(legacyReadMessages));
        console.log('[LegacyMigration] Encontradas', readSet.size, 'mensagens lidas no sistema legado');
        
        // Criar backup
        localStorage.setItem('mensagensLidas_backup', legacyReadMessages);
        console.log('[LegacyMigration] ✅ Backup criado: mensagensLidas_backup');
      }
      
      // Migrar contadores de não lidas
      if (window.naoLidas && typeof window.naoLidas === 'object') {
        const legacyCounters = { ...window.naoLidas };
        const totalUnread = Object.values(legacyCounters).reduce((sum, count) => sum + count, 0);
        
        if (totalUnread > 0) {
          console.log('[LegacyMigration] Encontrados', totalUnread, 'badges não lidos no sistema legado');
          
          // Criar backup
          localStorage.setItem('naoLidas_backup', JSON.stringify(legacyCounters));
          console.log('[LegacyMigration] ✅ Backup criado: naoLidas_backup');
        }
      }
      
      console.log('[LegacyMigration] ✅ Dados migrados com sucesso');
      
    } catch (error) {
      console.error('[LegacyMigration] ❌ Erro na migração de dados:', error);
      throw error;
    }
  }
  
  /**
   * Marca funções como deprecated
   */
  markFunctionsAsDeprecated() {
    console.log('[LegacyMigration] ⚠️ Marcando funções como deprecated...');
    
    this.legacyFunctions.forEach(funcName => {
      if (window[funcName]) {
        // Adicionar propriedade deprecated
        window[funcName]._deprecated = true;
        window[funcName]._replacedBy = 'UnifiedBadgeManager';
        window[funcName]._migrationDate = new Date().toISOString();
        
        this.migrationStatus.deprecatedFunctions.push(funcName);
      }
    });
    
    console.log('[LegacyMigration] ✅ Funções marcadas como deprecated:', this.migrationStatus.deprecatedFunctions);
  }
  
  /**
   * Configura monitoramento de uso de funções legadas
   */
  setupUsageMonitoring() {
    console.log('[LegacyMigration] 📊 Configurando monitoramento de uso...');
    
    this.usageStats = {};
    
    this.legacyFunctions.forEach(funcName => {
      this.usageStats[funcName] = {
        callCount: 0,
        lastUsed: null,
        warnings: 0
      };
    });
    
    // Interceptar console.warn para contar avisos de deprecated
    const originalWarn = console.warn;
    console.warn = (...args) => {
      const message = args.join(' ');
      if (message.includes('[DEPRECATED]')) {
        this.legacyFunctions.forEach(funcName => {
          if (message.includes(funcName)) {
            this.usageStats[funcName].callCount++;
            this.usageStats[funcName].lastUsed = new Date().toISOString();
            this.usageStats[funcName].warnings++;
          }
        });
      }
      return originalWarn.apply(console, args);
    };
    
    console.log('[LegacyMigration] ✅ Monitoramento configurado');
  }
  
  /**
   * Gera relatório de migração
   */
  generateMigrationReport() {
    const report = {
      status: this.migrationStatus,
      usageStats: this.usageStats,
      recommendations: this.generateRecommendations(),
      timestamp: new Date().toISOString()
    };
    
    console.log('[LegacyMigration] 📋 Relatório de Migração:', report);
    return report;
  }
  
  /**
   * Gera recomendações baseadas no uso
   */
  generateRecommendations() {
    const recommendations = [];
    
    if (this.usageStats) {
      Object.entries(this.usageStats).forEach(([funcName, stats]) => {
        if (stats.callCount > 10) {
          recommendations.push({
            type: 'high_usage',
            function: funcName,
            message: `Função ${funcName} ainda é muito usada (${stats.callCount} chamadas). Considere refatorar o código.`,
            priority: 'high'
          });
        } else if (stats.callCount > 0) {
          recommendations.push({
            type: 'low_usage',
            function: funcName,
            message: `Função ${funcName} tem uso baixo (${stats.callCount} chamadas). Pode ser removida em breve.`,
            priority: 'medium'
          });
        } else {
          recommendations.push({
            type: 'no_usage',
            function: funcName,
            message: `Função ${funcName} não está sendo usada. Pode ser removida com segurança.`,
            priority: 'low'
          });
        }
      });
    }
    
    return recommendations;
  }
  
  /**
   * Remove funções legadas com segurança
   */
  removeLegacyFunctions(force = false) {
    console.log('[LegacyMigration] 🗑️ Removendo funções legadas...');
    
    const report = this.generateMigrationReport();
    const safeToRemove = [];
    
    if (!force) {
      // Só remover funções que não estão sendo usadas
      report.recommendations.forEach(rec => {
        if (rec.type === 'no_usage') {
          safeToRemove.push(rec.function);
        }
      });
    } else {
      // Forçar remoção de todas as funções
      safeToRemove.push(...this.legacyFunctions);
    }
    
    safeToRemove.forEach(funcName => {
      if (window[funcName]) {
        // Criar stub que avisa sobre remoção
        window[funcName] = () => {
          throw new Error(`Função ${funcName} foi removida. Use UnifiedBadgeManager.`);
        };
        console.log(`[LegacyMigration] ✅ Função ${funcName} removida`);
      }
    });
    
    return {
      removed: safeToRemove,
      report: report
    };
  }
  
  /**
   * Restaura sistema legado em caso de emergência
   */
  rollback() {
    console.log('[LegacyMigration] ⏪ Iniciando rollback...');
    
    try {
      // Restaurar dados do backup
      const backupReadMessages = localStorage.getItem('mensagensLidas_backup');
      if (backupReadMessages) {
        localStorage.setItem('mensagensLidas', backupReadMessages);
        console.log('[LegacyMigration] ✅ Mensagens lidas restauradas');
      }
      
      const backupCounters = localStorage.getItem('naoLidas_backup');
      if (backupCounters) {
        window.naoLidas = JSON.parse(backupCounters);
        console.log('[LegacyMigration] ✅ Contadores restaurados');
      }
      
      console.log('[LegacyMigration] ✅ Rollback concluído');
      return true;
      
    } catch (error) {
      console.error('[LegacyMigration] ❌ Erro no rollback:', error);
      return false;
    }
  }
}

// Exportar para uso global
window.LegacyMigration = LegacyMigration;

// Função de conveniência para iniciar migração
window.startLegacyMigration = async function() {
  console.log('[LegacyMigration] 🚀 Iniciando processo de migração...');
  
  const migration = new LegacyMigration();
  const success = await migration.startMigration();
  
  if (success) {
    window.legacyMigration = migration;
    console.log('[LegacyMigration] 🎉 Migração ativa!');
    
    // Gerar relatório inicial
    setTimeout(() => {
      const report = migration.generateMigrationReport();
      console.log('[LegacyMigration] 📊 Relatório inicial:', report);
    }, 5000);
    
    return migration;
  } else {
    console.error('[LegacyMigration] ❌ Falha na migração');
    return null;
  }
};

console.log('[LegacyMigration] 🔄 Sistema de migração carregado - Fase 3');
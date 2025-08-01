/**
 * Teste do Sistema de Notificações Mobile
 * Verifica se o bug de notificações persistentes foi corrigido
 */

class MobileNotificationTester {
  constructor() {
    this.testResults = [];
    this.currentTest = 0;
    this.totalTests = 0;
  }

  async runAllTests() {
    console.log('🧪 Iniciando testes do sistema de notificações mobile...');
    
    this.totalTests = 6;
    this.currentTest = 0;
    
    try {
      await this.testSystemInitialization();
      await this.testMobileDetection();
      await this.testChatViewTracking();
      await this.testNotificationStopping();
      await this.testStateSynchronization();
      await this.testVisualIndicators();
      
      this.printResults();
    } catch (error) {
      console.error('❌ Erro durante os testes:', error);
    }
  }

  async testSystemInitialization() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Inicialização dos Sistemas`);
    
    try {
      // Verificar se os sistemas foram inicializados
      const appState = window.appState;
      const messageViewTracker = window.messageViewTracker;
      const notificationManager = window.notificationManager;
      
      const results = {
        appState: !!appState,
        messageViewTracker: !!messageViewTracker,
        notificationManager: !!notificationManager
      };
      
      const allInitialized = Object.values(results).every(Boolean);
      
      if (allInitialized) {
        console.log('✅ Todos os sistemas foram inicializados corretamente');
        this.testResults.push({ test: 'Inicialização', status: 'PASS', details: results });
      } else {
        console.log('❌ Alguns sistemas não foram inicializados:', results);
        this.testResults.push({ test: 'Inicialização', status: 'FAIL', details: results });
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de inicialização:', error);
      this.testResults.push({ test: 'Inicialização', status: 'ERROR', details: error.message });
    }
  }

  async testMobileDetection() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Detecção de Mobile`);
    
    try {
      const isMobile = window.innerWidth <= 768;
      const messageViewTracker = window.messageViewTracker;
      const notificationManager = window.notificationManager;
      
      const results = {
        viewportWidth: window.innerWidth,
        isMobileDetected: isMobile,
        messageViewTrackerMobile: messageViewTracker?.isMobileView,
        notificationManagerMobile: notificationManager?.isMobileView
      };
      
      const allConsistent = results.isMobileDetected === results.messageViewTrackerMobile &&
                           results.isMobileDetected === results.notificationManagerMobile;
      
      if (allConsistent) {
        console.log('✅ Detecção de mobile consistente entre todos os sistemas');
        this.testResults.push({ test: 'Detecção Mobile', status: 'PASS', details: results });
      } else {
        console.log('❌ Inconsistência na detecção de mobile:', results);
        this.testResults.push({ test: 'Detecção Mobile', status: 'FAIL', details: results });
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de detecção mobile:', error);
      this.testResults.push({ test: 'Detecção Mobile', status: 'ERROR', details: error.message });
    }
  }

  async testChatViewTracking() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Rastreamento de Visualização`);
    
    try {
      const messageViewTracker = window.messageViewTracker;
      
      if (!messageViewTracker) {
        throw new Error('MessageViewTracker não inicializado');
      }
      
      // Simular seleção de chat
      const testChatId = '5511999999999@c.us';
      messageViewTracker.setCurrentChat(testChatId);
      
      const results = {
        currentChat: messageViewTracker.currentChat,
        isTracking: messageViewTracker.currentChat === testChatId,
        visibilityObserver: !!messageViewTracker.visibilityObserver
      };
      
      if (results.isTracking && results.visibilityObserver) {
        console.log('✅ Rastreamento de visualização funcionando corretamente');
        this.testResults.push({ test: 'Rastreamento Visualização', status: 'PASS', details: results });
      } else {
        console.log('❌ Problemas no rastreamento de visualização:', results);
        this.testResults.push({ test: 'Rastreamento Visualização', status: 'FAIL', details: results });
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de rastreamento:', error);
      this.testResults.push({ test: 'Rastreamento Visualização', status: 'ERROR', details: error.message });
    }
  }

  async testNotificationStopping() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Parada de Notificações`);
    
    try {
      const notificationManager = window.notificationManager;
      
      if (!notificationManager) {
        throw new Error('NotificationManager não inicializado');
      }
      
      // Simular chat sendo visualizado
      const testChatId = '5511888888888@c.us';
      notificationManager.markChatAsViewed(testChatId);
      
      const results = {
        isViewed: notificationManager.viewedChats.has(testChatId),
        shouldNotify: notificationManager.shouldNotify(testChatId),
        activeNotifications: notificationManager.activeNotifications.has(testChatId)
      };
      
      if (results.isViewed && !results.shouldNotify && !results.activeNotifications) {
        console.log('✅ Notificações paradas corretamente ao visualizar chat');
        this.testResults.push({ test: 'Parada Notificações', status: 'PASS', details: results });
      } else {
        console.log('❌ Problemas na parada de notificações:', results);
        this.testResults.push({ test: 'Parada Notificações', status: 'FAIL', details: results });
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de parada de notificações:', error);
      this.testResults.push({ test: 'Parada Notificações', status: 'ERROR', details: error.message });
    }
  }

  async testStateSynchronization() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Sincronização de Estado`);
    
    try {
      const appState = window.appState;
      
      if (!appState) {
        throw new Error('AppState não inicializado');
      }
      
      // Simular mensagem sendo marcada como lida
      const testMessageId = 'test_message_123';
      const testChatId = '5511777777777@c.us';
      
      appState.markMessageAsRead(testMessageId, testChatId);
      
      const results = {
        isMessageRead: appState.isMessageRead(testMessageId),
        readStatusSize: appState.readStatus.size,
        broadcastChannel: !!appState.broadcastChannel
      };
      
      if (results.isMessageRead && results.broadcastChannel) {
        console.log('✅ Sincronização de estado funcionando corretamente');
        this.testResults.push({ test: 'Sincronização Estado', status: 'PASS', details: results });
      } else {
        console.log('❌ Problemas na sincronização de estado:', results);
        this.testResults.push({ test: 'Sincronização Estado', status: 'FAIL', details: results });
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de sincronização:', error);
      this.testResults.push({ test: 'Sincronização Estado', status: 'ERROR', details: error.message });
    }
  }

  async testVisualIndicators() {
    this.currentTest++;
    console.log(`\n📋 Teste ${this.currentTest}/${this.totalTests}: Indicadores Visuais`);
    
    try {
      const messageViewTracker = window.messageViewTracker;
      
      if (!messageViewTracker) {
        throw new Error('MessageViewTracker não inicializado');
      }
      
      // Simular visualização de chat no mobile
      const testChatId = '5511666666666@c.us';
      
      // Forçar modo mobile para teste
      const originalIsMobile = messageViewTracker.isMobileView;
      messageViewTracker.isMobileView = true;
      
      // Chamar função de indicador visual
      messageViewTracker.showViewIndicator(testChatId);
      
      // Verificar se o indicador foi criado
      const indicator = document.querySelector('.view-indicator');
      
      const results = {
        indicatorCreated: !!indicator,
        indicatorText: indicator?.textContent || '',
        isMobile: messageViewTracker.isMobileView
      };
      
      // Restaurar estado original
      messageViewTracker.isMobileView = originalIsMobile;
      
      if (results.indicatorCreated && results.indicatorText.includes('Visualizando')) {
        console.log('✅ Indicadores visuais funcionando corretamente');
        this.testResults.push({ test: 'Indicadores Visuais', status: 'PASS', details: results });
      } else {
        console.log('❌ Problemas nos indicadores visuais:', results);
        this.testResults.push({ test: 'Indicadores Visuais', status: 'FAIL', details: results });
      }
      
      // Limpar indicador após teste
      if (indicator) {
        indicator.remove();
      }
      
    } catch (error) {
      console.error('❌ Erro no teste de indicadores visuais:', error);
      this.testResults.push({ test: 'Indicadores Visuais', status: 'ERROR', details: error.message });
    }
  }

  printResults() {
    console.log('\n📊 RESULTADOS DOS TESTES');
    console.log('========================');
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    const errors = this.testResults.filter(r => r.status === 'ERROR').length;
    
    console.log(`✅ Passou: ${passed}`);
    console.log(`❌ Falhou: ${failed}`);
    console.log(`💥 Erro: ${errors}`);
    console.log(`📈 Taxa de Sucesso: ${((passed / this.totalTests) * 100).toFixed(1)}%`);
    
    console.log('\n📋 Detalhes dos Testes:');
    this.testResults.forEach((result, index) => {
      const status = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '💥';
      console.log(`${status} ${result.test}: ${result.status}`);
      if (result.details) {
        console.log(`   Detalhes:`, result.details);
      }
    });
    
    // Recomendações
    console.log('\n💡 Recomendações:');
    if (failed > 0 || errors > 0) {
      console.log('⚠️  Alguns testes falharam. Verifique:');
      console.log('   - Se todos os scripts foram carregados corretamente');
      console.log('   - Se não há erros no console do navegador');
      console.log('   - Se a aplicação está funcionando normalmente');
    } else {
      console.log('🎉 Todos os testes passaram! O sistema de notificações mobile está funcionando corretamente.');
    }
  }
}

// Função para executar os testes
function runMobileNotificationTests() {
  const tester = new MobileNotificationTester();
  tester.runAllTests();
}

// Executar testes automaticamente após 3 segundos
setTimeout(() => {
  console.log('🚀 Executando testes do sistema de notificações mobile...');
  runMobileNotificationTests();
}, 3000);

// Exportar para uso global
window.MobileNotificationTester = MobileNotificationTester;
window.runMobileNotificationTests = runMobileNotificationTests; 
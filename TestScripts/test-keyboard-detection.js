// Script de teste para detecção do teclado virtual
console.log('=== Teste de Detecção do Teclado Virtual ===');

// Função para testar detecção do teclado
function testKeyboardDetection() {
  console.log('Testando detecção do teclado virtual...');
  
  // Verifica se a função existe
  if (typeof setupKeyboardDetection === 'function') {
    console.log('✅ setupKeyboardDetection function exists');
  } else {
    console.error('❌ setupKeyboardDetection function not found');
  }
  
  // Verifica se a classe keyboard-open está sendo aplicada
  const hasKeyboardClass = document.body.classList.contains('keyboard-open');
  console.log('Classe keyboard-open aplicada:', hasKeyboardClass);
  
  // Verifica elementos do chat input
  const chatInput = document.querySelector('.chat-input');
  const messageInput = document.getElementById('texto');
  const messagesContainer = document.querySelector('.messages-container');
  
  console.log('Elementos encontrados:');
  console.log('- chat-input:', !!chatInput);
  console.log('- message-input:', !!messageInput);
  console.log('- messages-container:', !!messagesContainer);
  
  if (chatInput) {
    console.log('Estilos do chat-input:');
    const styles = getComputedStyle(chatInput);
    console.log('- position:', styles.position);
    console.log('- bottom:', styles.bottom);
    console.log('- z-index:', styles.zIndex);
  }
  
  if (messagesContainer) {
    console.log('Estilos do messages-container:');
    const styles = getComputedStyle(messagesContainer);
    console.log('- padding-bottom:', styles.paddingBottom);
    console.log('- height:', styles.height);
    console.log('- overflow-y:', styles.overflowY);
  }
}

// Função para simular abertura do teclado
function simulateKeyboardOpen() {
  console.log('Simulando abertura do teclado...');
  
  // Adiciona a classe manualmente para testar
  document.body.classList.add('keyboard-open');
  
  // Foca no input
  const messageInput = document.getElementById('texto');
  if (messageInput) {
    messageInput.focus();
    console.log('Input focado');
  }
  
  // Verifica se os estilos foram aplicados
  setTimeout(() => {
    testKeyboardDetection();
  }, 100);
}

// Função para simular fechamento do teclado
function simulateKeyboardClose() {
  console.log('Simulando fechamento do teclado...');
  
  // Remove a classe manualmente
  document.body.classList.remove('keyboard-open');
  
  // Remove o foco do input
  const messageInput = document.getElementById('texto');
  if (messageInput) {
    messageInput.blur();
    console.log('Foco removido do input');
  }
  
  // Verifica se os estilos foram removidos
  setTimeout(() => {
    testKeyboardDetection();
  }, 100);
}

// Função para testar viewport
function testViewport() {
  console.log('Informações do viewport:');
  console.log('- window.innerHeight:', window.innerHeight);
  console.log('- window.visualViewport:', !!window.visualViewport);
  
  if (window.visualViewport) {
    console.log('- visualViewport.height:', window.visualViewport.height);
    console.log('- visualViewport.width:', window.visualViewport.width);
  }
  
  console.log('- document.body.classList:', Array.from(document.body.classList));
}

// Função para testar eventos
function testEvents() {
  console.log('Testando eventos...');
  
  // Testa evento de resize
  window.dispatchEvent(new Event('resize'));
  console.log('Evento resize disparado');
  
  // Testa evento de orientationchange
  window.dispatchEvent(new Event('orientationchange'));
  console.log('Evento orientationchange disparado');
  
  // Testa foco no input
  const messageInput = document.getElementById('texto');
  if (messageInput) {
    messageInput.dispatchEvent(new Event('focus'));
    console.log('Evento focus disparado');
    
    setTimeout(() => {
      messageInput.dispatchEvent(new Event('blur'));
      console.log('Evento blur disparado');
    }, 1000);
  }
}

// Executa testes quando a página carrega
function runTests() {
  console.log('Iniciando testes de detecção do teclado virtual...');
  
  testKeyboardDetection();
  testViewport();
  
  // Aguarda um pouco e testa eventos
  setTimeout(() => {
    testEvents();
  }, 2000);
  
  // Aguarda mais um pouco e simula teclado
  setTimeout(() => {
    simulateKeyboardOpen();
  }, 4000);
  
  // Aguarda mais um pouco e simula fechamento
  setTimeout(() => {
    simulateKeyboardClose();
  }, 6000);
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

// Adiciona funções globais para testes manuais
window.testKeyboardDetection = {
  testKeyboardDetection,
  simulateKeyboardOpen,
  simulateKeyboardClose,
  testViewport,
  testEvents,
  runTests
};

console.log('Teste de detecção do teclado virtual carregado. Use window.testKeyboardDetection para testes manuais.'); 
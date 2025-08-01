// Script de teste para navegação mobile
console.log('=== Teste de Navegação Mobile ===');

// Função para testar detecção mobile
function testMobileDetection() {
  console.log('Testando detecção mobile...');
  console.log('Window width:', window.innerWidth);
  console.log('isMobileView:', typeof isMobileView !== 'undefined' ? isMobileView : 'undefined');
  console.log('checkMobileView function:', typeof checkMobileView !== 'undefined' ? 'exists' : 'missing');
  
  if (typeof checkMobileView === 'function') {
    const result = checkMobileView();
    console.log('checkMobileView result:', result);
  }
}

// Função para testar elementos DOM
function testDOMElements() {
  console.log('Testando elementos DOM...');
  
  const elements = {
    chatListSection: document.getElementById('chatListSection'),
    chatAreaSection: document.getElementById('chatAreaSection'),
    backButton: document.getElementById('backButton'),
    mobileTransitionIndicator: document.getElementById('mobileTransitionIndicator')
  };
  
  console.log('Elementos encontrados:', elements);
  
  // Verifica classes CSS
  if (elements.chatListSection) {
    console.log('chatListSection classes:', elements.chatListSection.className);
    console.log('chatListSection transform:', getComputedStyle(elements.chatListSection).transform);
  }
  
  if (elements.chatAreaSection) {
    console.log('chatAreaSection classes:', elements.chatAreaSection.className);
    console.log('chatAreaSection transform:', getComputedStyle(elements.chatAreaSection).transform);
  }
}

// Função para testar navegação
function testNavigation() {
  console.log('Testando navegação...');
  
  if (typeof navigateToChat === 'function') {
    console.log('navigateToChat function exists');
    console.log('Calling navigateToChat...');
    navigateToChat();
  } else {
    console.error('navigateToChat function not found');
  }
  
  if (typeof navigateToChatList === 'function') {
    console.log('navigateToChatList function exists');
  } else {
    console.error('navigateToChatList function not found');
  }
}

// Função para simular clique em contato
function simulateContactClick() {
  console.log('Simulando clique em contato...');
  
  // Procura por elementos de contato
  const contactItems = document.querySelectorAll('.chat-item');
  console.log('Contact items found:', contactItems.length);
  
  if (contactItems.length > 0) {
    const firstContact = contactItems[0];
    console.log('Clicking first contact:', firstContact);
    
    // Simula clique
    firstContact.click();
    
    // Verifica se selecionarContato foi chamada
    setTimeout(() => {
      console.log('After click - contatoSelecionado:', contatoSelecionado);
      console.log('After click - isMobileView:', isMobileView);
      
      // Verifica classes dos elementos
      const chatListSection = document.getElementById('chatListSection');
      const chatAreaSection = document.getElementById('chatAreaSection');
      
      if (chatListSection) {
        console.log('chatListSection classes after click:', chatListSection.className);
      }
      
      if (chatAreaSection) {
        console.log('chatAreaSection classes after click:', chatAreaSection.className);
      }
    }, 1000);
  }
}

// Executa testes
function runTests() {
  console.log('Iniciando testes de navegação mobile...');
  
  testMobileDetection();
  testDOMElements();
  testNavigation();
  
  // Aguarda um pouco e simula clique
  setTimeout(() => {
    simulateContactClick();
  }, 2000);
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

// Adiciona função global para testes manuais
window.testMobileNavigation = {
  testMobileDetection,
  testDOMElements,
  testNavigation,
  simulateContactClick,
  runTests
};

console.log('Teste de navegação mobile carregado. Use window.testMobileNavigation para testes manuais.'); 
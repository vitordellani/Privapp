// Script de teste para verificar controle JavaScript da barra de navegação
console.log('=== Teste JavaScript da Barra de Navegação ===');

// Função para testar o controle da barra de navegação
function testBottomNavControl() {
  console.log('Testando controle da barra de navegação...');
  
  const bottomNav = document.querySelector('.bottom-nav');
  const chatAreaSection = document.querySelector('.chat-area-section');
  
  if (bottomNav) {
    const currentDisplay = getComputedStyle(bottomNav).display;
    console.log('Bottom Nav encontrado:', !!bottomNav);
    console.log('Display atual:', currentDisplay);
    console.log('Função toggleBottomNav existe:', typeof toggleBottomNav === 'function');
  } else {
    console.log('❌ Bottom Nav NÃO encontrado!');
  }
  
  if (chatAreaSection) {
    const hasShowClass = chatAreaSection.classList.contains('show');
    console.log('Chat Area Section encontrado:', !!chatAreaSection);
    console.log('Tem classe "show":', hasShowClass);
  } else {
    console.log('❌ Chat Area Section NÃO encontrado!');
  }
  
  // Verifica se está em mobile
  const isMobile = window.innerWidth <= 768;
  console.log('É mobile:', isMobile);
  console.log('Largura da tela:', window.innerWidth);
}

// Função para testar esconder a barra
function testHideBottomNav() {
  console.log('Testando esconder barra de navegação...');
  
  if (typeof toggleBottomNav === 'function') {
    toggleBottomNav(false);
    console.log('✅ Função toggleBottomNav(false) executada!');
    
    setTimeout(() => {
      const bottomNav = document.querySelector('.bottom-nav');
      if (bottomNav) {
        const display = getComputedStyle(bottomNav).display;
        console.log('Display após esconder:', display);
        console.log('Barra escondida:', display === 'none');
      }
    }, 100);
  } else {
    console.log('❌ Função toggleBottomNav não encontrada!');
  }
}

// Função para testar mostrar a barra
function testShowBottomNav() {
  console.log('Testando mostrar barra de navegação...');
  
  if (typeof toggleBottomNav === 'function') {
    toggleBottomNav(true);
    console.log('✅ Função toggleBottomNav(true) executada!');
    
    setTimeout(() => {
      const bottomNav = document.querySelector('.bottom-nav');
      if (bottomNav) {
        const display = getComputedStyle(bottomNav).display;
        console.log('Display após mostrar:', display);
        console.log('Barra visível:', display === 'flex');
      }
    }, 100);
  } else {
    console.log('❌ Função toggleBottomNav não encontrada!');
  }
}

// Função para simular navegação completa
function testFullNavigation() {
  console.log('Testando navegação completa...');
  
  // Simula navegação para conversa
  if (typeof navigateToChat === 'function') {
    console.log('Executando navigateToChat()...');
    navigateToChat();
    
    setTimeout(() => {
      console.log('Após navigateToChat:');
      testBottomNavControl();
    }, 500);
  } else {
    console.log('❌ Função navigateToChat não encontrada!');
  }
}

// Função para simular retorno à lista
function testBackToChatList() {
  console.log('Testando retorno à lista...');
  
  // Simula retorno à lista
  if (typeof navigateToChatList === 'function') {
    console.log('Executando navigateToChatList()...');
    navigateToChatList();
    
    setTimeout(() => {
      console.log('Após navigateToChatList:');
      testBottomNavControl();
    }, 500);
  } else {
    console.log('❌ Função navigateToChatList não encontrada!');
  }
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(testBottomNavControl, 1000);
  });
} else {
  setTimeout(testBottomNavControl, 1000);
}

// Adiciona funções globais para testes manuais
window.testBottomNavJS = {
  testBottomNavControl,
  testHideBottomNav,
  testShowBottomNav,
  testFullNavigation,
  testBackToChatList
};

console.log('Teste JavaScript da barra de navegação carregado. Use window.testBottomNavJS para testes manuais.'); 
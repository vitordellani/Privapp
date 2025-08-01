// Script de teste para verificar se a barra de navegação está sendo escondida
console.log('=== Teste da Barra de Navegação ===');

// Função para verificar o estado da barra de navegação
function testBottomNavVisibility() {
  console.log('Verificando visibilidade da barra de navegação...');
  
  const bottomNav = document.querySelector('.bottom-nav');
  const chatAreaSection = document.querySelector('.chat-area-section');
  
  if (bottomNav) {
    const styles = getComputedStyle(bottomNav);
    console.log('Bottom Nav encontrado:', !!bottomNav);
    console.log('Display:', styles.display);
    console.log('Visibility:', styles.visibility);
    console.log('Z-index:', styles.zIndex);
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

// Função para simular navegação para conversa
function simulateChatNavigation() {
  console.log('Simulando navegação para conversa...');
  
  const chatAreaSection = document.querySelector('.chat-area-section');
  const chatListSection = document.querySelector('.chat-list-section');
  
  if (chatAreaSection && chatListSection) {
    // Adiciona classe show para simular conversa ativa
    chatAreaSection.classList.add('show');
    chatListSection.classList.add('hidden');
    
    console.log('✅ Navegação para conversa simulada!');
    console.log('Chat Area Section agora tem classe "show"');
    
    // Verifica se a barra de navegação foi escondida
    setTimeout(() => {
      testBottomNavVisibility();
    }, 100);
  } else {
    console.log('❌ Elementos de navegação não encontrados');
  }
}

// Função para simular retorno à lista de conversas
function simulateBackToChatList() {
  console.log('Simulando retorno à lista de conversas...');
  
  const chatAreaSection = document.querySelector('.chat-area-section');
  const chatListSection = document.querySelector('.chat-list-section');
  
  if (chatAreaSection && chatListSection) {
    // Remove classe show para simular retorno à lista
    chatAreaSection.classList.remove('show');
    chatListSection.classList.remove('hidden');
    
    console.log('✅ Retorno à lista de conversas simulado!');
    console.log('Chat Area Section agora NÃO tem classe "show"');
    
    // Verifica se a barra de navegação voltou a aparecer
    setTimeout(() => {
      testBottomNavVisibility();
    }, 100);
  } else {
    console.log('❌ Elementos de navegação não encontrados');
  }
}

// Função para forçar esconder a barra de navegação
function forceHideBottomNav() {
  console.log('Forçando esconder a barra de navegação...');
  
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = 'none';
    console.log('✅ Barra de navegação forçada a esconder!');
  } else {
    console.log('❌ Bottom Nav não encontrado');
  }
}

// Função para forçar mostrar a barra de navegação
function forceShowBottomNav() {
  console.log('Forçando mostrar a barra de navegação...');
  
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    bottomNav.style.display = 'flex';
    console.log('✅ Barra de navegação forçada a mostrar!');
  } else {
    console.log('❌ Bottom Nav não encontrado');
  }
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(testBottomNavVisibility, 1000);
  });
} else {
  setTimeout(testBottomNavVisibility, 1000);
}

// Adiciona funções globais para testes manuais
window.testBottomNav = {
  testBottomNavVisibility,
  simulateChatNavigation,
  simulateBackToChatList,
  forceHideBottomNav,
  forceShowBottomNav
};

console.log('Teste da barra de navegação carregado. Use window.testBottomNav para testes manuais.'); 
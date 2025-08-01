// Script de teste para verificar visibilidade da caixa de texto com teclado virtual
console.log('=== Teste de Visibilidade da Caixa de Texto com Teclado ===');

// Função para verificar se a caixa de texto está visível
function testKeyboardInputVisibility() {
  console.log('Verificando visibilidade da caixa de texto com teclado...');
  
  const chatInput = document.querySelector('.chat-input');
  const messageInput = document.getElementById('texto');
  const body = document.body;
  
  if (chatInput) {
    const styles = getComputedStyle(chatInput);
    const rect = chatInput.getBoundingClientRect();
    
    console.log('Chat Input encontrado:', !!chatInput);
    console.log('Display:', styles.display);
    console.log('Visibility:', styles.visibility);
    console.log('Position:', styles.position);
    console.log('Bottom:', styles.bottom);
    console.log('Transform:', styles.transform);
    console.log('Z-index:', styles.zIndex);
    console.log('Dimensões:', rect.width + 'x' + rect.height);
    console.log('Posição na tela:', rect.top + ', ' + rect.left);
    console.log('Está visível:', rect.width > 0 && rect.height > 0);
  } else {
    console.log('❌ Chat Input NÃO encontrado!');
  }
  
  if (messageInput) {
    console.log('Message Input encontrado:', !!messageInput);
    console.log('Placeholder:', messageInput.placeholder);
    console.log('Value:', messageInput.value);
  } else {
    console.log('❌ Message Input NÃO encontrado!');
  }
  
  // Verifica se o teclado está "aberto"
  const isKeyboardOpen = body.classList.contains('keyboard-open');
  console.log('Teclado virtual aberto:', isKeyboardOpen);
  
  // Verifica se está em mobile
  const isMobile = window.innerWidth <= 768;
  console.log('É mobile:', isMobile);
  console.log('Largura da tela:', window.innerWidth);
  console.log('Altura da tela:', window.innerHeight);
}

// Função para simular abertura do teclado
function simulateKeyboardOpen() {
  console.log('Simulando abertura do teclado virtual...');
  
  const body = document.body;
  body.classList.add('keyboard-open');
  
  console.log('✅ Classe keyboard-open adicionada!');
  
  setTimeout(() => {
    console.log('Após simular abertura do teclado:');
    testKeyboardInputVisibility();
  }, 100);
}

// Função para simular fechamento do teclado
function simulateKeyboardClose() {
  console.log('Simulando fechamento do teclado virtual...');
  
  const body = document.body;
  body.classList.remove('keyboard-open');
  
  console.log('✅ Classe keyboard-open removida!');
  
  setTimeout(() => {
    console.log('Após simular fechamento do teclado:');
    testKeyboardInputVisibility();
  }, 100);
}

// Função para forçar posicionamento da caixa de texto
function forceInputPosition() {
  console.log('Forçando posicionamento da caixa de texto...');
  
  const chatInput = document.querySelector('.chat-input');
  if (chatInput) {
    // Força posicionamento acima do teclado
    chatInput.style.position = 'fixed';
    chatInput.style.bottom = '0';
    chatInput.style.left = '0';
    chatInput.style.right = '0';
    chatInput.style.zIndex = '1000';
    chatInput.style.transform = 'translateY(-40vh)';
    chatInput.style.background = 'white';
    chatInput.style.borderTop = '1px solid #e0e0e0';
    chatInput.style.boxShadow = '0 -2px 10px rgba(0,0,0,0.1)';
    
    console.log('✅ Posicionamento forçado!');
  } else {
    console.log('❌ Chat Input não encontrado');
  }
}

// Função para testar foco no input
function testInputFocus() {
  console.log('Testando foco no input...');
  
  const messageInput = document.getElementById('texto');
  if (messageInput) {
    messageInput.focus();
    messageInput.value = 'teste de digitação';
    console.log('✅ Foco aplicado e texto adicionado!');
  } else {
    console.log('❌ Message Input não encontrado');
  }
}

// Função para verificar viewport
function checkViewport() {
  console.log('Verificando viewport...');
  
  console.log('Visual Viewport:');
  console.log('- Width:', window.visualViewport?.width || 'N/A');
  console.log('- Height:', window.visualViewport?.height || 'N/A');
  console.log('- Scale:', window.visualViewport?.scale || 'N/A');
  
  console.log('Window:');
  console.log('- Inner Width:', window.innerWidth);
  console.log('- Inner Height:', window.innerHeight);
  console.log('- Outer Height:', window.outerHeight);
  
  // Calcula se o teclado está aberto baseado na diferença de altura
  const heightDifference = window.outerHeight - window.innerHeight;
  console.log('Diferença de altura (teclado):', heightDifference);
  console.log('Teclado provavelmente aberto:', heightDifference > 150);
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(testKeyboardInputVisibility, 1000);
  });
} else {
  setTimeout(testKeyboardInputVisibility, 1000);
}

// Adiciona funções globais para testes manuais
window.testKeyboardInput = {
  testKeyboardInputVisibility,
  simulateKeyboardOpen,
  simulateKeyboardClose,
  forceInputPosition,
  testInputFocus,
  checkViewport
};

console.log('Teste de visibilidade da caixa de texto com teclado carregado. Use window.testKeyboardInput para testes manuais.'); 
// Script para ajustar posicionamento da caixa de texto em tempo real
console.log('=== Ajuste de Posicionamento da Caixa de Texto ===');

// Função para ajustar posicionamento
function adjustInputPosition(translateY) {
  console.log(`Ajustando posicionamento para translateY(${translateY})...`);
  
  const chatInput = document.querySelector('.chat-input');
  if (chatInput) {
    chatInput.style.transform = `translateY(${translateY})`;
    console.log(`✅ Posicionamento ajustado para ${translateY}`);
  } else {
    console.log('❌ Chat Input não encontrado');
  }
}

// Função para testar diferentes posições
function testDifferentPositions() {
  console.log('Testando diferentes posições...');
  
  const positions = [
    '-5vh',   // Muito próximo do teclado
    '-8vh',   // Próximo do teclado
    '-10vh',  // Posição atual
    '-12vh',  // Um pouco mais acima
    '-15vh',  // Meio caminho
    '-20vh'   // Mais acima
  ];
  
  let currentIndex = 0;
  
  const testNextPosition = () => {
    if (currentIndex < positions.length) {
      const position = positions[currentIndex];
      console.log(`\n--- Testando posição ${position} ---`);
      adjustInputPosition(position);
      currentIndex++;
      
      // Testa próxima posição após 3 segundos
      setTimeout(testNextPosition, 3000);
    } else {
      console.log('\n✅ Teste de posições concluído!');
    }
  };
  
  testNextPosition();
}

// Função para posicionar logo acima do teclado
function positionAboveKeyboard() {
  console.log('Posicionando logo acima do teclado...');
  adjustInputPosition('-8vh');
}

// Função para posicionar no meio da tela
function positionMiddleScreen() {
  console.log('Posicionando no meio da tela...');
  adjustInputPosition('-40vh');
}

// Função para posicionar no pé da tela
function positionBottomScreen() {
  console.log('Posicionando no pé da tela...');
  adjustInputPosition('0vh');
}

// Função para posicionar muito próximo do teclado
function positionVeryCloseToKeyboard() {
  console.log('Posicionando muito próximo do teclado...');
  adjustInputPosition('-5vh');
}

// Função para verificar posição atual
function checkCurrentPosition() {
  const chatInput = document.querySelector('.chat-input');
  if (chatInput) {
    const transform = getComputedStyle(chatInput).transform;
    console.log('Posição atual:', transform);
    
    // Extrai o valor do translateY
    const matrix = new DOMMatrix(transform);
    const translateY = matrix.m42;
    console.log('TranslateY atual:', translateY + 'px');
  } else {
    console.log('❌ Chat Input não encontrado');
  }
}

// Função para simular teclado aberto e testar posicionamento
function simulateKeyboardAndTest() {
  console.log('Simulando teclado aberto e testando posicionamento...');
  
  const body = document.body;
  body.classList.add('keyboard-open');
  
  setTimeout(() => {
    console.log('Teclado simulado aberto. Testando posições...');
    testDifferentPositions();
  }, 500);
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
      console.log('Script de ajuste de posicionamento carregado!');
    }, 1000);
  });
} else {
  setTimeout(() => {
    console.log('Script de ajuste de posicionamento carregado!');
  }, 1000);
}

// Adiciona funções globais para testes manuais
window.adjustInputPosition = {
  adjustInputPosition,
  testDifferentPositions,
  positionAboveKeyboard,
  positionMiddleScreen,
  positionBottomScreen,
  positionVeryCloseToKeyboard,
  checkCurrentPosition,
  simulateKeyboardAndTest
};

console.log('Ajuste de posicionamento carregado. Use window.adjustInputPosition para testes manuais.');
console.log('Exemplo: window.adjustInputPosition.positionAboveKeyboard()'); 
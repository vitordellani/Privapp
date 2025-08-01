// Script de teste para busca minimizável
console.log('=== Teste de Busca Minimizável ===');

// Função para testar elementos da busca
function testSearchElements() {
  console.log('Testando elementos da busca...');
  
  const elements = {
    searchToggle: document.getElementById('searchToggle'),
    searchMessages: document.getElementById('searchMessages'),
    searchInput: document.getElementById('busca')
  };
  
  console.log('Elementos encontrados:', elements);
  
  // Verifica se a função existe
  if (typeof setupSearchToggle === 'function') {
    console.log('✅ setupSearchToggle function exists');
  } else {
    console.error('❌ setupSearchToggle function not found');
  }
  
  // Verifica classes CSS
  if (elements.searchMessages) {
    console.log('searchMessages classes:', elements.searchMessages.className);
    console.log('searchMessages minimized:', elements.searchMessages.classList.contains('minimized'));
    console.log('Estado inicial esperado: minimizada');
  }
  
  if (elements.searchToggle) {
    console.log('searchToggle title:', elements.searchToggle.title);
    console.log('searchToggle innerHTML:', elements.searchToggle.innerHTML);
  }
}

// Função para simular toggle da busca
function simulateSearchToggle() {
  console.log('Simulando toggle da busca...');
  
  const searchToggle = document.getElementById('searchToggle');
  const searchMessages = document.getElementById('searchMessages');
  
  if (searchToggle && searchMessages) {
    const wasMinimized = searchMessages.classList.contains('minimized');
    
    // Simula clique
    searchToggle.click();
    
    setTimeout(() => {
      const isNowMinimized = searchMessages.classList.contains('minimized');
      console.log('Estado da busca:');
      console.log('- Antes:', wasMinimized ? 'minimizada' : 'expandida');
      console.log('- Depois:', isNowMinimized ? 'minimizada' : 'expandida');
      console.log('- Toggle funcionou:', wasMinimized !== isNowMinimized);
      
      // Verifica estilos
      const styles = getComputedStyle(searchMessages);
      console.log('Estilos do searchMessages:');
      console.log('- padding:', styles.padding);
      console.log('- border-bottom:', styles.borderBottom);
    }, 100);
  } else {
    console.error('Elementos não encontrados para simular toggle');
  }
}

// Função para testar responsividade
function testResponsiveness() {
  console.log('Testando responsividade...');
  
  const searchMessages = document.getElementById('searchMessages');
  const searchToggle = document.getElementById('searchToggle');
  
  if (searchMessages && searchToggle) {
    // Testa em diferentes tamanhos de tela
    const testSizes = [
      { width: 1200, height: 800, name: 'Desktop' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 375, height: 667, name: 'Mobile' },
      { width: 320, height: 568, name: 'Mobile Pequeno' }
    ];
    
    testSizes.forEach(size => {
      // Simula tamanho de tela
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: size.width
      });
      
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: size.height
      });
      
      // Dispara evento resize
      window.dispatchEvent(new Event('resize'));
      
      setTimeout(() => {
        const styles = getComputedStyle(searchMessages);
        console.log(`${size.name} (${size.width}x${size.height}):`);
        console.log('- padding:', styles.padding);
        console.log('- display:', styles.display);
      }, 100);
    });
  }
}

// Função para testar dark mode
function testDarkMode() {
  console.log('Testando dark mode...');
  
  const searchMessages = document.getElementById('searchMessages');
  const searchToggle = document.getElementById('searchToggle');
  
  if (searchMessages && searchToggle) {
    // Verifica se está em dark mode
    const isDarkMode = document.body.classList.contains('darkmode');
    console.log('Dark mode ativo:', isDarkMode);
    
    // Simula toggle do dark mode
    const darkModeToggle = document.getElementById('toggle-darkmode');
    if (darkModeToggle) {
      darkModeToggle.click();
      
      setTimeout(() => {
        const newDarkMode = document.body.classList.contains('darkmode');
        console.log('Dark mode após toggle:', newDarkMode);
        
        // Verifica estilos no dark mode
        const styles = getComputedStyle(searchMessages);
        console.log('Estilos no dark mode:');
        console.log('- background:', styles.background);
        console.log('- border-color:', styles.borderColor);
      }, 100);
    }
  }
}

// Função para testar interação com teclado
function testKeyboardInteraction() {
  console.log('Testando interação com teclado...');
  
  const searchInput = document.getElementById('busca');
  const searchMessages = document.getElementById('searchMessages');
  
  if (searchInput && searchMessages) {
    // Simula foco no input
    searchInput.focus();
    console.log('Input focado');
    
    // Simula digitação
    searchInput.value = 'teste';
    searchInput.dispatchEvent(new Event('input'));
    console.log('Texto digitado:', searchInput.value);
    
    // Verifica se expandiu
    setTimeout(() => {
      const isMinimized = searchMessages.classList.contains('minimized');
      console.log('Busca minimizada após digitação:', isMinimized);
    }, 100);
    
    // Simula blur
    setTimeout(() => {
      searchInput.blur();
      console.log('Foco removido do input');
    }, 500);
  }
}

// Executa testes quando a página carrega
function runTests() {
  console.log('Iniciando testes de busca minimizável...');
  
  testSearchElements();
  
  // Aguarda um pouco e testa toggle
  setTimeout(() => {
    simulateSearchToggle();
  }, 1000);
  
  // Aguarda mais um pouco e testa novamente
  setTimeout(() => {
    simulateSearchToggle();
  }, 2000);
  
  // Testa responsividade
  setTimeout(() => {
    testResponsiveness();
  }, 3000);
  
  // Testa dark mode
  setTimeout(() => {
    testDarkMode();
  }, 4000);
  
  // Testa interação com teclado
  setTimeout(() => {
    testKeyboardInteraction();
  }, 5000);
}

// Executa quando a página carrega
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', runTests);
} else {
  runTests();
}

// Adiciona funções globais para testes manuais
window.testSearchToggle = {
  testSearchElements,
  simulateSearchToggle,
  testResponsiveness,
  testDarkMode,
  testKeyboardInteraction,
  runTests
};

console.log('Teste de busca minimizável carregado. Use window.testSearchToggle para testes manuais.'); 
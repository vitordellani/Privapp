/**
 * API Port Fix - Corrige chamadas para porta 3001
 */

// Intercepta todas as chamadas fetch para redirecionar de 3001 para 3000
const originalFetch = window.fetch;
window.fetch = function(resource, options) {
  // Se a URL contém localhost:3001, substitui por localhost:3000
  if (typeof resource === 'string' && resource.includes('localhost:3001')) {
    resource = resource.replace('localhost:3001', 'localhost:3000');
    console.log('[API Port Fix] Redirecionando chamada para:', resource);
  }
  return originalFetch(resource, options);
};

// Verifica se há algum socket.io configurado para porta 3001 e corrige
document.addEventListener('DOMContentLoaded', function() {
  console.log('[API Port Fix] Verificando configurações de socket.io...');
  
  // Se o socket global já foi inicializado, não faz nada
  if (window.socket && window.socket.io && window.socket.io.uri) {
    const currentUri = window.socket.io.uri;
    if (currentUri.includes('localhost:3001')) {
      console.log('[API Port Fix] Detectada conexão socket.io para porta 3001. Reconectando para porta 3000...');
      window.socket.disconnect();
      window.socket = io('http://localhost:3000');
    }
  }
});

console.log('[API Port Fix] Script de correção de porta carregado.');
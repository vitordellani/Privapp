# Especificação Técnica: Melhorias no Sistema de Badges

## 1. Visão Geral

Este documento detalha as especificações técnicas para implementação das melhorias no sistema de badges de mensagens não lidas, baseado na análise técnica realizada.

## 2. Correções Imediatas (Fase 1)

### 2.1 Redução do Threshold de Visualização

**Arquivo**: `public/js/MessageViewTracker.js`
**Linha**: 14

```javascript
// ANTES
this.viewThreshold = 2000; // 2 segundos

// DEPOIS
this.viewThreshold = 500; // 500ms - mais responsivo
```

**Justificativa**: Reduzir o tempo de espera para marcação como lida, melhorando a responsividade.

### 2.2 Simplificação da Detecção de Chat Aberto (Mobile)

**Arquivo**: `public/js/MessageViewTracker.js`
**Função**: `isChatOpen(chatId)`
**Linha**: 140

```javascript
// IMPLEMENTAÇÃO ATUAL - MUITO RESTRITIVA
isChatOpen(chatId) {
  if (!this.isMobileView) {
    return this.currentChat === chatId;
  }
  
  const chatAreaSection = document.getElementById('chatAreaSection');
  const isVisible = chatAreaSection && chatAreaSection.classList.contains('show');
  const isCurrentChat = this.currentChat === chatId;
  const isWindowFocused = document.hasFocus();
  const isPageVisible = !document.hidden;
  
  return isVisible && isCurrentChat && isWindowFocused && isPageVisible;
}

// NOVA IMPLEMENTAÇÃO - MAIS PERMISSIVA
isChatOpen(chatId) {
  if (!this.isMobileView) {
    return this.currentChat === chatId;
  }
  
  // Mobile: verificação simplificada
  const chatAreaSection = document.getElementById('chatAreaSection');
  const isVisible = chatAreaSection && chatAreaSection.classList.contains('show');
  const isCurrentChat = this.currentChat === chatId;
  
  // Remover verificações de foco que causam problemas
  return isVisible && isCurrentChat;
}
```

### 2.3 Marcação Automática ao Selecionar Contato

**Arquivo**: `public/js/script.js`
**Função**: `selecionarContato(contato)`
**Linha**: 2813

```javascript
// ADICIONAR NO INÍCIO DA FUNÇÃO selecionarContato
function selecionarContato(contato) {
  // NOVA LINHA: Marcação imediata ao selecionar
  if (appState) {
    appState.markChatAsRead(contato);
  } else {
    marcarMensagensComoLidas(contato);
  }
  
  // Atualizar badge imediatamente
  atualizarBadgeContato(contato, 0);
  
  // ... resto do código existente
}
```

### 2.4 Feedback Visual Imediato

**Arquivo**: `public/styles.css`
**Seção**: Badge animations

```css
/* ADICIONAR NOVAS ANIMAÇÕES */
.unread-badge.reading {
  animation: readingPulse 0.3s ease-in-out;
  background: #28a745; /* Verde para indicar leitura */
}

@keyframes readingPulse {
  0% { 
    transform: scale(1); 
    background: #dc3545; 
  }
  50% { 
    transform: scale(1.2); 
    background: #28a745; 
  }
  100% { 
    transform: scale(0); 
    background: #28a745; 
  }
}

.unread-badge.fade-out {
  animation: fadeOut 0.3s ease-out forwards;
}

@keyframes fadeOut {
  0% { 
    opacity: 1; 
    transform: scale(1); 
  }
  100% { 
    opacity: 0; 
    transform: scale(0); 
  }
}
```

**Arquivo**: `public/js/script.js`
**Nova função**: `showReadConfirmation`

```javascript
// ADICIONAR NOVA FUNÇÃO
function showReadConfirmation(chatId) {
  const chatItems = document.querySelectorAll('.chat-item');
  
  chatItems.forEach(item => {
    const nomeElement = item.querySelector('.chat-name-text');
    if (nomeElement && (nomeElement.textContent.includes(chatId) || 
                       getNomeContato(chatId, chatId) === nomeElement.textContent.trim())) {
      
      const badge = item.querySelector('.unread-badge');
      if (badge && !badge.classList.contains('hidden')) {
        // Animação de confirmação
        badge.classList.add('reading');
        
        setTimeout(() => {
          badge.classList.remove('reading');
          badge.classList.add('fade-out');
          
          setTimeout(() => {
            badge.classList.add('hidden');
            badge.classList.remove('fade-out');
          }, 300);
        }, 300);
      }
    }
  });
}
```

## 3. Otimizações (Fase 2)

### 3.1 Cache de Elementos DOM

**Novo arquivo**: `public/js/BadgeManager.js`

```javascript
/**
 * BadgeManager - Gerenciamento Otimizado de Badges
 * Implementa cache de elementos DOM para melhor performance
 */
class BadgeManager {
  constructor() {
    this.chatElementsCache = new Map();
    this.badgeElementsCache = new Map();
    this.setupMutationObserver();
  }
  
  setupMutationObserver() {
    // Observar mudanças no DOM para invalidar cache
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          // Limpar cache quando elementos são adicionados/removidos
          this.clearCache();
        }
      });
    });
    
    const chatList = document.querySelector('.chat-list');
    if (chatList) {
      observer.observe(chatList, { childList: true, subtree: true });
    }
  }
  
  getChatElement(chatId) {
    let element = this.chatElementsCache.get(chatId);
    
    if (!element || !document.contains(element)) {
      // Buscar por data-attribute (mais eficiente)
      element = document.querySelector(`[data-chat-id="${chatId}"]`);
      
      if (!element) {
        // Fallback: buscar por conteúdo
        const chatItems = document.querySelectorAll('.chat-item');
        for (const item of chatItems) {
          const nameElement = item.querySelector('.chat-name-text');
          if (nameElement) {
            const displayedName = nameElement.textContent.trim();
            const contactName = getNomeContato(chatId, chatId);
            
            if (displayedName === contactName || displayedName.includes(chatId)) {
              element = item;
              break;
            }
          }
        }
      }
      
      if (element) {
        this.chatElementsCache.set(chatId, element);
      }
    }
    
    return element;
  }
  
  updateBadge(chatId, count) {
    const chatElement = this.getChatElement(chatId);
    if (!chatElement) return;
    
    const chatNameContainer = chatElement.querySelector('.chat-name');
    if (!chatNameContainer) return;
    
    let badge = chatNameContainer.querySelector('.unread-badge');
    
    if (count > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'unread-badge';
        chatNameContainer.appendChild(badge);
      }
      
      badge.textContent = count;
      badge.classList.remove('hidden', 'fade-out');
      
      // Animação de entrada
      badge.classList.add('pulse');
      setTimeout(() => badge.classList.remove('pulse'), 2000);
      
    } else if (badge) {
      this.animateRemoval(badge);
    }
  }
  
  animateRemoval(badge) {
    badge.classList.add('reading');
    
    setTimeout(() => {
      badge.classList.remove('reading');
      badge.classList.add('fade-out');
      
      setTimeout(() => {
        badge.classList.add('hidden');
        badge.classList.remove('fade-out');
        
        // Remover elemento após animação
        setTimeout(() => {
          if (badge.parentNode) {
            badge.parentNode.removeChild(badge);
          }
        }, 100);
      }, 300);
    }, 300);
  }
  
  clearCache() {
    this.chatElementsCache.clear();
    this.badgeElementsCache.clear();
  }
  
  destroy() {
    this.clearCache();
  }
}

// Instância global
window.badgeManager = new BadgeManager();
```

### 3.2 Marcação Automática por Scroll

**Arquivo**: `public/js/script.js`
**Nova função**: `setupAutoReadOnScroll`

```javascript
// ADICIONAR NOVA FUNÇÃO
function setupAutoReadOnScroll() {
  const messagesContainer = document.querySelector('.messages-container');
  if (!messagesContainer) return;
  
  let scrollTimeout;
  let lastMessageObserver;
  
  // Função para observar a última mensagem
  function observeLastMessage() {
    if (lastMessageObserver) {
      lastMessageObserver.disconnect();
    }
    
    const messages = messagesContainer.querySelectorAll('.message');
    const lastMessage = messages[messages.length - 1];
    
    if (lastMessage && contatoSelecionado) {
      lastMessageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
            // Marcar como lido quando última mensagem está 50% visível
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(() => {
              if (contatoSelecionado) {
                markChatAsReadImmediate(contatoSelecionado);
              }
            }, 500); // Delay para evitar marcação prematura
          }
        });
      }, { 
        threshold: [0.5],
        rootMargin: '0px 0px -50px 0px' // Margem inferior para garantir visibilidade
      });
      
      lastMessageObserver.observe(lastMessage);
    }
  }
  
  // Observar mudanças no container de mensagens
  const messagesObserver = new MutationObserver(() => {
    observeLastMessage();
  });
  
  messagesObserver.observe(messagesContainer, {
    childList: true,
    subtree: true
  });
  
  // Configurar observação inicial
  observeLastMessage();
}

// NOVA FUNÇÃO AUXILIAR
function markChatAsReadImmediate(chatId) {
  console.log('[AutoRead] Marcando chat como lido:', chatId);
  
  if (appState) {
    appState.markChatAsRead(chatId);
  } else {
    marcarMensagensComoLidas(chatId);
  }
  
  // Feedback visual
  if (window.badgeManager) {
    window.badgeManager.updateBadge(chatId, 0);
  } else {
    atualizarBadgeContato(chatId, 0);
  }
  
  // Notificar outros componentes
  if (messageViewTracker) {
    messageViewTracker.markChatAsViewed(chatId, true);
  }
  
  if (notificationManager) {
    notificationManager.markChatAsViewed(chatId);
  }
}
```

### 3.3 Atualização da Inicialização

**Arquivo**: `public/js/script.js`
**Função**: `initializeImprovementSystems`
**Linha**: 445

```javascript
// ATUALIZAR FUNÇÃO EXISTENTE
function initializeImprovementSystems() {
  try {
    console.log('[INIT] Inicializando sistemas de melhoria...');
    
    // Inicializar AppState
    if (!appState) {
      appState = new AppState();
      console.log('[INIT] ✅ AppState inicializado');
    }
    
    // Inicializar MessageViewTracker
    if (!messageViewTracker) {
      messageViewTracker = new MessageViewTracker();
      console.log('[INIT] ✅ MessageViewTracker inicializado');
    }
    
    // Inicializar NotificationManager
    if (!notificationManager) {
      notificationManager = new NotificationManager();
      console.log('[INIT] ✅ NotificationManager inicializado');
    }
    
    // NOVO: Inicializar BadgeManager
    if (!window.badgeManager) {
      window.badgeManager = new BadgeManager();
      console.log('[INIT] ✅ BadgeManager inicializado');
    }
    
    // NOVO: Configurar marcação automática por scroll
    setupAutoReadOnScroll();
    console.log('[INIT] ✅ Auto-read por scroll configurado');
    
    // Configurar eventos de sincronização
    setupSyncEvents();
    
    console.log('[INIT] 🎉 Todos os sistemas inicializados com sucesso');
    
  } catch (error) {
    console.error('[INIT] ❌ Erro ao inicializar sistemas:', error);
  }
}

// NOVA FUNÇÃO
function setupSyncEvents() {
  // Sincronizar BadgeManager com AppState
  document.addEventListener('badge-updated', (event) => {
    const { chatId, count } = event.detail;
    if (window.badgeManager) {
      window.badgeManager.updateBadge(chatId, count);
    }
  });
  
  // Sincronizar com MessageViewTracker
  document.addEventListener('markMessagesAsRead', (event) => {
    const { chatId } = event.detail;
    if (window.badgeManager) {
      window.badgeManager.updateBadge(chatId, 0);
    }
  });
}
```

## 4. Consolidação da Arquitetura (Fase 3)

### 4.1 Sistema Unificado de Estado

**Novo arquivo**: `public/js/UnifiedBadgeManager.js`

```javascript
/**
 * UnifiedBadgeManager - Sistema Unificado de Gerenciamento de Badges
 * Centraliza toda a lógica de badges em um único componente
 */
class UnifiedBadgeManager {
  constructor(appState, messageViewTracker, notificationManager) {
    this.appState = appState;
    this.messageViewTracker = messageViewTracker;
    this.notificationManager = notificationManager;
    this.badgeManager = new BadgeManager();
    
    this.setupEventListeners();
    this.migrateFromLegacySystem();
  }
  
  setupEventListeners() {
    // Escutar eventos de nova mensagem
    document.addEventListener('nova-mensagem', (event) => {
      this.handleNewMessage(event.detail);
    });
    
    // Escutar seleção de contato
    document.addEventListener('contato-selecionado', (event) => {
      this.handleChatSelected(event.detail.chatId);
    });
    
    // Escutar scroll até o final
    document.addEventListener('scroll-to-bottom', (event) => {
      this.handleScrollToBottom(event.detail.chatId);
    });
  }
  
  handleNewMessage(message) {
    const chatId = message.from;
    
    // Verificar se deve mostrar badge
    if (this.shouldShowBadge(chatId, message)) {
      const currentCount = this.appState.getUnreadCount(chatId);
      this.updateBadge(chatId, currentCount + 1);
    }
  }
  
  handleChatSelected(chatId) {
    // Marcar como lido imediatamente
    this.markChatAsRead(chatId);
  }
  
  handleScrollToBottom(chatId) {
    // Marcar como lido quando faz scroll até o final
    this.markChatAsRead(chatId);
  }
  
  shouldShowBadge(chatId, message) {
    // Usar NotificationManager para determinar se deve mostrar badge
    return this.notificationManager.shouldNotify(chatId, message);
  }
  
  markChatAsRead(chatId) {
    console.log('[UnifiedBadgeManager] Marcando chat como lido:', chatId);
    
    // Atualizar AppState
    this.appState.markChatAsRead(chatId);
    
    // Atualizar visual
    this.updateBadge(chatId, 0);
    
    // Notificar outros componentes
    this.messageViewTracker.markChatAsViewed(chatId, true);
    this.notificationManager.markChatAsViewed(chatId);
    
    // Emitir evento para outros listeners
    this.emitEvent('chat-marked-as-read', { chatId });
  }
  
  updateBadge(chatId, count) {
    // Atualizar AppState
    this.appState.updateBadgeCount(chatId, count);
    
    // Atualizar visual
    this.badgeManager.updateBadge(chatId, count);
    
    // Emitir evento
    this.emitEvent('badge-updated', { chatId, count });
  }
  
  getBadgeCount(chatId) {
    return this.appState.getUnreadCount(chatId);
  }
  
  migrateFromLegacySystem() {
    // Migrar dados do sistema legado
    const legacyData = localStorage.getItem('mensagensLidas');
    if (legacyData) {
      try {
        const readMessages = new Set(JSON.parse(legacyData));
        this.appState.migrateLegacyReadStatus(readMessages);
        
        // Limpar dados legados após migração
        localStorage.removeItem('mensagensLidas');
        console.log('[UnifiedBadgeManager] Migração do sistema legado concluída');
      } catch (error) {
        console.error('[UnifiedBadgeManager] Erro na migração:', error);
      }
    }
  }
  
  emitEvent(eventName, detail) {
    const event = new CustomEvent(eventName, { detail });
    document.dispatchEvent(event);
  }
  
  destroy() {
    this.badgeManager.destroy();
  }
}

// Exportar para uso global
window.UnifiedBadgeManager = UnifiedBadgeManager;
```

### 4.2 Atualização do AppState para Suporte à Migração

**Arquivo**: `public/js/AppState.js`
**Adicionar método**: `migrateLegacyReadStatus`

```javascript
// ADICIONAR NO AppState
migrateLegacyReadStatus(legacyReadSet) {
  console.log('[AppState] Iniciando migração de dados legados...');
  
  let migratedCount = 0;
  
  for (const legacyKey of legacyReadSet) {
    // Formato legado: timestamp_from
    const [timestamp, from] = legacyKey.split('_');
    
    // Encontrar mensagem correspondente
    for (const [messageId, message] of this.messages) {
      if (message.timestamp === parseInt(timestamp) && message.from === from) {
        this.markMessageAsRead(messageId, from);
        migratedCount++;
        break;
      }
    }
  }
  
  console.log(`[AppState] Migração concluída: ${migratedCount} mensagens migradas`);
  this.persistState();
}
```

## 5. Testes e Validação

### 5.1 Testes Unitários

**Novo arquivo**: `tests/badge-system-tests.js`

```javascript
/**
 * Testes para o Sistema de Badges
 */

// Teste de marcação imediata
function testImmediateMarkAsRead() {
  console.log('Teste: Marcação imediata ao selecionar contato');
  
  const testChatId = 'test123';
  
  // Simular seleção de contato
  selecionarContato(testChatId);
  
  // Verificar se foi marcado como lido
  setTimeout(() => {
    const badgeCount = appState.getUnreadCount(testChatId);
    console.assert(badgeCount === 0, 'Badge deveria ser 0 após seleção');
    console.log('✅ Teste passou: Marcação imediata');
  }, 100);
}

// Teste de animação de badge
function testBadgeAnimation() {
  console.log('Teste: Animação de remoção de badge');
  
  const testChatId = 'test456';
  
  // Criar badge de teste
  if (window.badgeManager) {
    window.badgeManager.updateBadge(testChatId, 5);
    
    setTimeout(() => {
      // Remover badge
      window.badgeManager.updateBadge(testChatId, 0);
      
      // Verificar se animação foi aplicada
      setTimeout(() => {
        const badge = document.querySelector(`[data-chat-id="${testChatId}"] .unread-badge`);
        console.assert(!badge || badge.classList.contains('hidden'), 'Badge deveria estar oculto');
        console.log('✅ Teste passou: Animação de badge');
      }, 1000);
    }, 500);
  }
}

// Teste de sincronização entre abas
function testCrossBrowserSync() {
  console.log('Teste: Sincronização entre abas');
  
  const testChatId = 'test789';
  
  // Simular broadcast de outra aba
  if (appState.broadcastChannel) {
    appState.broadcastChannel.postMessage({
      type: 'badge-updated',
      data: { chatId: testChatId, count: 0 },
      timestamp: Date.now(),
      source: 'privapp'
    });
    
    setTimeout(() => {
      const badgeCount = appState.getBadgeCount(testChatId);
      console.assert(badgeCount === 0, 'Badge deveria ser sincronizado');
      console.log('✅ Teste passou: Sincronização entre abas');
    }, 200);
  }
}

// Executar testes
function runBadgeTests() {
  console.log('🧪 Iniciando testes do sistema de badges...');
  
  testImmediateMarkAsRead();
  testBadgeAnimation();
  testCrossBrowserSync();
  
  console.log('🎉 Testes concluídos');
}

// Executar testes após inicialização
if (typeof window !== 'undefined') {
  window.runBadgeTests = runBadgeTests;
}
```

### 5.2 Testes de Performance

**Novo arquivo**: `tests/badge-performance-tests.js`

```javascript
/**
 * Testes de Performance para Badges
 */

function measureBadgeUpdatePerformance() {
  console.log('📊 Medindo performance de atualização de badges...');
  
  const iterations = 100;
  const testChatIds = Array.from({length: iterations}, (_, i) => `test_${i}`);
  
  // Teste sem cache
  const startTime1 = performance.now();
  testChatIds.forEach(chatId => {
    atualizarBadgeContato(chatId, Math.floor(Math.random() * 10));
  });
  const endTime1 = performance.now();
  
  console.log(`Sem cache: ${endTime1 - startTime1}ms para ${iterations} atualizações`);
  
  // Teste com BadgeManager (cache)
  if (window.badgeManager) {
    const startTime2 = performance.now();
    testChatIds.forEach(chatId => {
      window.badgeManager.updateBadge(chatId, Math.floor(Math.random() * 10));
    });
    const endTime2 = performance.now();
    
    console.log(`Com cache: ${endTime2 - startTime2}ms para ${iterations} atualizações`);
    console.log(`Melhoria: ${((endTime1 - startTime1) / (endTime2 - startTime2)).toFixed(2)}x mais rápido`);
  }
}

function measureMemoryUsage() {
  console.log('💾 Medindo uso de memória...');
  
  if (performance.memory) {
    const before = performance.memory.usedJSHeapSize;
    
    // Criar muitos badges
    for (let i = 0; i < 1000; i++) {
      if (window.badgeManager) {
        window.badgeManager.updateBadge(`test_memory_${i}`, i % 10);
      }
    }
    
    const after = performance.memory.usedJSHeapSize;
    const increase = after - before;
    
    console.log(`Aumento de memória: ${(increase / 1024 / 1024).toFixed(2)} MB`);
    
    // Limpar cache
    if (window.badgeManager) {
      window.badgeManager.clearCache();
    }
  }
}

// Executar testes de performance
function runPerformanceTests() {
  console.log('⚡ Iniciando testes de performance...');
  
  measureBadgeUpdatePerformance();
  measureMemoryUsage();
  
  console.log('📈 Testes de performance concluídos');
}

if (typeof window !== 'undefined') {
  window.runPerformanceTests = runPerformanceTests;
}
```

## 6. Cronograma de Implementação

### Fase 1 (1-2 dias)
- [ ] Reduzir threshold de visualização
- [ ] Simplificar detecção de chat aberto
- [ ] Implementar marcação automática na seleção
- [ ] Adicionar feedback visual básico

### Fase 2 (3-5 dias)
- [ ] Implementar BadgeManager com cache
- [ ] Configurar marcação automática por scroll
- [ ] Adicionar animações avançadas
- [ ] Implementar testes básicos

### Fase 3 (1-2 semanas)
- [ ] Criar UnifiedBadgeManager
- [ ] Migrar sistema legado
- [ ] Implementar testes completos
- [ ] Documentar nova arquitetura
- [ ] Monitorar performance em produção

## 7. Critérios de Aceitação

### Funcionalidade
- [ ] Badge desaparece com 1 clique máximo
- [ ] Tempo de resposta < 300ms
- [ ] Funciona consistentemente em mobile e desktop
- [ ] Sincronização entre abas funcional

### Performance
- [ ] Melhoria de pelo menos 50% no tempo de atualização
- [ ] Uso de memória estável
- [ ] Sem vazamentos de memória

### Experiência do Usuário
- [ ] Feedback visual claro
- [ ] Animações suaves
- [ ] Comportamento intuitivo
- [ ] Sem necessidade de múltiplos cliques

---

**Documento elaborado por**: Analista de Sistemas Sênior  
**Data**: Janeiro 2025  
**Versão**: 1.0  
**Status**: Especificação Técnica para Implementação
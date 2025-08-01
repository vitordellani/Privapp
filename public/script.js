// --- INÍCIO DO SCRIPT ---

const socket = io('http://localhost:3000');

// Função de logout
function logout() {
  if (confirm('Tem certeza que deseja sair?')) {
    window.location.href = '/logout';
  }
}

// Inicializar sistemas de melhoria
let appState = null;
let messageViewTracker = null;
let notificationManager = null;

// Variáveis globais
let todasMensagens = [];
let contatoSelecionado = null;
let meuNumero = null;
let naoLidas = {}; // { contato: quantidade }
let arquivoSelecionado = null;
let menuMsgAberto = null; // Índice do menu aberto ou null
let ultimoTimestampRenderizado = null;
let groupPhotos = {};
let ultimaRenderizacaoContatos = ''; // Hash para verificar mudanças
let mensagensLidas = new Set(); // Set para rastrear mensagens lidas

// Função para inicializar os sistemas de melhoria
function initializeImprovementSystems() {
  try {
    // Inicializar AppState
    appState = new AppState();
    
    // Inicializar MessageViewTracker
    messageViewTracker = new MessageViewTracker();
    
    // Inicializar NotificationManager
    notificationManager = new NotificationManager();
    
    console.log('[INIT] Sistemas de melhoria inicializados com sucesso');
  } catch (error) {
    console.error('[INIT] Erro ao inicializar sistemas de melhoria:', error);
  }
}

// Variáveis para controle de scroll
let isAutoScrolling = true;
let hasNewMessages = false;
let scrollPosition = 0;
let isUserScrolling = false;

// Variáveis para navegação mobile
let isMobileView = window.innerWidth <= 768;
let currentView = 'chatList'; // 'chatList' ou 'chatArea'

// Sistema de notificações toast
window.showToast = function(message, type = 'info', duration = 3000) {
  // Remove toast anterior se existir
  const existingToast = document.querySelector('.toast-notification');
  if (existingToast) {
    existingToast.remove();
  }
  
  // Cria o toast
  const toast = document.createElement('div');
  toast.className = `toast-notification toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.parentElement.remove()">&times;</button>
    </div>
  `;
  
  // Adiciona ao DOM
  document.body.appendChild(toast);
  
  // Anima a entrada
  setTimeout(() => {
    toast.classList.add('show');
  }, 100);
  
  // Remove automaticamente após o tempo especificado
  setTimeout(() => {
    if (toast.parentElement) {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.remove();
        }
      }, 300);
    }
  }, duration);
};

// Função para scroll suave para o final
function scrollToBottom(smooth = true) {
  const messagesContainer = document.querySelector('.messages-container');
  if (!messagesContainer) return;
  
  const scrollOptions = {
    top: messagesContainer.scrollHeight,
    behavior: smooth ? 'smooth' : 'auto'
  };
  
  messagesContainer.scrollTo(scrollOptions);
  isAutoScrolling = true;
  hasNewMessages = false;
  
  // Atualiza indicadores
  updateScrollIndicators();
}

// Função para verificar se está próximo do final
function isNearBottom(threshold = 100) {
  const messagesContainer = document.querySelector('.messages-container');
  if (!messagesContainer) return true;
  
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer;
  return scrollHeight - scrollTop - clientHeight < threshold;
}

// Função para detectar se é mobile
function checkMobileView() {
  const wasMobile = isMobileView;
  isMobileView = window.innerWidth <= 768;
  
  // Se mudou de desktop para mobile ou vice-versa
  if (wasMobile !== isMobileView) {
    if (isMobileView) {
      // Mudou para mobile - mostra lista de chats
      navigateToChatList();
    } else {
      // Mudou para desktop - reseta layout
      const chatListSection = document.getElementById('chatListSection');
      const chatAreaSection = document.getElementById('chatAreaSection');
      const backButton = document.getElementById('backButton');
      
      if (chatListSection) chatListSection.classList.remove('hidden');
      if (chatAreaSection) chatAreaSection.classList.remove('show');
      if (backButton) backButton.style.display = 'none';
    }
  }
  
  return isMobileView;
}

// Função para controlar visibilidade da barra de navegação
function toggleBottomNav(show) {
  const bottomNav = document.querySelector('.bottom-nav');
  if (bottomNav) {
    if (show) {
      bottomNav.style.display = 'flex';
    } else {
      bottomNav.style.display = 'none';
    }
    console.log('Bottom nav visibility:', show ? 'shown' : 'hidden');
  }
}

// Função para navegar para a área de chat (mobile)
function navigateToChat() {
  if (!isMobileView) return;
  
  const chatListSection = document.getElementById('chatListSection');
  const chatAreaSection = document.getElementById('chatAreaSection');
  const backButton = document.getElementById('backButton');
  const transitionIndicator = document.getElementById('mobileTransitionIndicator');
  
  if (!chatListSection || !chatAreaSection) return;
  
  // Mostra indicador de transição
  if (transitionIndicator) {
    transitionIndicator.classList.add('show');
  }
  
  // Anima a transição
  setTimeout(() => {
    chatListSection.classList.add('hidden');
    chatAreaSection.classList.add('show');
    backButton.style.display = 'flex';
    currentView = 'chatArea';
    
    // Esconde indicador
    if (transitionIndicator) {
      transitionIndicator.classList.remove('show');
    }
    
    // Esconde a barra de navegação na conversa
    toggleBottomNav(false);
    
    // Foca no input de mensagem
    const messageInput = document.getElementById('texto');
    if (messageInput) {
      setTimeout(() => messageInput.focus(), 300);
    }
    
    // Notificar sistemas que o chat foi aberto no mobile
    if (contatoSelecionado) {
      if (messageViewTracker) {
        messageViewTracker.onMobileChatOpened(contatoSelecionado);
      }
      
      if (notificationManager) {
        notificationManager.onMobileChatOpened(contatoSelecionado);
      }
      
      console.log('[navigateToChat] ✅ Sistemas notificados sobre abertura do chat mobile:', contatoSelecionado);
    }
  }, 150);
}

// Função para voltar à lista de chats (mobile)
function navigateToChatList() {
  if (!isMobileView) return;
  
  const chatListSection = document.getElementById('chatListSection');
  const chatAreaSection = document.getElementById('chatAreaSection');
  const backButton = document.getElementById('backButton');
  
  if (!chatListSection || !chatAreaSection) return;
  
  // Remove seleção atual
  contatoSelecionado = null;
  
  // Atualiza header
  const nomeContato = document.getElementById('nomeContato');
  if (nomeContato) {
    nomeContato.textContent = 'Selecione uma conversa';
  }
  
  // Anima a transição
  chatAreaSection.classList.remove('show');
  chatListSection.classList.remove('hidden');
  backButton.style.display = 'none';
  currentView = 'chatList';
  
  // Mostra a barra de navegação na lista de conversas
  toggleBottomNav(true);
  
  // Limpa mensagens
  const mensagensDiv = document.getElementById('mensagens');
  if (mensagensDiv) {
    mensagensDiv.innerHTML = '';
  }
}

// Função para atualizar indicadores de scroll
function updateScrollIndicators() {
  const scrollToBottomBtn = document.getElementById('scrollToBottom');
  const scrollIndicator = document.getElementById('scrollIndicator');
  
  if (!scrollToBottomBtn || !scrollIndicator) return;
  
  const nearBottom = isNearBottom();
  
  // Botão de scroll para baixo
  if (nearBottom) {
    scrollToBottomBtn.classList.remove('show', 'has-new-messages');
  } else {
    scrollToBottomBtn.classList.add('show');
    if (hasNewMessages) {
      scrollToBottomBtn.classList.add('has-new-messages');
    }
  }
  
  // Indicador de novas mensagens
  if (hasNewMessages && !nearBottom) {
    scrollIndicator.classList.add('show');
  } else {
    scrollIndicator.classList.remove('show');
  }
}

// Função para detectar scroll do usuário
function handleUserScroll() {
  const messagesContainer = document.querySelector('.messages-container');
  if (!messagesContainer) return;
  
  const currentPosition = messagesContainer.scrollTop;
  const isScrollingUp = currentPosition < scrollPosition;
  
  // Se o usuário está scrollando para cima, desabilita auto-scroll
  if (isScrollingUp && isAutoScrolling) {
    isAutoScrolling = false;
  }
  
  // Se chegou próximo do final, reabilita auto-scroll
  if (isNearBottom(50)) {
    isAutoScrolling = true;
    hasNewMessages = false;
    
    // Marca mensagens como lidas quando chega perto do final
    if (contatoSelecionado) {
      marcarMensagensComoLidas(contatoSelecionado);
      atualizarBadgeContato(contatoSelecionado, 0);
    }
  }
  
  scrollPosition = currentPosition;
  updateScrollIndicators();
}

// Função para gerar hash dos contatos para verificar mudanças
function gerarHashContatos(contatos) {
  return JSON.stringify(contatos).length + '_' + Object.keys(contatos).length;
}

// Função para marcar mensagens como lidas
function marcarMensagensComoLidas(contato) {
  const mensagensContato = todasMensagens.filter(m => 
    (m.from === contato || m.to === contato) && !m.fromMe
  );
  
  mensagensContato.forEach(msg => {
    if (!msg.lida) {
      msg.lida = true;
      mensagensLidas.add(msg.timestamp + '_' + msg.from);
    }
  });
  
  // Salva no localStorage para persistir
  localStorage.setItem('mensagensLidas', JSON.stringify(Array.from(mensagensLidas)));
  
  // Atualiza o contador de não lidas
  naoLidas[contato] = 0;
  
  // Atualiza visualmente o badge
  atualizarBadgeContato(contato, 0);
}

// Função para atualizar badge de um contato específico
function atualizarBadgeContato(contato, quantidade) {
  const chatItems = document.querySelectorAll('.chat-item');
  chatItems.forEach(item => {
    const nomeElement = item.querySelector('.chat-name-text');
    if (nomeElement && nomeElement.textContent.includes(contato)) {
      const chatNameContainer = item.querySelector('.chat-name');
      let badge = chatNameContainer.querySelector('.unread-badge');
      
      if (quantidade > 0) {
        if (!badge) {
          badge = document.createElement('div');
          badge.className = 'unread-badge';
          chatNameContainer.appendChild(badge);
        }
        badge.textContent = quantidade;
        badge.classList.remove('hidden');
      } else if (badge) {
        badge.classList.add('hidden');
        setTimeout(() => {
          if (badge && badge.classList.contains('hidden')) {
            badge.remove();
          }
        }, 300);
      }
    }
  });
}

// Função para contar mensagens não lidas de um contato
function contarMensagensNaoLidas(contato) {
  return todasMensagens.filter(m => 
    (m.from === contato || m.to === contato) && 
    !m.fromMe && 
    !m.lida
  ).length;
}

// Carrega mensagens lidas do localStorage
function carregarMensagensLidas() {
  const lidas = localStorage.getItem('mensagensLidas');
  if (lidas) {
    mensagensLidas = new Set(JSON.parse(lidas));
  }
}

// Descobre o número do bot (usuário atual)
function carregarMensagens() {
  fetch('/api/messages').then(r => r.json()).then(msgs => {
    todasMensagens = msgs;
    
    // Usar AppState se disponível
    if (appState) {
      appState.setMessages(msgs);
      
      // Marca mensagens como lidas baseado no AppState
      todasMensagens.forEach(msg => {
        if (appState.isMessageRead(msg.id)) {
          msg.lida = true;
        }
      });
    } else {
      // Fallback para sistema antigo
      todasMensagens.forEach(msg => {
        if (mensagensLidas.has(msg.timestamp + '_' + msg.from)) {
          msg.lida = true;
        }
      });
    }
    
    // Descobre o número do bot pela primeira mensagem enviada (fromMe === true)
    let enviada = msgs.find(m => m.fromMe === true && m.from);
    if (enviada) {
      meuNumero = enviada.from;
    } else {
      // fallback: pega a primeira mensagem recebida (fromMe === false) e usa o campo 'to'
      let recebida = msgs.find(m => m.fromMe === false && m.to);
      if (recebida) {
        meuNumero = recebida.to;
      } else {
        meuNumero = null;
      }
    }
    console.log('[carregarMensagens] meuNumero definido como:', meuNumero);
    renderContatos();
    renderMensagens(safeGet('busca').value);
    
    // ADICIONAR ESTA LINHA:
    setTimeout(() => {
      atualizarAvataresMensagens();
    }, 500);
  });
}

// Carrega mensagens lidas e inicia
carregarMensagensLidas();
carregarMensagens();

// Inicializar sistemas de melhoria após carregar mensagens
setTimeout(() => {
  initializeImprovementSystems();
}, 1000);

// Atualização automática a cada 1 segundo
setInterval(() => {
  fetch('/api/messages').then(r => r.json()).then(msgs => {
    const contatosAnteriores = gerarHashContatos(todasMensagens);
    
    // Verifica se há novas mensagens antes de atualizar
    const mensagensNovas = msgs.filter(msg => 
      !todasMensagens.some(existing => 
        existing.id === msg.id || 
        (existing.timestamp === msg.timestamp && existing.from === msg.from)
      )
    );
    
    // Só atualiza se houver mensagens realmente novas
    if (mensagensNovas.length > 0) {
      console.log(`[FRONTEND] ${mensagensNovas.length} novas mensagens encontradas`);
      todasMensagens = msgs;
      
      // Marca mensagens como lidas baseado no localStorage
      todasMensagens.forEach(msg => {
        if (mensagensLidas.has(msg.timestamp + '_' + msg.from)) {
          msg.lida = true;
        }
      });
      
      // Atualiza badges de mensagens não lidas para todos os contatos
      const contatos = {};
      todasMensagens.forEach(m => {
        const contato = m.fromMe ? m.to : m.from;
        if (!contatos[contato]) contatos[contato] = [];
        contatos[contato].push(m);
      });
      
      Object.keys(contatos).forEach(contato => {
        const mensagensNaoLidas = contarMensagensNaoLidas(contato);
        
        // Se a conversa está aberta, não mostra badge
        if (contato === contatoSelecionado) {
          atualizarBadgeContato(contato, 0);
        } else {
          atualizarBadgeContato(contato, mensagensNaoLidas);
        }
      });
      
      const contatosAtuais = gerarHashContatos(todasMensagens);
      
      // Só re-renderiza se houve mudanças
      if (contatosAnteriores !== contatosAtuais) {
        renderContatos();
      }
      
      adicionarNovasMensagens();
    }
  });
}, 1000);

// Carrega fotos de grupos
fetch('/groupPhotos.json')
  .then(r => r.json())
  .then(data => { 
    groupPhotos = data; 
    renderContatos(); 
  });

// Função para gerar inicial do nome
function getInitial(name) {
  if (!name) return '?';
  return name.charAt(0).toUpperCase();
}

// Função para formatar tempo relativo
function formatRelativeTime(timestamp) {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInHours = (now - date) / (1000 * 60 * 60);
  
  if (diffInHours < 24) {
    return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  } else if (diffInHours < 48) {
    return 'Yesterday';
  } else if (diffInHours < 168) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
  } else {
    return date.toLocaleDateString();
  }
}

// Renderiza lista de conversas
function renderContatos() {
  const contatos = {};
  todasMensagens.forEach(m => {
    const contato = m.fromMe ? m.to : m.from;
    if (!contatos[contato]) contatos[contato] = [];
    contatos[contato].push(m);
  });
  
  const lista = Object.keys(contatos)
    .sort((a, b) => {
      const ultimaA = contatos[a].reduce((x, y) => x.timestamp > y.timestamp ? x : y);
      const ultimaB = contatos[b].reduce((x, y) => x.timestamp > y.timestamp ? x : y);
      return ultimaB.timestamp - ultimaA.timestamp;
    });
  
  const container = safeGet('listaContatos');
  if (!container) return;
  
  // Gera hash atual para comparação
  const hashAtual = gerarHashContatos(contatos);
  if (ultimaRenderizacaoContatos === hashAtual) {
    return; // Não re-renderiza se não houve mudanças
  }
  
  ultimaRenderizacaoContatos = hashAtual;
  container.innerHTML = '';
  
  lista.forEach(contato => {
    const msgsContato = contatos[contato];
    const isGroup = contato.endsWith('@g.us');

    // Nome
    let nome;
    if (isGroup) {
      const ultimaRecebidaComNome = msgsContato
        .filter(m => !m.fromMe && m.groupName)
        .slice(-1)[0];
      nome = (ultimaRecebidaComNome && ultimaRecebidaComNome.groupName)
        || (groupPhotos[contato]?.name)
        || contato;
    } else {
      const ultimaRecebidaComNome = msgsContato
        .filter(m => !m.fromMe && m.senderName)
        .slice(-1)[0];
      nome = getNomeContato(contato, (ultimaRecebidaComNome && ultimaRecebidaComNome.senderName) || contato);
    }

    // Avatar
    let avatar;
    if (isGroup) {
      if (groupPhotos[contato]) {
        avatar = `<img src="${groupPhotos[contato]}" alt="${nome}" class="chat-avatar">`;
      } else {
        avatar = `<div class="chat-avatar">👥</div>`;
      }
    } else {
      const ultimaRecebidaComFoto = msgsContato
        .filter(m => !m.fromMe && m.photoUrl)
        .slice(-1)[0];
      if (ultimaRecebidaComFoto && ultimaRecebidaComFoto.photoUrl) {
        avatar = `<img src="${ultimaRecebidaComFoto.photoUrl}" alt="${nome}" class="chat-avatar">`;
      } else {
        avatar = `<div class="chat-avatar">${getInitial(nome)}</div>`;
      }
    }

    // Status (simulado - você pode integrar com dados reais)
    const status = Math.random() > 0.7 ? 'online' : 'offline';
    const statusIndicator = `<div class="status-indicator ${status}"></div>`;

    // Mensagem e horário mais recente
    const msgMaisRecente = msgsContato.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const horario = msgMaisRecente.timestamp ? formatRelativeTime(msgMaisRecente.timestamp) : '';
    const ultimaMensagem = msgMaisRecente.body ? msgMaisRecente.body.substring(0, 30) : '[Mídia]';

    // Conta mensagens não lidas
    const mensagensNaoLidas = contarMensagensNaoLidas(contato);
    const badgeNaoLidas = mensagensNaoLidas > 0 ? `<div class="unread-badge">${mensagensNaoLidas}</div>` : '';

    // Indicador de digitação (simulado)
    const isTyping = Math.random() > 0.95;
    const typingIndicator = isTyping ? `
      <div class="typing-indicator">
        <span>Digitando</span>
        <div class="typing-dots">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    ` : '';

    const chatItem = document.createElement('div');
    chatItem.className = 'chat-item';
    if (contatoSelecionado === contato) {
      chatItem.classList.add('active');
    }
    chatItem.onclick = () => selecionarContato(contato);

    chatItem.innerHTML = `
      <div class="chat-avatar">
        ${avatar.replace('class="chat-avatar"', '')}
        ${statusIndicator}
      </div>
      <div class="chat-info">
        <div class="chat-name">
          <span class="chat-name-text">${nome}</span>
          ${badgeNaoLidas}
        </div>
        <div class="chat-last-message">
          ${isTyping ? typingIndicator : ultimaMensagem}
        </div>
      </div>
      <div class="chat-time">${horario}</div>
      <button class="btn-edit" onclick="event.stopPropagation(); editarContato('${contato}', '${nome}')">✎</button>
    `;

    container.appendChild(chatItem);
  });
}

// Função para editar contato
function editarContato(contato, nome) {
  safeGet('numeroContato').value = contato;
  safeGet('nomeContatoModal').value = nome;
  const nomeSom = localStorage.getItem('notificacao_audio_nome_' + contato);
  safeGet('nomeSomSelecionado').textContent = nomeSom ? `Selecionado: ${nomeSom}` : 'Nenhum som selecionado';
  safeGet('inputSomNotificacao').value = '';
  const continua = localStorage.getItem('notificacao_continua_' + contato) === 'on';
  safeGet('toggleNotificacaoContinua').checked = continua;
  const modal = new bootstrap.Modal(safeGet('modalContato'));
  modal.show();
}

// Função para atualizar header do chat
function atualizarHeaderChat(contato) {
  if (!contato) {
    safeGet('nomeContato').textContent = 'Selecione uma conversa';
    return;
  }

  const msgsContato = todasMensagens.filter(m => 
    (m.from === contato || m.to === contato)
  );
  
  const isGroup = contato.endsWith('@g.us');
  
  // Nome
  let nome;
  if (isGroup) {
    const ultimaRecebidaComNome = msgsContato
      .filter(m => !m.fromMe && m.groupName)
      .slice(-1)[0];
    nome = (ultimaRecebidaComNome && ultimaRecebidaComNome.groupName)
      || (groupPhotos[contato]?.name)
      || contato;
  } else {
    const ultimaRecebidaComNome = msgsContato
      .filter(m => !m.fromMe && m.senderName)
      .slice(-1)[0];
    nome = getNomeContato(contato, (ultimaRecebidaComNome && ultimaRecebidaComNome.senderName) || contato);
  }

  // Avatar
  let avatar;
  if (isGroup) {
    if (groupPhotos[contato]) {
      avatar = `<img src="${groupPhotos[contato]}" alt="${nome}">`;
    } else {
      avatar = `<div>👥</div>`;
    }
  } else {
    const ultimaRecebidaComFoto = msgsContato
      .filter(m => !m.fromMe && m.photoUrl)
      .slice(-1)[0];
    if (ultimaRecebidaComFoto && ultimaRecebidaComFoto.photoUrl) {
      avatar = `<img src="${ultimaRecebidaComFoto.photoUrl}" alt="${nome}">`;
    } else {
      avatar = `<div>${getInitial(nome)}</div>`;
    }
  }

  // Status (simulado)
  const status = Math.random() > 0.7 ? 'online' : 'offline';
  const statusText = status === 'online' ? 'online' : 'visto por último às 14:30';

  // Atualiza o header
  const chatHeader = document.querySelector('.chat-header');
  if (chatHeader) {
    chatHeader.innerHTML = `
      <div class="chat-header-avatar">
        ${avatar}
      </div>
      <div class="chat-header-info">
        <h4 class="chat-title">${nome}</h4>
        <p class="chat-subtitle">${statusText}</p>
      </div>
    `;
  }
}

  // Navegação por abas
  document.addEventListener('DOMContentLoaded', function() {
    // Inicializa visibilidade da barra de navegação
    checkMobileView();
    if (isMobileView) {
      toggleBottomNav(true); // Mostra na lista de conversas
    }
    
    const navItems = document.querySelectorAll('.nav-item');
  
  navItems.forEach(item => {
    item.addEventListener('click', function() {
      const targetSection = this.getAttribute('data-section');
      
      // Remove active de todos os itens
      navItems.forEach(nav => nav.classList.remove('active'));
      
      // Adiciona active ao item clicado
      this.classList.add('active');
      
      // Mostra/esconde seções
      if (targetSection === 'chatListSection') {
        document.getElementById('chatListSection').style.display = 'flex';
        document.getElementById('chatAreaSection').style.display = 'flex';
      } else if (targetSection === 'contactsSection') {
        document.getElementById('chatListSection').style.display = 'none';
        document.getElementById('chatAreaSection').style.display = 'flex';
        // Aqui você pode adicionar lógica para mostrar uma lista de contatos
        safeGet('nomeContato').textContent = 'Contatos';
      }
    });
  });

  // Botão de scroll para baixo
  const scrollToBottomBtn = document.getElementById('scrollToBottom');
  const messagesContainer = document.querySelector('.messages-container');
  const scrollIndicator = document.getElementById('scrollIndicator');
  
  if (scrollToBottomBtn && messagesContainer && scrollIndicator) {
    scrollToBottomBtn.addEventListener('click', function() {
      scrollToBottom(false);
      // Marca mensagens como lidas quando vai para o final
      if (contatoSelecionado) {
        marcarMensagensComoLidas(contatoSelecionado);
      }
    });

    // Mostra/esconde o botão baseado no scroll
    messagesContainer.addEventListener('scroll', function() {
      handleUserScroll();
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', function(e) {
    // Ctrl+Enter para enviar mensagem
    if (e.ctrlKey && e.key === 'Enter') {
      const messageInput = document.getElementById('texto');
      if (messageInput && document.activeElement === messageInput) {
        e.preventDefault();
        document.getElementById('formEnvio').dispatchEvent(new Event('submit'));
      }
    }

    // Escape para fechar modais
    if (e.key === 'Escape') {
      const modals = document.querySelectorAll('.modal.show');
      modals.forEach(modal => {
        const modalInstance = bootstrap.Modal.getInstance(modal);
        if (modalInstance) {
          modalInstance.hide();
        }
      });
    }
  });

  // Toast notifications
  window.showToast = function(message, type = 'info') {
    const toastContainer = document.querySelector('.toast-container') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span>${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" style="background: none; border: none; color: #666; cursor: pointer; font-size: 18px;">×</button>
      </div>
    `;
    
    toastContainer.appendChild(toast);
    
    // Remove automaticamente após 5 segundos
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
  };

  function createToastContainer() {
    const container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
    return container;
  }

  // Empty state para quando não há conversas
  function checkEmptyState() {
    const chatList = document.getElementById('listaContatos');
    if (chatList && chatList.children.length === 0) {
      chatList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">💬</div>
          <div class="empty-state-title">Nenhuma conversa encontrada</div>
          <div class="empty-state-description">
            Adicione um contato para começar a conversar
          </div>
        </div>
      `;
    }
  }

  // Verifica estado vazio periodicamente
  setInterval(checkEmptyState, 5000);
  checkEmptyState();
  
  // Inicializa detecção mobile
  checkMobileView();
  
  // Configura navegação mobile
  setupMobileNavigation();
  
  // Configura detecção do teclado virtual
  setupKeyboardDetection();
  
  // Configura busca minimizável
  setupSearchToggle();
  
  // Configura detecção de mudança de tamanho da tela
  window.addEventListener('resize', function() {
    checkMobileView();
  });
});

// Configura navegação mobile
function setupMobileNavigation() {
  const backButton = document.getElementById('backButton');
  if (backButton) {
    backButton.addEventListener('click', navigateToChatList);
  }
  
  // Configura navegação por gestos (swipe)
  let startX = 0;
  let startY = 0;
  let isDragging = false;
  
  const chatAreaSection = document.getElementById('chatAreaSection');
  if (chatAreaSection && isMobileView) {
    chatAreaSection.addEventListener('touchstart', function(e) {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isDragging = false;
    });
    
    chatAreaSection.addEventListener('touchmove', function(e) {
      if (!startX || !startY) return;
      
      const deltaX = e.touches[0].clientX - startX;
      const deltaY = e.touches[0].clientY - startY;
      
      // Detecta se é um swipe horizontal
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
        isDragging = true;
        e.preventDefault();
      }
    });
    
    chatAreaSection.addEventListener('touchend', function(e) {
      if (!isDragging) return;
      
      const deltaX = e.changedTouches[0].clientX - startX;
      
      // Swipe da direita para esquerda (voltar)
      if (deltaX > 100) {
        navigateToChatList();
      }
      
      startX = 0;
      startY = 0;
      isDragging = false;
    });
  }
}

// Configura detecção do teclado virtual
function setupKeyboardDetection() {
  let initialViewportHeight = window.innerHeight;
  let keyboardOpen = false;
  
  // Função para detectar mudanças na altura da viewport
  function handleViewportChange() {
    const currentHeight = window.innerHeight;
    const heightDifference = initialViewportHeight - currentHeight;
    
    // Se a altura diminuiu significativamente, provavelmente o teclado abriu
    if (heightDifference > 150 && !keyboardOpen) {
      keyboardOpen = true;
      document.body.classList.add('keyboard-open');
      console.log('Teclado virtual detectado - ajustando layout');
      
      // Foca no input de mensagem
      const messageInput = document.getElementById('texto');
      if (messageInput) {
        setTimeout(() => {
          messageInput.focus();
        }, 100);
      }
    }
    // Se a altura voltou ao normal, o teclado fechou
    else if (heightDifference < 50 && keyboardOpen) {
      keyboardOpen = false;
      document.body.classList.remove('keyboard-open');
      console.log('Teclado virtual fechado - restaurando layout');
    }
  }
  
  // Detecta mudanças na orientação da tela
  window.addEventListener('orientationchange', function() {
    setTimeout(() => {
      initialViewportHeight = window.innerHeight;
      handleViewportChange();
    }, 500);
  });
  
  // Detecta mudanças no resize da janela
  window.addEventListener('resize', function() {
    handleViewportChange();
  });
  
  // Detecta quando o input recebe foco (pode abrir o teclado)
  const messageInput = document.getElementById('texto');
  if (messageInput) {
    messageInput.addEventListener('focus', function() {
      setTimeout(() => {
        handleViewportChange();
      }, 300);
    });
    
    messageInput.addEventListener('blur', function() {
      setTimeout(() => {
        handleViewportChange();
      }, 300);
    });
  }
  
  // Detecta mudanças na altura da viewport usando visualViewport (mais preciso)
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function() {
      const heightDifference = initialViewportHeight - window.visualViewport.height;
      
      if (heightDifference > 150 && !keyboardOpen) {
        keyboardOpen = true;
        document.body.classList.add('keyboard-open');
        console.log('Teclado virtual detectado via visualViewport');
      }
      else if (heightDifference < 50 && keyboardOpen) {
        keyboardOpen = false;
        document.body.classList.remove('keyboard-open');
        console.log('Teclado virtual fechado via visualViewport');
      }
    });
  }
}

// Configura busca minimizável
function setupSearchToggle() {
  const searchToggle = document.getElementById('searchToggle');
  const searchMessages = document.getElementById('searchMessages');
  const searchInput = document.getElementById('busca');
  
  if (searchToggle && searchMessages) {
    searchToggle.addEventListener('click', function() {
      const isMinimized = searchMessages.classList.contains('minimized');
      
      if (isMinimized) {
        // Expandir busca
        searchMessages.classList.remove('minimized');
        searchToggle.title = 'Minimizar busca';
        
        // Foca no input após expandir
        setTimeout(() => {
          if (searchInput) {
            searchInput.focus();
          }
        }, 300);
        
        console.log('Busca expandida');
      } else {
        // Minimizar busca
        searchMessages.classList.add('minimized');
        searchToggle.title = 'Expandir busca';
        
        // Limpa o input quando minimizar
        if (searchInput) {
          searchInput.value = '';
          // Remove filtro das mensagens
          renderMensagens('');
        }
        
        console.log('Busca minimizada');
      }
    });
    
    // Inicializa sempre minimizada
    searchMessages.classList.add('minimized');
    searchToggle.title = 'Expandir busca';
    
    console.log('Busca inicializada como minimizada');
  }
}

// Renderiza mensagens
function renderMensagens(filtro = '') {
  const mensagensDiv = safeGet('mensagens');
  const messagesContainer = mensagensDiv.parentElement;
  
  // Salva a posição atual do scroll antes de limpar
  const scrollTop = messagesContainer ? messagesContainer.scrollTop : 0;
  const scrollHeight = messagesContainer ? messagesContainer.scrollHeight : 0;
  const clientHeight = messagesContainer ? messagesContainer.clientHeight : 0;
  const wasAtBottom = scrollHeight - scrollTop - clientHeight < 50;
  
  mensagensDiv.innerHTML = '';
  if (!contatoSelecionado) return;
  let msgs = todasMensagens.filter(m => {
    // NÃO renderiza mensagens locais de mídia (from==null && id==null && mediaFilename)
    if (m.mediaFilename && !m.from && !m.id) return false;
    return (m.from === contatoSelecionado || m.to === contatoSelecionado);
  });
  if (filtro) {
    msgs = msgs.filter(m => (m.body||'').toLowerCase().includes(filtro.toLowerCase()));
  }
  const isGroup = contatoSelecionado.endsWith('@g.us');
  const menuAbertoAnterior = menuMsgAberto;
  menuMsgAberto = null;
  msgs.forEach((msg, idx) => {
    let midiaHtml = '';
    if (msg.mediaFilename && msg.mimetype) {
      const mediaUrl = `/media/${msg.mediaFilename}`;
      if (msg.mimetype.startsWith('image/')) {
        midiaHtml = `<br>
          <img src="${mediaUrl}" style="max-width:200px;max-height:200px;cursor:pointer;" onclick="abrirImgModal('${mediaUrl}')">
          <br>
          <button type="button" class="btn btn-sm btn-outline-primary mt-1" onclick="abrirImgModal('${mediaUrl}')">Visualizar imagem</button>
        `;
      } else if (msg.mimetype.startsWith('video/')) {
        midiaHtml = `<br><video controls><source src="${mediaUrl}" type="${msg.mimetype}"></video>`;
      } else if (msg.mimetype.startsWith('audio/')) {
        midiaHtml = `<br><audio controls><source src="${mediaUrl}" type="${msg.mimetype}"></audio>`;
      } else if (msg.mimetype === 'application/pdf') {
        midiaHtml = `
          <div style="display:flex;align-items:center;gap:10px;">
            <span style="font-size:2em;color:#d32f2f;">📄</span>
            <div>
              <div><b>${msg.mediaFilename}</b></div>
              <button type="button" class="btn btn-sm btn-outline-primary mt-1" onclick="abrirPdfModal('${mediaUrl}')">Visualizar PDF</button>
              <a href="${mediaUrl}" download class="btn btn-sm btn-outline-secondary mt-1">Baixar</a>
            </div>
          </div>
          <div class="mt-2" style="max-width:180px;max-height:220px;">
            <embed src="${mediaUrl}#toolbar=0&navpanes=0&scrollbar=0" type="application/pdf" width="100%" height="180px"/>
          </div>
        `;
      } else {
        midiaHtml = `<br><a href="${mediaUrl}" download>Baixar arquivo</a>`;
      }
    }
    const enviada = msg.fromMe || (meuNumero && msg.from === meuNumero);
    
    // Assinatura do usuário para mensagens enviadas (sem asteriscos na interface)
    let assinatura = '';
    if (enviada && msg.userName) {
      assinatura = `<div class="user-signature">${msg.userName}</div>`;
    } else if (enviada && !msg.userName) {
      // Para mensagens antigas sem userName, buscar o nome real do usuário
      assinatura = `<div class="user-signature" id="assinatura-${msg.timestamp}">Carregando...</div>`;
      // Buscar o nome do usuário de forma assíncrona
      buscarNomeUsuario(msg.timestamp);
    }
    
    const nomeRemetente = isGroup
      ? `<span style="font-size:0.85em;color:#888;">${getNomeContato(msg.senderName || msg.author || msg.from || '')}</span><br>`
      : '';
    const fotoMsg = msg.photoUrl
      ? `<img src="${msg.photoUrl}" class="rounded-circle me-2" style="width:28px;height:28px;object-fit:cover;vertical-align:top;">`
      : `<span class="rounded-circle bg-secondary d-inline-block me-2" style="width:28px;height:28px;text-align:center;line-height:28px;color:#fff;vertical-align:top;">👤</span>`;

    const optionsBtnId = `msg-options-btn-${idx}`;
    const optionsMenuId = `msg-options-menu-${idx}`;
    const recebidaPrivada = !isGroup && !enviada;
    const optionsBtn = `
      <button class="msg-options-btn${recebidaPrivada ? ' left' : ''}" id="${optionsBtnId}" title="Mais opções" type="button">⋮</button>
      <div class="msg-options-menu" id="${optionsMenuId}">
        <button type="button" onclick="responderMensagem(${msg.timestamp})">
          <span class="icon">↩️</span>
          Responder
        </button>
        <button type="button" onclick="encaminharMensagem(${msg.timestamp})">
          <span class="icon">↗️</span>
          Encaminhar
        </button>
        <button type="button" onclick="copiarTextoMensagem(${msg.timestamp})">
          <span class="icon">📋</span>
          Copiar texto
        </button>
        <button type="button" onclick="alternarSelecaoMensagem(${msg.timestamp})">
          <span class="icon">☑️</span>
          Selecionar
        </button>
        ${msg.sent ? `<button type="button" onclick="deletarMensagem(${msg.timestamp})">
          <span class="icon">🗑️</span>
          Deletar
        </button>` : ''}
        <button type="button" onclick="mostrarInfoMensagem(${msg.timestamp})">
          <span class="icon">ℹ️</span>
          Informações
        </button>
      </div>
    `;

    const reactions = msg.reactions || [];
    const grouped = {};
    reactions.forEach(r => {
      if (!grouped[r.emoji]) grouped[r.emoji] = [];
      grouped[r.emoji].push(r.user);
    });
    let reactionsHtml = '<div class="msg-reactions">';
    Object.entries(grouped).forEach(([emoji, users]) => {
      reactionsHtml += `<span class="reaction">${emoji} ${users.length}</span>`;
    });
    reactionsHtml += `<button class="btn-reagir" data-timestamp="${msg.timestamp}">+</button></div>`;

    // Status de entrega (simulado)
    const deliveryStatus = enviada ? `
      <div class="delivery-status ${Math.random() > 0.5 ? 'read' : 'delivered'}">
        <span class="status-icon">${Math.random() > 0.5 ? '✓✓' : '✓'}</span>
      </div>
    ` : '';

    // HTML para resposta (se esta mensagem é uma resposta)
    let replyHtml = '';
    if (msg.replyTo) {
      const replyBody = msg.replyTo.body || '[Mídia]';
      const replySender = msg.replyTo.senderName || 'Desconhecido';
      replyHtml = `
        <div class="reply-reference" style="background: rgba(0,0,0,0.1); border-left: 3px solid #25d366; padding: 8px; margin-bottom: 8px; border-radius: 4px; font-size: 0.9em;">
          <div style="font-weight: bold; color: #25d366; margin-bottom: 2px;">${replySender}</div>
          <div style="color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${replyBody.length > 50 ? replyBody.substring(0, 50) + '...' : replyBody}</div>
        </div>
      `;
    }

    // Avatar para mensagens enviadas (posicionado na diagonal do balão)
    const userAvatar = enviada ? `
      <div class="user-avatar-diagonal" data-user-id="${msg.userName ? msg.userName : 'user'}">
        ${msg.userProfilePhoto ? 
          `<img src="${msg.userProfilePhoto}" alt="${msg.userName || 'Usuário'}" class="avatar-img" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">` : 
          ''}
        <div class="avatar-initial" ${msg.userProfilePhoto ? 'style="display:none;"' : ''}>${msg.userName ? msg.userName.charAt(0).toUpperCase() : 'U'}</div>
      </div>
    ` : '';
    
    // Debug: Log para verificar o userName da mensagem
    if (enviada && msg.userName) {
      console.log(`Renderizando avatar para mensagem - userName: ${msg.userName}, inicial: ${msg.userName.charAt(0).toUpperCase()}`);
    }

    // Nome do usuário dentro do balão
    const userNameInBubble = enviada ? `
      <div class="user-name-in-bubble">${msg.userName || 'Usuário'}</div>
    ` : '';

    mensagensDiv.innerHTML += `<div class="msg ${enviada ? 'msg-enviada' : 'msg-recebida'}" data-message-id="${msg.id || msg.timestamp}" style="position:relative;">
  ${isGroup && !enviada ? fotoMsg : ''}
  <div class="bubble ${enviada ? 'enviada' : 'recebida'}" style="position:relative;">
    ${userAvatar}
    <div style="display:flex;align-items:center;gap:6px;">
      ${nomeRemetente}
      ${optionsBtn}
    </div>
    ${replyHtml}
    ${userNameInBubble}
    <div class="message-content">
      ${formatarMensagemWhatsApp(msg.body) || '[Mídia]'}${midiaHtml}
    </div>
    ${reactionsHtml}
    <div class="message-footer">
      <span class="data">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</span>
      ${deliveryStatus}
    </div>
  </div>
</div>`;
  });

  // Gerenciamento inteligente do scroll após renderização
  setTimeout(() => {
    if (messagesContainer) {
      // Se estava no final ou é a primeira vez carregando, vai para o final
      if (wasAtBottom || scrollHeight === 0) {
        scrollToBottom(false); // Scroll instantâneo na primeira carga
        isAutoScrolling = true;
      } else {
        // Tenta restaurar a posição anterior se não estava no final
        const restored = restaurarScrollContato(contatoSelecionado, mensagensDiv);
        if (!restored) {
          // Se não conseguiu restaurar, mantém a posição relativa
          messagesContainer.scrollTop = scrollTop;
        }
        isAutoScrolling = false;
      }
      
      // Atualiza os indicadores
      updateScrollIndicators();
    }
    
    // Atualizar todas as assinaturas de mensagens
    atualizarTodasAssinaturas();
    // Atualizar nomes de usuário no novo layout
    atualizarNomesUsuarios();
    // Avatares já são renderizados corretamente com userProfilePhoto das mensagens
    atualizarAvataresMensagens();
  }, 0);

  safeGet('nomeContato').textContent = contatoSelecionado;

  // Adiciona eventos aos botões de opções
  msgs.forEach((msg, idx) => {
    const btn = safeGet(`msg-options-btn-${idx}`);
    const menu = safeGet(`msg-options-menu-${idx}`);
    if (btn && menu) {
      btn.onclick = function(e) {
        e.stopPropagation();
        document.querySelectorAll('.msg-options-menu.show').forEach(m => m.classList.remove('show'));
        const aberto = menu.classList.toggle('show');
        menuMsgAberto = aberto ? idx : null;
        document.addEventListener('mousedown', function handler(ev) {
          if (!menu.contains(ev.target) && ev.target !== btn) {
            menu.classList.remove('show');
            menuMsgAberto = null;
            document.removeEventListener('mousedown', handler);
          }
        });
      };
      if (menuAbertoAnterior === idx) {
        menu.classList.add('show');
        menuMsgAberto = idx;
      }
    }
  });

  setTimeout(() => {
    document.querySelectorAll('.btn-reagir').forEach(btn => {
      btn.onclick = function(e) {
        e.stopPropagation();
        const timestamp = this.getAttribute('data-timestamp');
        window.abrirEmojiPicker(Number(timestamp));
      };
    });
  }, 0);
}

// Seleciona contato
function selecionarContato(contato) {
  const mensagensDiv = safeGet('mensagens');
  if (contatoSelecionado && mensagensDiv.parentElement) {
    salvarScrollContato(contatoSelecionado, mensagensDiv.parentElement.scrollTop);
  }
  
  // Usar novos sistemas para marcar mensagens como lidas
  if (contatoSelecionado) {
    if (appState) {
      appState.markChatAsRead(contatoSelecionado);
    } else {
      marcarMensagensComoLidas(contatoSelecionado);
    }
  }
  
  contatoSelecionado = contato;
  naoLidas[contato] = 0;
  
  // Reset das variáveis de controle de scroll para nova conversa
  isAutoScrolling = true;
  hasNewMessages = false;
  scrollPosition = 0;
  
  // Remove badge imediatamente ao abrir a conversa
  atualizarBadgeContato(contato, 0);
  
  // Atualiza o header do chat
  atualizarHeaderChat(contato);
  
  renderContatos();
  renderMensagens(safeGet('busca').value);
  let msgs = todasMensagens.filter(m => (m.from === contatoSelecionado || m.to === contatoSelecionado));
  if (msgs.length > 0) {
    ultimoTimestampRenderizado = msgs[msgs.length - 1].timestamp;
  } else {
    ultimoTimestampRenderizado = null;
  }
  
  // Usar novos sistemas para marcar mensagens como lidas
  if (appState) {
    appState.markChatAsRead(contato);
  } else {
    marcarMensagensComoLidas(contato);
  }
  
  // Usar novos sistemas para parar notificações
  if (notificationManager) {
    notificationManager.markChatAsViewed(contato);
  } else {
    // Fallback para sistema antigo
    if (notificacaoContinuaTimers[contato]) {
      clearTimeout(notificacaoContinuaTimers[contato]);
      notificacaoContinuaTimers[contato] = null;
    }
  }
  
  // Atualizar sistemas de rastreamento
  if (messageViewTracker) {
    messageViewTracker.setCurrentChat(contato);
  }
  
  if (appState) {
    appState.setCurrentChat(contato);
  }
  
  if (notificationManager) {
    notificationManager.setCurrentChat(contato);
  }
  
  // Navega para a área de chat no mobile
  if (isMobileView) {
    navigateToChat();
    
    // Aguardar navegação e forçar marcação como visualizado
    setTimeout(() => {
      if (messageViewTracker) {
        messageViewTracker.markChatAsViewed(contato, true);
      }
      
      if (notificationManager) {
        notificationManager.markChatAsViewed(contato);
      }
      
      console.log('[selecionarContato] ✅ Chat forçadamente marcado como visualizado no mobile:', contato);
    }, 300);
  }
  
  console.log('[selecionarContato] Contato selecionado:', contato);
}

// Busca de contatos
safeGet('buscaContato').oninput = function() {
  const termo = this.value.toLowerCase();
  const ul = safeGet('listaContatos');
  Array.from(ul.children).forEach(li => {
    li.style.display = li.textContent.toLowerCase().includes(termo) ? '' : 'none';
  });
};

// Busca de mensagens no chat selecionado
safeGet('busca').oninput = function() {
  renderMensagens(this.value);
};

// Atualização em tempo real via socket.io
socket.on('nova-mensagem', msg => {
  // Verifica se a mensagem já existe para evitar duplicação
  const mensagemExistente = todasMensagens.find(existing => 
    existing.id === msg.id || 
    (existing.timestamp === msg.timestamp && existing.from === msg.from)
  );
  
  if (!mensagemExistente) {
    todasMensagens.push(msg);
    
    // Usar AppState se disponível
    if (appState) {
      appState.addMessage(msg);
    }
    
    const contato = msg.fromMe ? msg.to : msg.from;
    
    // Usar NotificationManager se disponível
    if (notificationManager) {
      if (notificationManager.shouldNotify(contato, msg)) {
        notificationManager.playNotificationSound(contato);
        
        // Atualizar contador de notificações
        const currentCount = appState ? appState.getBadgeCount(contato) : (naoLidas[contato] || 0);
        const newCount = currentCount + 1;
        
        if (appState) {
          appState.updateBadgeCount(contato, newCount);
        } else {
          naoLidas[contato] = newCount;
        }
      }
    } else {
      // Fallback para sistema antigo
      if (contatoSelecionado) {
        if (contato !== contatoSelecionado) {
          naoLidas[contato] = (naoLidas[contato] || 0) + 1;
        }
        if ((msg.from === contatoSelecionado || msg.to === contatoSelecionado)) {
          adicionarNovasMensagens();
        }
      } else {
        naoLidas[contato] = (naoLidas[contato] || 0) + 1;
      }
      
      if (!msg.fromMe) {
        tocarSomNotificacao(contato);
      }
    }
    
    renderContatos();
    
    if (contatoSelecionado && (msg.from === contatoSelecionado || msg.to === contatoSelecionado)) {
      adicionarNovasMensagens();
    }
  }
});

// Função incremental para novas mensagens
function adicionarNovasMensagens() {
  if (!contatoSelecionado) return;
  
  const mensagensDiv = safeGet('mensagens');
  if (!mensagensDiv) return;
  
  const msgs = todasMensagens.filter(m => 
    (m.from === contatoSelecionado || m.to === contatoSelecionado) &&
    m.timestamp > ultimoTimestampRenderizado
  );
  
  if (msgs.length > 0) {
    const wasNearBottom = isNearBottom(100);
    
    msgs.forEach(msg => {
      // Verifica se a mensagem já foi renderizada para evitar duplicação
      const mensagemJaRenderizada = mensagensDiv.querySelector(`[data-message-id="${msg.id}"]`);
      if (mensagemJaRenderizada) {
        return; // Pula mensagens já renderizadas
      }
      
      const isGroup = contatoSelecionado.endsWith('@g.us');
      const enviada = msg.fromMe;
      const recebidaPrivada = !enviada && !isGroup;
      
      let nomeRemetente = '';
      let fotoMsg = '';
      
      if (isGroup && !enviada) {
        const nome = msg.senderName || msg.from.split('@')[0];
        nomeRemetente = `<div style="font-size:0.8em;color:#666;margin-bottom:4px;">${nome}</div>`;
        if (msg.photoUrl) {
          fotoMsg = `<img src="${msg.photoUrl}" style="width:24px;height:24px;border-radius:50%;margin-right:8px;object-fit:cover;">`;
        }
      }
      
      let midiaHtml = '';
      if (msg.mediaFilename && msg.mimetype) {
        const mediaUrl = `/media/${msg.mediaFilename}`;
        if (msg.mimetype.startsWith('image/')) {
          midiaHtml = `<br><img src="${mediaUrl}" style="max-width:200px;max-height:200px;cursor:pointer;" onclick="abrirImgModal('${mediaUrl}')">`;
        } else if (msg.mimetype.startsWith('video/')) {
          midiaHtml = `<br><video controls><source src="${mediaUrl}" type="${msg.mimetype}"></video>`;
        } else if (msg.mimetype.startsWith('audio/')) {
          midiaHtml = `<br><audio controls><source src="${mediaUrl}" type="${msg.mimetype}"></audio>`;
        } else if (msg.mimetype === 'application/pdf') {
          midiaHtml = `<br><button type="button" class="btn btn-sm btn-outline-primary" onclick="abrirPdfModal('${mediaUrl}')">Visualizar PDF</button>`;
        }
      }
      
      const optionsBtnId = `msg-options-btn-${Date.now()}-${Math.random()}`;
      const optionsMenuId = `msg-options-menu-${Date.now()}-${Math.random()}`;
      const optionsBtn = `
      <button class="msg-options-btn${recebidaPrivada ? ' left' : ''}" id="${optionsBtnId}" title="Mais opções" type="button">⋮</button>
      <div class="msg-options-menu" id="${optionsMenuId}">
        <button type="button" onclick="responderMensagem(${msg.timestamp})">
          <span class="icon">↩️</span>
          Responder
        </button>
        <button type="button" onclick="encaminharMensagem(${msg.timestamp})">
          <span class="icon">↗️</span>
          Encaminhar
        </button>
        <button type="button" onclick="copiarTextoMensagem(${msg.timestamp})">
          <span class="icon">📋</span>
          Copiar texto
        </button>
        <button type="button" onclick="alternarSelecaoMensagem(${msg.timestamp})">
          <span class="icon">☑️</span>
          Selecionar
        </button>
        ${enviada ? `<button type="button" onclick="deletarMensagem(${msg.timestamp})">
          <span class="icon">🗑️</span>
          Deletar
        </button>` : ''}
        <button type="button" onclick="mostrarInfoMensagem(${msg.timestamp})">
          <span class="icon">ℹ️</span>
          Informações
        </button>
      </div>
    `;

      // Status de entrega (simulado)
      const deliveryStatus = enviada ? `
        <div class="delivery-status ${Math.random() > 0.5 ? 'read' : 'delivered'}">
          <span class="status-icon">${Math.random() > 0.5 ? '✓✓' : '✓'}</span>
        </div>
      ` : '';

      // HTML para resposta (se esta mensagem é uma resposta)
      let replyHtml = '';
      if (msg.replyTo) {
        const replyBody = msg.replyTo.body || '[Mídia]';
        const replySender = msg.replyTo.senderName || 'Desconhecido';
        replyHtml = `
          <div class="reply-reference" style="background: rgba(0,0,0,0.1); border-left: 3px solid #25d366; padding: 8px; margin-bottom: 8px; border-radius: 4px; font-size: 0.9em;">
            <div style="font-weight: bold; color: #25d366; margin-bottom: 2px;">${replySender}</div>
            <div style="color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${replyBody.length > 50 ? replyBody.substring(0, 50) + '...' : replyBody}</div>
          </div>
        `;
      }

      const msgHtml = `<div class="msg" data-message-id="${msg.id || msg.timestamp}" style="position:relative;">
        ${isGroup && !enviada ? fotoMsg : ''}
        <div class="bubble ${enviada ? 'enviada' : 'recebida'}" style="position:relative;">
          <div style="display:flex;align-items:center;gap:6px;">
            ${nomeRemetente}
            ${optionsBtn}
          </div>
          ${replyHtml}
          ${formatarMensagemWhatsApp(msg.body) || '[Mídia]'}${midiaHtml}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;">
            <span class="data">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</span>
            ${deliveryStatus}
          </div>
        </div>
      </div>`;
      
      mensagensDiv.insertAdjacentHTML('beforeend', msgHtml);
    });
    
    ultimoTimestampRenderizado = msgs[msgs.length - 1].timestamp;
    
    // Se estava próximo do final ou auto-scroll está ativo, rola automaticamente
    if (wasNearBottom || isAutoScrolling) {
      setTimeout(() => {
        scrollToBottom(true);
      }, 100);
    } else {
      // Indica que há novas mensagens
      hasNewMessages = true;
      
      // Mostra notificação de nova mensagem
      if (window.showToast) {
        const contador = msgs.length;
        const texto = contador === 1 ? '1 nova mensagem' : `${contador} novas mensagens`;
        window.showToast(texto, 'info', 4000);
      }
    }
    
    // Marca mensagens como lidas se estiver próximo do final ou se a conversa está aberta
    if (wasNearBottom || isAutoScrolling) {
      marcarMensagensComoLidas(contatoSelecionado);
      // Remove badge da conversa ativa
      atualizarBadgeContato(contatoSelecionado, 0);
    }
    
    // Atualiza indicadores
    updateScrollIndicators();
    
    // Avatares das novas mensagens já vêm corretos do banco de dados
  }
}

// Envio de mensagem
safeGet('formEnvio').onsubmit = function(e) {
  e.preventDefault();
  if (!contatoSelecionado) return alert('Selecione um contato!');
  const message = safeGet('texto').value;

  // Permite enviar se houver texto OU arquivo
  if (!message.trim() && !arquivoSelecionado) return;

  // NÃO adiciona mensagem localmente - deixa o servidor/socket fazer isso
  // para evitar duplicação, especialmente com respostas

  // Para mídia, NÃO adicione localmente!
  if (arquivoSelecionado) {
    const formData = new FormData();
    formData.append('to', contatoSelecionado);
    formData.append('file', arquivoSelecionado);
    
    // Adicionar informações de resposta se houver
    if (mensagemParaResponder) {
      formData.append('replyTo', JSON.stringify({
        timestamp: mensagemParaResponder.timestamp,
        body: mensagemParaResponder.body || 'Mídia',
        from: mensagemParaResponder.from,
        senderName: mensagemParaResponder.from === meuNumero ? 'Você' : getNomeContato(mensagemParaResponder.from, mensagemParaResponder.from)
      }));
      
      // Limpar resposta
      cancelarResposta();
    }
    
    fetch('/api/send-media', {
      method: 'POST',
      body: formData
    }).then(r => r.json()).then(resp => {
      if (resp.ok) {
        removerArquivo();
        safeGet('texto').value = '';
      } else {
        alert('Erro: ' + resp.error);
      }
    });
  } else if (message.trim()) {
    const requestBody = { to: contatoSelecionado, message };
    
    // Adicionar informações de resposta se houver
    if (mensagemParaResponder) {
      requestBody.replyTo = {
        timestamp: mensagemParaResponder.timestamp,
        body: mensagemParaResponder.body || 'Mídia',
        from: mensagemParaResponder.from,
        senderName: mensagemParaResponder.from === meuNumero ? 'Você' : getNomeContato(mensagemParaResponder.from, mensagemParaResponder.from)
      };
      
      // Limpar resposta
      cancelarResposta();
    }
    
    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    }).then(r => r.json()).then(resp => {
      if (resp.ok) {
        safeGet('texto').value = '';
      } else {
        alert('Erro: ' + resp.error);
      }
    });
  }
};

// Botão global para adicionar contato
safeGet('btnAddContato').onclick = function() {
  safeGet('numeroContato').value = '';
  safeGet('nomeContatoModal').value = '';
  const modal = new bootstrap.Modal(safeGet('modalContato'));
  modal.show();
};

// Salva contato do modal
safeGet('formModalContato').onsubmit = function(e) {
  e.preventDefault();
  const numero = safeGet('numeroContato').value.trim();
  const nome = safeGet('nomeContatoModal').value.trim();
  if (numero && nome) {
    setContatoCustom(numero, nome);
    renderContatos();
    bootstrap.Modal.getInstance(safeGet('modalContato')).hide();
  }
};

// Limpar conversas
safeGet('btnLimpar').onclick = function() {
  safeGet('modalConfirmMsg').textContent = 'Digite "delete" para confirmar a exclusão de todas as conversas:';
  safeGet('modalConfirmInput').value = '';
  const modal = new bootstrap.Modal(safeGet('modalConfirm'));
  modal.show();
};
safeGet('formModalConfirm').onsubmit = function(e) {
  e.preventDefault();
  const confirmacao = safeGet('modalConfirmInput').value.trim().toLowerCase();
  if (confirmacao === 'delete') {
    fetch('/api/clear', { method: 'POST' })
      .then(() => {
        todasMensagens = [];
        contatoSelecionado = null;
        renderContatos();
        renderMensagens();
        bootstrap.Modal.getInstance(safeGet('modalConfirm')).hide();
        alert('Conversas apagadas!');
      });
  } else {
    alert('Ação cancelada. Nada foi apagado.');
    bootstrap.Modal.getInstance(safeGet('modalConfirm')).hide();
  }
};

// PDF e imagem modal
window.abrirPdfModal = function(url) {
  safeGet('pdfViewer').src = url;
  const modal = new bootstrap.Modal(safeGet('pdfModal'));
  modal.show();
};
safeGet('pdfModal').addEventListener('hidden.bs.modal', function () {
  safeGet('pdfViewer').src = '';
});
window.abrirImgModal = function(url) {
  safeGet('imgViewer').src = url;
  const modal = new bootstrap.Modal(safeGet('imgModal'));
  modal.show();
};
safeGet('imgModal').addEventListener('hidden.bs.modal', function () {
  safeGet('imgViewer').src = '';
});

// Preview do arquivo selecionado
safeGet('arquivoMidiaPopover').onchange = function() {
  if (this.files && this.files[0]) {
    arquivoSelecionado = this.files[0];
    safeGet('filePreviewName').textContent = this.files[0].name;
    safeGet('filePreview').style.display = '';
    safeGet('popoverAnexo').style.display = 'none';
  }
};
function removerArquivo() {
  arquivoSelecionado = null;
  safeGet('filePreview').style.display = 'none';
  safeGet('arquivoMidiaPopover').value = '';
}

// Mostra/esconde o popover ao clicar no clipe
safeGet('btnClip').onclick = function(e) {
  e.preventDefault();
  const pop = safeGet('popoverAnexo');
  pop.style.display = (pop.style.display === 'none' || pop.style.display === '') ? 'block' : 'none';
  document.addEventListener('mousedown', fecharPopoverFora, { once: true });
};
function fecharPopoverFora(ev) {
  const pop = safeGet('popoverAnexo');
  if (!pop.contains(ev.target) && ev.target.id !== 'btnClip') {
    pop.style.display = 'none';
  }
}

// Darkmode
if (safeGet('toggle-darkmode')) {
  safeGet('toggle-darkmode').onclick = function() {
    document.body.classList.toggle('darkmode');
    this.classList.toggle('day');
    this.textContent = document.body.classList.contains('darkmode') ? '☀️' : '🌙';
    localStorage.setItem('darkmode', document.body.classList.contains('darkmode') ? 'on' : 'off');
  };
  if(localStorage.getItem('darkmode') === 'on') {
    document.body.classList.add('darkmode');
    safeGet('toggle-darkmode').classList.add('day');
    safeGet('toggle-darkmode').textContent = '☀️';
  }
}

// Funções utilitárias de scroll
function salvarScrollContato(contato, scrollTop) {
  if (!contato) return;
  sessionStorage.setItem('scroll_' + contato, scrollTop);
}
function restaurarScrollContato(contato, mensagensDiv) {
  if (!contato) return false;
  const scroll = sessionStorage.getItem('scroll_' + contato);
  if (scroll !== null) {
    mensagensDiv.parentElement.scrollTop = parseInt(scroll, 10);
    return true;
  }
  return false;
}

// Sistema de scroll inteligente
window.addEventListener('DOMContentLoaded', function() {
  // Configura o sistema de scroll inteligente
  const setupScrollSystem = () => {
    const messagesContainer = document.querySelector('.messages-container');
    const scrollToBottomBtn = document.getElementById('scrollToBottom');
    const scrollIndicator = document.getElementById('scrollIndicator');
    
    if (messagesContainer && scrollToBottomBtn && scrollIndicator) {
      // Event listener para detectar scroll do usuário
      messagesContainer.addEventListener('scroll', handleUserScroll);
      
      // Event listener para o botão de scroll
      scrollToBottomBtn.addEventListener('click', function() {
        scrollToBottom(true);
        isAutoScrolling = true;
        hasNewMessages = false;
        updateScrollIndicators();
      });
      
      // Observer para detectar mudanças no conteúdo
      const observer = new MutationObserver(() => {
        updateScrollIndicators();
      });
      
      observer.observe(messagesContainer, {
        childList: true,
        subtree: true
      });
      
      // Inicializa os indicadores
      updateScrollIndicators();
    }
  };
  
  // Tenta configurar imediatamente ou aguarda o DOM estar pronto
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupScrollSystem);
  } else {
    setupScrollSystem();
  }
  
  // Fallback: tenta novamente após um delay
  setTimeout(setupScrollSystem, 1000);
});

// Função de formatação
function formatarMensagemWhatsApp(texto) {
  if (!texto) return '';
  texto = texto.replace(/```([\s\S]+?)```/g, '<pre>$1</pre>');
  texto = texto.replace(/`([^`]+?)`/g, '<code>$1</code>');
  texto = texto.replace(/_([^_\n]+)_/g, '<i>$1</i>');
  texto = texto.replace(/~([^~\n]+)~/g, '<s>$1</s>');
  texto = texto.replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank">$1</a>');
  texto = texto.replace(/\n/g, '<br>');
  return texto;
}

// Emoji picker
let emojiPickerMsgTimestamp = null;
window.abrirEmojiPicker = function(msgTimestamp) {
  console.log('[abrirEmojiPicker] Chamado para timestamp:', msgTimestamp);
  emojiPickerMsgTimestamp = msgTimestamp;
  const picker = safeGet('emojiPicker');
  if (!picker) {
    console.warn('[abrirEmojiPicker] emojiPicker não encontrado!');
    return;
  }
  picker.style.display = 'block';
  picker.style.left = (window.innerWidth/2-150)+'px';
  picker.style.top = (window.innerHeight/2-200)+'px';
  console.log('[abrirEmojiPicker] picker exibido');
};

safeGet('emojiPicker').addEventListener('emoji-click', function(e) {
  console.log('[emoji-click] Evento recebido:', e.detail);
  if (!emojiPickerMsgTimestamp) {
    console.warn('[emoji-click] emojiPickerMsgTimestamp não definido!');
    return;
  }
  
  // Encontra a mensagem para obter o ID
  const mensagem = todasMensagens.find(m => m.timestamp === emojiPickerMsgTimestamp);
  if (!mensagem) {
    console.warn('[emoji-click] Mensagem não encontrada para timestamp:', emojiPickerMsgTimestamp);
    return;
  }
  
  console.log('[emoji-click] Enviando reação para mensagem:', {
    timestamp: emojiPickerMsgTimestamp,
    id: mensagem.id,
    fromMe: mensagem.fromMe,
    emoji: e.detail.unicode
  });
  
  fetch('/api/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgTimestamp: emojiPickerMsgTimestamp,
      msgId: mensagem.id, // Adiciona o ID da mensagem
      emoji: e.detail.unicode,
      user: meuNumero
    })
  }).then(r => r.json()).then(resp => {
    console.log('[emoji-click] Resposta do backend:', resp);
    if (!resp.ok) {
      console.error('[emoji-click] Erro na reação:', resp.error);
    }
  }).catch(error => {
    console.error('[emoji-click] Erro ao enviar reação:', error);
  });
  
  this.style.display = 'none';
  emojiPickerMsgTimestamp = null;
});

window.addEventListener('click', function(e) {
  const picker = safeGet('emojiPicker');
  if (picker.style.display === 'block' && !picker.contains(e.target)) {
    picker.style.display = 'none';
    emojiPickerMsgTimestamp = null;
  }
});
socket.on('reacao-mensagem', ({ msgTimestamp, msgId, reactions }) => {
  console.log('[socket] Reação recebida:', { msgTimestamp, msgId, reactions });
  
  // Tenta encontrar a mensagem por ID primeiro (mais preciso)
  let msg = null;
  if (msgId) {
    msg = todasMensagens.find(m => m.id === msgId);
    console.log('[socket] Buscando por ID:', msgId, 'encontrada:', !!msg);
  }
  
  // Se não encontrou por ID, tenta por timestamp (compatibilidade)
  if (!msg && msgTimestamp) {
    msg = todasMensagens.find(m => m.timestamp == msgTimestamp);
    console.log('[socket] Buscando por timestamp:', msgTimestamp, 'encontrada:', !!msg);
  }
  
  if (msg) {
    msg.reactions = reactions;
    console.log('[socket] Reações atualizadas para mensagem:', msg.id, reactions);
    renderMensagens(safeGet('busca').value);
  } else {
    console.warn('[socket] Mensagem não encontrada para atualizar reações. Recarregando...');
    fetch('/api/messages').then(r => r.json()).then(msgs => {
      todasMensagens = msgs;
      renderMensagens(safeGet('busca').value);
    });
  }
});

// ...Som de notificação...

let notificacaoContinuaTimers = {};

function tocarSomNotificacao(contato) {
  const audioData = localStorage.getItem('notificacao_audio_' + contato);
  const continua = localStorage.getItem('notificacao_continua_' + contato) === 'on';
  if (audioData) {
    // Se notificações contínuas estiverem ativadas, repita até visualizar
    if (continua) {
      if (notificacaoContinuaTimers[contato]) return; // já está tocando
      const playLoop = () => {
        if (!notificacaoContinuaTimers[contato]) return;
        const audio = new Audio(audioData);
        audio.play();
        notificacaoContinuaTimers[contato] = setTimeout(playLoop, 2000); // repete a cada 2s
      };
      notificacaoContinuaTimers[contato] = setTimeout(playLoop, 0);
    } else {
      const audio = new Audio(audioData);
      audio.play();
    }
  }
}

// Ao visualizar a conversa, pare o loop
function selecionarContato(contato) {
  const mensagensDiv = safeGet('mensagens');
  if (contatoSelecionado && mensagensDiv.parentElement) {
    salvarScrollContato(contatoSelecionado, mensagensDiv.parentElement.scrollTop);
  }
  contatoSelecionado = contato;
  naoLidas[contato] = 0;
  renderContatos();
  renderMensagens(safeGet('busca').value);
  let msgs = todasMensagens.filter(m => (m.from === contatoSelecionado || m.to === contatoSelecionado));
  if (msgs.length > 0) {
    ultimoTimestampRenderizado = msgs[msgs.length - 1].timestamp;
  } else {
    ultimoTimestampRenderizado = null;
  }

  // Pare notificações contínuas ao visualizar
  if (notificacaoContinuaTimers[contato]) {
    clearTimeout(notificacaoContinuaTimers[contato]);
    notificacaoContinuaTimers[contato] = null;
  }
  
  // Navega para a área de chat no mobile
  if (isMobileView) {
    navigateToChat();
  }
}

// Modal de contato: som personalizado
safeGet('inputSomNotificacao').onchange = function() {
  const file = this.files[0];
  if (!file) {
    safeGet('nomeSomSelecionado').textContent = 'Nenhum som selecionado';
    return;
  }
  const numero = safeGet('numeroContato').value.trim();
  const reader = new FileReader();
  reader.onload = function(e) {
    localStorage.setItem('notificacao_audio_' + numero, e.target.result);
    localStorage.setItem('notificacao_audio_nome_' + numero, file.name);
    safeGet('nomeSomSelecionado').textContent = `Selecionado: ${file.name}`;
  };
  reader.readAsDataURL(file);
};
if (safeGet('btnTocarSom')) {
  safeGet('btnTocarSom').onclick = function() {
    const numero = safeGet('numeroContato')?.value.trim();
    const audioData = localStorage.getItem('notificacao_audio_' + numero);
    if (audioData) {
      const audio = new Audio(audioData);
      audio.play();
    } else {
      alert('Nenhum som selecionado para este contato ou grupo.');
    }
  };
}

if (safeGet('btnRemoverSom')) {
  safeGet('btnRemoverSom').onclick = function() {
    const numero = safeGet('numeroContato')?.value.trim();
    localStorage.removeItem('notificacao_audio_' + numero);
    localStorage.removeItem('notificacao_audio_nome_' + numero);
    if (safeGet('nomeSomSelecionado')) safeGet('nomeSomSelecionado').textContent = 'Nenhum som selecionado';
    if (safeGet('inputSomNotificacao')) safeGet('inputSomNotificacao').value = '';
  };
}

if (safeGet('btnEscolherSom')) {
  safeGet('btnEscolherSom').onclick = function() {
    if (safeGet('inputSomNotificacao')) safeGet('inputSomNotificacao').click();
  };
}

// Salve ao mudar o toggle
safeGet('toggleNotificacaoContinua').onchange = function() {
  const numero = safeGet('numeroContato').value.trim();
  console.log('[toggleNotificacaoContinua] Checkbox mudou:', this.checked);
  console.log('[toggleNotificacaoContinua] Número do contato:', numero);
  localStorage.setItem('notificacao_continua_' + numero, this.checked ? 'on' : 'off');
  console.log('[toggleNotificacaoContinua] Salvo em localStorage:', 'notificacao_continua_' + numero, '=', localStorage.getItem('notificacao_continua_' + numero));
};

// Funções para contatos personalizados
function getContatosCustom() {
  return JSON.parse(localStorage.getItem('contatosCustom') || '{}');
}
function setContatoCustom(numero, nome) {
  const contatos = getContatosCustom();
  contatos[numero] = nome;
  localStorage.setItem('contatosCustom', JSON.stringify(contatos));
}
function getNomeContato(numero, fallback) {
  const contatos = getContatosCustom();
  return contatos[numero] || fallback || numero;
}

// Função utilitária para pegar elementos com segurança
function safeGet(id) {
  return document.getElementById(id);
}

// Variáveis globais para funcionalidades de resposta e encaminhamento
let mensagemParaResponder = null;
let mensagensSelecionadas = new Set();
let modoSelecao = false;

// Função para responder mensagem
window.responderMensagem = function(msgTimestamp) {
  const mensagem = todasMensagens.find(m => m.timestamp === msgTimestamp);
  if (!mensagem) return;
  
  mensagemParaResponder = mensagem;
  
  // Criar preview da resposta
  const replyPreview = document.createElement('div');
  replyPreview.className = 'reply-preview';
  replyPreview.innerHTML = `
    <div class="reply-content">
      <strong>${mensagem.from === meuNumero ? 'Você' : getNomeContato(mensagem.from, mensagem.senderName || mensagem.from)}</strong>
      <p>${mensagem.body || 'Mídia'}</p>
    </div>
    <button onclick="cancelarResposta()" class="reply-cancel">×</button>
  `;
  
  const chatInput = document.querySelector('.chat-input');
  if (chatInput) {
    // Remove preview anterior se existir
    const previewAnterior = chatInput.querySelector('.reply-preview');
    if (previewAnterior) {
      previewAnterior.remove();
    }
    
    chatInput.insertBefore(replyPreview, chatInput.firstChild);
  }
  
  // Focar no input
  safeGet('texto').focus();
  
  // Fechar menu
  fecharMenuMensagem();
};

// Função para cancelar resposta
window.cancelarResposta = function() {
  mensagemParaResponder = null;
  const replyPreview = document.querySelector('.reply-preview');
  if (replyPreview) {
    replyPreview.remove();
  }
};

// Função para encaminhar mensagem
window.encaminharMensagem = function(msgTimestamp) {
  const mensagem = todasMensagens.find(m => m.timestamp === msgTimestamp);
  if (!mensagem) return;
  
  // Adicionar à seleção e abrir modal
  mensagensSelecionadas.clear();
  mensagensSelecionadas.add(msgTimestamp);
  
  mostrarModalEncaminhar();
  fecharMenuMensagem();
};

// Função para mostrar modal de encaminhar
function mostrarModalEncaminhar() {
  const modal = safeGet('forwardModal');
  const contactList = safeGet('forwardContactsList');
  
  // Limpar lista anterior
  contactList.innerHTML = '';
  
  // Buscar contatos únicos das mensagens
  const contatos = [...new Set(todasMensagens.map(m => m.fromMe ? m.to : m.from))]
    .filter(c => c !== meuNumero && c && c !== 'unknown')
    .sort();
  
  contatos.forEach(contato => {
    const nomeContato = getNomeContato(contato, contato) || contato;
    const contactItem = document.createElement('div');
    contactItem.className = 'forward-contact-item';
    contactItem.innerHTML = `
      <input type="checkbox" id="contact-${contato}" value="${contato}">
      <label for="contact-${contato}">
        <div class="contact-avatar">
          ${getInitial(nomeContato)}
        </div>
        <span>${nomeContato}</span>
      </label>
    `;
    contactList.appendChild(contactItem);
  });
  
  modal.style.display = 'flex';
  atualizarBotaoEncaminhar();
}

// Função para fechar modal de encaminhar
window.fecharModalEncaminhar = function() {
  safeGet('forwardModal').style.display = 'none';
};

// Função para atualizar botão de encaminhar
function atualizarBotaoEncaminhar() {
  const checkboxes = document.querySelectorAll('#forwardContactsList input[type="checkbox"]:checked');
  const btn = safeGet('forwardConfirmBtn');
  btn.disabled = checkboxes.length === 0;
  btn.textContent = `Encaminhar (${checkboxes.length})`;
}

// Função para confirmar encaminhamento
window.confirmarEncaminhamento = function() {
  const checkboxes = document.querySelectorAll('#forwardContactsList input[type="checkbox"]:checked');
  const contatosDestino = Array.from(checkboxes).map(cb => cb.value);
  
  if (contatosDestino.length === 0) return;
  
  // Mostrar loading
  const btn = safeGet('forwardConfirmBtn');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Enviando...';
  
  let enviadas = 0;
  let erros = 0;
  
  // Encaminhar mensagens selecionadas
  const promises = [];
  
  mensagensSelecionadas.forEach(msgTimestamp => {
    const mensagem = todasMensagens.find(m => m.timestamp === msgTimestamp);
    if (!mensagem) return;
    
    contatosDestino.forEach(contato => {
      const promise = fetch('/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: contato,
          message: mensagem.body || mensagem.texto || '[Mensagem encaminhada]',
          replyTo: null
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.ok) {
          enviadas++;
          console.log(`✅ Mensagem encaminhada para ${contato}`);
        } else {
          erros++;
          console.error(`❌ Erro ao encaminhar para ${contato}:`, data.error);
        }
      })
      .catch(error => {
        erros++;
        console.error(`❌ Erro ao encaminhar para ${contato}:`, error);
      });
      
      promises.push(promise);
    });
  });
  
  // Aguardar todas as requisições
  Promise.all(promises).then(() => {
    fecharModalEncaminhar();
    limparSelecao();
    
    // Restaurar botão
    btn.disabled = false;
    btn.textContent = originalText;
    
    // Mostrar resultado
    if (erros === 0) {
      showToast(`✅ ${enviadas} mensagem(ns) encaminhada(s) com sucesso!`, 'success');
    } else if (enviadas === 0) {
      showToast(`❌ Erro ao encaminhar mensagens. Tente novamente.`, 'error');
    } else {
      showToast(`⚠️ ${enviadas} enviadas, ${erros} erros. Verifique os logs.`, 'warning');
    }
  });
};

// Função para copiar texto da mensagem
window.copiarTextoMensagem = function(msgTimestamp) {
  const mensagem = todasMensagens.find(m => m.timestamp === msgTimestamp);
  if (!mensagem || !mensagem.body) return;
  
  navigator.clipboard.writeText(mensagem.body).then(() => {
    showToast('Texto copiado!', 'success');
  }).catch(() => {
    showToast('Erro ao copiar texto', 'error');
  });
  
  fecharMenuMensagem();
};

// Função para alternar seleção de mensagem
window.alternarSelecaoMensagem = function(msgTimestamp) {
  if (mensagensSelecionadas.has(msgTimestamp)) {
    mensagensSelecionadas.delete(msgTimestamp);
  } else {
    mensagensSelecionadas.add(msgTimestamp);
  }
  
  atualizarBarraSelecao();
  atualizarVisualizacaoSelecao();
  fecharMenuMensagem();
};

// Função para atualizar barra de seleção
function atualizarBarraSelecao() {
  const toolbar = safeGet('selectionToolbar');
  const counter = safeGet('selectionCounter');
  
  if (mensagensSelecionadas.size > 0) {
    toolbar.style.display = 'flex';
    counter.textContent = mensagensSelecionadas.size;
    modoSelecao = true;
  } else {
    toolbar.style.display = 'none';
    modoSelecao = false;
  }
}

// Função para atualizar visualização da seleção
function atualizarVisualizacaoSelecao() {
  document.querySelectorAll('.bubble').forEach(bubble => {
    const msgTimestamp = parseInt(bubble.dataset.timestamp);
    if (mensagensSelecionadas.has(msgTimestamp)) {
      bubble.classList.add('selected');
    } else {
      bubble.classList.remove('selected');
    }
  });
}

// Função para encaminhar mensagens selecionadas
window.encaminharSelecionadas = function() {
  if (mensagensSelecionadas.size === 0) return;
  mostrarModalEncaminhar();
};

// Função para deletar mensagens selecionadas
window.deletarSelecionadas = function() {
  if (mensagensSelecionadas.size === 0) return;
  
  if (confirm(`Deletar ${mensagensSelecionadas.size} mensagem(ns)?`)) {
    mensagensSelecionadas.forEach(msgTimestamp => {
      const index = todasMensagens.findIndex(m => m.timestamp === msgTimestamp);
      if (index !== -1) {
        todasMensagens.splice(index, 1);
      }
    });
    
    limparSelecao();
    renderMensagens();
    showToast('Mensagens deletadas', 'success');
  }
};

// Função para limpar seleção
window.limparSelecao = function() {
  mensagensSelecionadas.clear();
  atualizarBarraSelecao();
  atualizarVisualizacaoSelecao();
};

// Função para deletar mensagem individual
window.deletarMensagem = function(msgTimestamp) {
  if (confirm('Deletar esta mensagem?')) {
    const index = todasMensagens.findIndex(m => m.timestamp === msgTimestamp);
    if (index !== -1) {
      todasMensagens.splice(index, 1);
      renderMensagens();
      showToast('Mensagem deletada', 'success');
    }
  }
  fecharMenuMensagem();
};

// Função para mostrar informações da mensagem
window.mostrarInfoMensagem = function(msgTimestamp) {
  const mensagem = todasMensagens.find(m => m.timestamp === msgTimestamp);
  if (!mensagem) return;
  
  const info = `
    Remetente: ${(mensagem.fromMe ? mensagem.to : mensagem.from) === meuNumero ? 'Você' : getNomeContato(mensagem.fromMe ? mensagem.to : mensagem.from, mensagem.senderName || (mensagem.fromMe ? mensagem.to : mensagem.from))}
    Data: ${new Date(mensagem.timestamp).toLocaleString()}
    Status: ${mensagem.status || 'Entregue'}
    ${mensagem.forwarded ? 'Mensagem encaminhada' : ''}
  `;
  
  alert(info);
  fecharMenuMensagem();
};

// Função para fechar menu de mensagem
function fecharMenuMensagem() {
  document.querySelectorAll('.msg-options-menu').forEach(menu => {
    menu.style.display = 'none';
  });
  menuMsgAberto = null;
}

// Event listeners para o modal de encaminhar
document.addEventListener('change', function(e) {
  if (e.target.matches('#forwardContactsList input[type="checkbox"]')) {
    atualizarBotaoEncaminhar();
  }
});

// Fechar modal ao clicar fora
document.addEventListener('click', function(e) {
  if (e.target.id === 'forwardModal') {
    fecharModalEncaminhar();
  }
});

// Função para atualizar o nome do usuário no header
function atualizarNomeUsuario() {
  // Fazer uma requisição para obter informações do usuário logado
  fetch('/api/user-info')
    .then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Usuário não autenticado');
    })
    .then(user => {
      const currentUserElement = document.getElementById('currentUser');
      if (currentUserElement && user.username) {
        currentUserElement.textContent = user.username;
      }
    })
    .catch(error => {
      console.log('Erro ao obter informações do usuário:', error);
      // Manter o valor padrão "Usuário"
    });
}

// Função para buscar o nome do usuário por timestamp da mensagem
function buscarNomeUsuario(timestamp) {
  // Buscar a mensagem no array de mensagens
  const mensagem = todasMensagens.find(m => m.timestamp === timestamp);
  if (!mensagem) return;

  // Se a mensagem tem userName, usar diretamente
  if (mensagem.userName) {
    const assinaturaElement = document.getElementById(`assinatura-${timestamp}`);
    if (assinaturaElement) {
      assinaturaElement.innerHTML = `${mensagem.userName}`;
    }
    return;
  }

  // Se não tem userName, tentar buscar por outros campos
  // Para mensagens antigas, podemos tentar extrair o nome do body
  if (mensagem.body) {
    const match = mensagem.body.match(/^\*([^*]+)\*:/);
    if (match) {
      const nomeExtraido = match[1];
      const assinaturaElement = document.getElementById(`assinatura-${timestamp}`);
      if (assinaturaElement) {
        assinaturaElement.innerHTML = `${nomeExtraido}`;
      }
      return;
    }
  }

  // Se não conseguiu extrair, usar valor padrão
  const assinaturaElement = document.getElementById(`assinatura-${timestamp}`);
  if (assinaturaElement) {
    assinaturaElement.innerHTML = `Usuário`;
  }
}

// Função para atualizar nomes de usuário no novo layout
function atualizarNomesUsuarios() {
  // Buscar todos os elementos de nome de usuário dentro do balão
  const nomeElements = document.querySelectorAll('.user-name-in-bubble');
  
  nomeElements.forEach(element => {
    const msgElement = element.closest('.msg');
    if (msgElement) {
      const timestamp = msgElement.getAttribute('data-message-id');
      const mensagem = todasMensagens.find(m => (m.id || m.timestamp) == timestamp);
      
      if (mensagem && mensagem.userName) {
        element.textContent = mensagem.userName;
      } else if (mensagem && mensagem.body) {
        const match = mensagem.body.match(/^\*([^*]+)\*:/);
        if (match) {
          element.textContent = match[1];
        }
      }
    }
  });
}

// Função para atualizar todas as assinaturas de mensagens
function atualizarTodasAssinaturas() {
  // Buscar todos os elementos de assinatura que estão carregando
  const assinaturasCarregando = document.querySelectorAll('[id^="assinatura-"]');
  
  assinaturasCarregando.forEach(element => {
    const timestamp = element.id.replace('assinatura-', '');
    buscarNomeUsuario(parseInt(timestamp));
  });
}

// Chamar a função quando a página carregar
document.addEventListener('DOMContentLoaded', function() {
  atualizarNomeUsuario();
  inicializarFotoPerfil();
  
  // Carregar foto de perfil após um pequeno delay para garantir que tudo está carregado
  setTimeout(() => {
    carregarFotoPerfil();
  }, 1000);
});

// ===== SISTEMA DE FOTO DE PERFIL =====

// Função para inicializar o sistema de foto de perfil
function inicializarFotoPerfil() {
  const profilePhotoContainer = document.getElementById('profilePhotoContainer');
  const profilePhotoInput = document.getElementById('profilePhotoInput');
  
  if (!profilePhotoContainer || !profilePhotoInput) return;
  
  // Adicionar evento de clique e segurar para upload
  let pressTimer;
  
  profilePhotoContainer.addEventListener('mousedown', function() {
    pressTimer = setTimeout(() => {
      profilePhotoInput.click();
    }, 500); // 500ms de pressão
  });
  
  profilePhotoContainer.addEventListener('mouseup', function() {
    clearTimeout(pressTimer);
  });
  
  profilePhotoContainer.addEventListener('mouseleave', function() {
    clearTimeout(pressTimer);
  });
  
  // Evento de mudança do input de arquivo
  profilePhotoInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      uploadFotoPerfil(e.target.files[0]);
    }
  });
  
  // Carregar foto de perfil atual
  carregarFotoPerfil();
}

// Função para fazer upload da foto de perfil
async function uploadFotoPerfil(file) {
  try {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      showToast('Formato de imagem não suportado. Use JPG, PNG, GIF ou WebP.', 'error');
      return;
    }
    
    // Validar tamanho (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showToast('Imagem muito grande. Máximo 5MB.', 'error');
      return;
    }
    
    // Criar FormData
    const formData = new FormData();
    formData.append('photo', file);
    
    // Mostrar loading
    showToast('Fazendo upload da foto...', 'info');
    
    // Fazer upload
    const response = await fetch('/api/profile-photo', {
      method: 'POST',
      body: formData
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      showToast('Foto de perfil atualizada com sucesso!', 'success');
      
      // Atualizar exibição da foto
      atualizarExibicaoFotoPerfil(result.photoPath);
      
      // Atualizar avatares nas mensagens
      atualizarAvataresMensagens();
      
    } else {
      showToast(result.error || 'Erro ao fazer upload da foto.', 'error');
    }
    
  } catch (error) {
    console.error('Erro no upload da foto de perfil:', error);
    showToast('Erro ao fazer upload da foto.', 'error');
  }
}

// Função para carregar foto de perfil atual
async function carregarFotoPerfil() {
  try {
    console.log('Carregando foto de perfil...');
    
    const response = await fetch('/api/user-info');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const userInfo = await response.json();
    console.log('Informações do usuário:', userInfo);
    
    if (userInfo && userInfo.id) {
      console.log('Buscando foto para usuário ID:', userInfo.id);
      
      const photoResponse = await fetch(`/api/profile-photo/${userInfo.id}`);
      if (!photoResponse.ok) {
        throw new Error(`HTTP ${photoResponse.status}: ${photoResponse.statusText}`);
      }
      
      const photoData = await photoResponse.json();
      console.log('Dados da foto:', photoData);
      
      if (photoData.photoPath) {
        console.log('Atualizando exibição com foto:', photoData.photoPath);
        atualizarExibicaoFotoPerfil(photoData.photoPath, userInfo.username);
      } else {
        console.log('Nenhuma foto encontrada para o usuário');
        atualizarExibicaoFotoPerfil(null, userInfo.username);
      }
    } else {
      console.log('ID do usuário não encontrado');
    }
    
  } catch (error) {
    console.error('Erro ao carregar foto de perfil:', error);
  }
}

// Função para atualizar exibição da foto de perfil
function atualizarExibicaoFotoPerfil(photoPath, username = null) {
  const profilePhoto = document.getElementById('profilePhoto');
  const profileInitial = document.getElementById('profileInitial');
  
  if (!profilePhoto || !profileInitial) return;
  
  if (photoPath) {
    // Criar elemento de imagem
    let img = profilePhoto.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      profilePhoto.appendChild(img);
    }
    
    img.src = photoPath;
    img.alt = 'Foto de perfil';
    
    // Ocultar inicial
    profileInitial.style.display = 'none';
    
  } else {
    // Remover imagem se existir
    const img = profilePhoto.querySelector('img');
    if (img) {
      img.remove();
    }
    
    // Mostrar inicial com a primeira letra do nome do usuário
    if (username && username.length > 0) {
      profileInitial.textContent = username.charAt(0).toUpperCase();
    } else {
      profileInitial.textContent = 'U'; // Fallback para 'U' se não houver username
    }
    profileInitial.style.display = 'flex';
  }
}

// Função para atualizar avatares nas mensagens
async function atualizarAvataresMensagens() {
  try {
    console.log('Atualizando avatares nas mensagens...');
    
    // Buscar todas as mensagens enviadas
    const sentMessages = document.querySelectorAll('.msg-enviada .user-avatar-diagonal');
    console.log('Encontradas', sentMessages.length, 'mensagens enviadas');
    
    if (sentMessages.length === 0) return;
    
    // Atualizar cada avatar
    for (const avatarElement of sentMessages) {
      const userId = avatarElement.getAttribute('data-user-id');
      if (userId && userId !== 'user') {
        try {
          // Buscar foto de perfil
          const photoResponse = await fetch(`/api/profile-photo/username/${userId}`);
          let photoPath = null;
          
          if (photoResponse.ok) {
            const photoData = await photoResponse.json();
            photoPath = photoData.photoPath;
            console.log(`Foto encontrada para ${userId}:`, photoData);
          } else {
            console.log(`Nenhuma foto encontrada para ${userId}`);
          }
          
          // CORREÇÃO: Sempre passar o userId (username) para mostrar a inicial correta
          atualizarAvatarMensagemComFoto(avatarElement, photoPath, userId);
          
        } catch (error) {
          console.error(`Erro ao buscar foto para ${userId}:`, error);
          // CORREÇÃO: Em caso de erro, ainda mostrar a inicial correta
          atualizarAvatarMensagemComFoto(avatarElement, null, userId);
        }
      }
    }
    
  } catch (error) {
    console.error('Erro ao atualizar avatares nas mensagens:', error);
  }
}

// Função para atualizar avatar de uma mensagem com foto específica
function atualizarAvatarMensagemComFoto(avatarElement, photoPath, username = null) {
  if (!avatarElement) return;
  
  if (photoPath) {
    // Criar elemento de imagem
    let img = avatarElement.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      avatarElement.appendChild(img);
    }
    
    img.src = photoPath;
    img.alt = 'Foto de perfil';
    
    // Ocultar inicial
    const initial = avatarElement.querySelector('.avatar-initial');
    if (initial) {
      initial.style.display = 'none';
    }
    
    // Remover fundo verde quando há foto
    avatarElement.style.background = 'none';
    
    console.log(`Avatar atualizado com foto para usuário: ${username}`);
    
  } else {
    // Remover imagem se existir
    const img = avatarElement.querySelector('img');
    if (img) {
      img.remove();
    }
    
    // Mostrar inicial com a primeira letra do nome do usuário
    const initial = avatarElement.querySelector('.avatar-initial');
    if (initial) {
      // CORREÇÃO: Usar o username passado diretamente
      if (username && username.length > 0) {
        const initialLetter = username.charAt(0).toUpperCase();
        initial.textContent = initialLetter;
        console.log(`Avatar atualizado para usuário: ${username} -> ${initialLetter}`);
      } else {
        initial.textContent = 'U';
        console.log('Avatar atualizado com inicial padrão: U');
      }
      initial.style.display = 'flex';
    }
    
    // Restaurar fundo verde quando não há foto
    avatarElement.style.background = 'linear-gradient(135deg, #25d366, #128c7e)';
  }
}

// Função para atualizar avatar de uma mensagem específica (mantida para compatibilidade)
async function atualizarAvatarMensagem(avatarElement) {
  try {
    const response = await fetch('/api/user-info');
    const userInfo = await response.json();
    
    if (userInfo && userInfo.id) {
      const photoResponse = await fetch(`/api/profile-photo/${userInfo.id}`);
      const photoData = await photoResponse.json();
      
      atualizarAvatarMensagemComFoto(avatarElement, photoData.photoPath, userInfo.username);
    }
    
  } catch (error) {
    console.error('Erro ao atualizar avatar da mensagem:', error);
  }
}
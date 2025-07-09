// --- INÍCIO DO SCRIPT ---

const socket = io('http://localhost:3000');
let todasMensagens = [];
let contatoSelecionado = null;
let meuNumero = null;
let naoLidas = {}; // { contato: quantidade }
let arquivoSelecionado = null;
let menuMsgAberto = null; // Índice do menu aberto ou null
let ultimoTimestampRenderizado = null;
let groupPhotos = {};

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

// Descobre o número do bot (usuário atual)
function carregarMensagens() {
  fetch('/api/messages').then(r => r.json()).then(msgs => {
    todasMensagens = msgs;
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
  });
}
carregarMensagens();

// Atualização automática a cada 1 segundo
setInterval(() => {
  fetch('/api/messages').then(r => r.json()).then(msgs => {
    todasMensagens = msgs;
    renderContatos();
    adicionarNovasMensagens();
  });
}, 1000);

// Carrega fotos de grupos
fetch('/groupPhotos.json')
  .then(r => r.json())
  .then(data => { groupPhotos = data; renderContatos(); });

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
  const ul = safeGet('listaContatos');
  ul.innerHTML = '';
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

    // Foto
    let foto;
    if (isGroup) {
      foto = groupPhotos[contato]
        ? `<img src="${groupPhotos[contato]}" class="rounded-circle me-2" style="width:36px;height:36px;object-fit:cover;">`
        : `<span class="rounded-circle bg-secondary d-inline-block me-2" style="width:36px;height:36px;text-align:center;line-height:36px;color:#fff;">👥</span>`;
    } else {
      const ultimaRecebidaComFoto = msgsContato
        .filter(m => !m.fromMe && m.photoUrl)
        .slice(-1)[0];
      foto = (ultimaRecebidaComFoto && ultimaRecebidaComFoto.photoUrl)
        ? `<img src="${ultimaRecebidaComFoto.photoUrl}" class="rounded-circle me-2" style="width:36px;height:36px;object-fit:cover;">`
        : `<span class="rounded-circle bg-secondary d-inline-block me-2" style="width:36px;height:36px;text-align:center;line-height:36px;color:#fff;">👤</span>`;
    }

    // Mensagem e horário mais recente
    const msgMaisRecente = msgsContato.reduce((a, b) => (a.timestamp > b.timestamp ? a : b));
    const horario = msgMaisRecente.timestamp
      ? `<span style="font-size:0.85em;color:#888;">${new Date(msgMaisRecente.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>`
      : '';

    const li = document.createElement('li');
    li.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center';
    li.onclick = () => selecionarContato(contato);

    const contatoInfo = document.createElement('div');
    contatoInfo.className = 'd-flex align-items-center';
    contatoInfo.innerHTML = `
      ${foto}
      <div>
        <div>${nome}</div>
        <div style="font-size:0.9em;color:#888;">${msgMaisRecente.body ? msgMaisRecente.body.substring(0, 30) : '[Mídia]'}</div>
      </div>
    `;

    // Botão de editar
    const btn = document.createElement('button');
    btn.className = 'btn btn-sm btn-outline-secondary ms-2';
    btn.textContent = '✎';
    btn.onclick = (e) => {
      e.stopPropagation();
      safeGet('numeroContato').value = contato;
      safeGet('nomeContatoModal').value = getNomeContato(contato);
      const nomeSom = localStorage.getItem('notificacao_audio_nome_' + contato);
      safeGet('nomeSomSelecionado').textContent = nomeSom ? `Selecionado: ${nomeSom}` : 'Nenhum som selecionado';
      safeGet('inputSomNotificacao').value = '';
      // Estado do toggle (adicione aqui)
      const continua = localStorage.getItem('notificacao_continua_' + contato) === 'on';
      safeGet('toggleNotificacaoContinua').checked = continua;
      const modal = new bootstrap.Modal(safeGet('modalContato'));
      modal.show();
    };
    contatoInfo.appendChild(btn);

    const horarioDiv = document.createElement('div');
    horarioDiv.innerHTML = horario;

    li.appendChild(contatoInfo);
    li.appendChild(horarioDiv);

    if (contato === contatoSelecionado) li.classList.add('active');
    ul.appendChild(li);

    // Badge de não lidas
    const unread = naoLidas[contato] > 0;
    const previewDiv = contatoInfo.querySelector('div > div:nth-child(2)');
    if (previewDiv) {
      previewDiv.style.fontWeight = unread ? 'bold' : 'normal';
      previewDiv.style.color = unread ? '#222' : '#888';
    }
    const nomeDiv = contatoInfo.querySelector('div > div:nth-child(1)');
    if (nomeDiv) {
      nomeDiv.style.fontWeight = unread ? 'bold' : 'normal';
      if (unread) {
        nomeDiv.classList.add('contact-name-unread');
      } else {
        nomeDiv.classList.remove('contact-name-unread');
      }
    }
    const oldBadge = li.querySelector('.badge.bg-success');
    if (oldBadge) oldBadge.remove();
    if (unread) {
      const badge = document.createElement('span');
      badge.className = 'badge bg-success ms-2';
      badge.textContent = naoLidas[contato];
      li.insertBefore(badge, li.lastChild);
    }
  });
}

// Renderiza mensagens
function renderMensagens(filtro = '') {
  const mensagensDiv = safeGet('mensagens');
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
      <button class="msg-options-btn${recebidaPrivada ? ' left' : ''}" id="${optionsBtnId}" title="Mais opções" type="button">&#9660;</button>
      <div class="msg-options-menu" id="${optionsMenuId}">
        <button type="button">Finalizado</button>
        <button type="button">Revisão</button>
        <button type="button">P/ Confirmações</button>
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

    mensagensDiv.innerHTML += `<div class="msg" style="position:relative;">
  ${isGroup && !enviada ? fotoMsg : ''}
  <div class="bubble ${enviada ? 'enviada' : 'recebida'}" style="position:relative;">
    <div style="display:flex;align-items:center;gap:6px;">
      ${nomeRemetente}
      ${optionsBtn}
    </div>
    ${formatarMensagemWhatsApp(msg.body) || '[Mídia]'}${midiaHtml}
    ${reactionsHtml}
    <span class="data">${msg.timestamp ? new Date(msg.timestamp).toLocaleString() : ''}</span>
  </div>
</div>`;
  });

  setTimeout(() => {
    mensagensDiv.parentElement.scrollTop = mensagensDiv.parentElement.scrollHeight;
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
  todasMensagens.push(msg);
  const contato = msg.fromMe ? msg.to : msg.from;
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
  renderContatos();
  if (!msg.fromMe) {
    tocarSomNotificacao(contato);
  }
});

// Função incremental para novas mensagens
function adicionarNovasMensagens() {
  const mensagensDiv = safeGet('mensagens');
  if (!contatoSelecionado) return;
  let msgs = todasMensagens.filter(m => (m.from === contatoSelecionado || m.to === contatoSelecionado));
  let novas = msgs.filter(m => !ultimoTimestampRenderizado || m.timestamp > ultimoTimestampRenderizado);
  if (novas.length === 0) return;

  novas.forEach((msg, idx) => {
    // ...repita o mesmo bloco de renderização de mensagem do renderMensagens...
    // (por questão de espaço, mantenha igual ao renderMensagens)
  });

  if (msgs.length > 0) {
    ultimoTimestampRenderizado = msgs[msgs.length - 1].timestamp;
  }
  const mensagensDivParent = mensagensDiv.parentElement;
  const nearBottom = mensagensDivParent.scrollHeight - mensagensDivParent.scrollTop - mensagensDivParent.clientHeight < 120;
  if (nearBottom) {
    setTimeout(() => {
      mensagensDivParent.scrollTop = mensagensDivParent.scrollHeight;
    }, 0);
  }
}

// Envio de mensagem
safeGet('formEnvio').onsubmit = function(e) {
  e.preventDefault();
  if (!contatoSelecionado) return alert('Selecione um contato!');
  const message = safeGet('texto').value;

  // Permite enviar se houver texto OU arquivo
  if (!message.trim() && !arquivoSelecionado) return;

  // Só adiciona mensagem localmente se for texto puro (sem arquivo)
  if (!arquivoSelecionado && message.trim()) {
    const msgObj = {
      from: meuNumero,
      to: contatoSelecionado,
      body: message,
      timestamp: Date.now(),
      mediaFilename: null,
      mimetype: null,
      fromMe: true,
      senderName: meuNumero,
      groupName: contatoSelecionado.endsWith('@g.us') ? null : undefined,
      photoUrl: null,
      mediaError: null,
      reactions: [],
      id: null // será preenchido pelo backend depois
    };
    todasMensagens.push(msgObj);
    renderMensagens(safeGet('busca').value);
    renderContatos();
    safeGet('texto').value = '';
  }

  // Para mídia, NÃO adicione localmente!
  if (arquivoSelecionado) {
    const formData = new FormData();
    formData.append('to', contatoSelecionado);
    formData.append('file', arquivoSelecionado);
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
    fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to: contatoSelecionado, message })
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

// Botão flutuante de rolagem para o fim
window.addEventListener('DOMContentLoaded', function() {
  const btnAntigo = safeGet('btnScrollBottom');
  if (btnAntigo) btnAntigo.remove();
  const btn = document.createElement('button');
  btn.id = 'btnScrollBottom';
  btn.title = 'Ir para a última mensagem';
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="12" fill="#25d366"/>
      <path d="M8 10l4 4 4-4" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  Object.assign(btn.style, {
    display: 'none',
    position: 'fixed',
    right: '30px',
    bottom: '220px',
    zIndex: 2000,
    border: 'none',
    borderRadius: '50%',
    width: '48px',
    height: '48px',
    background: 'none',
    boxShadow: '0 2px 8px #0004',
    padding: '0',
    cursor: 'pointer',
    alignItems: 'center',
    justifyContent: 'center'
  });
  document.body.appendChild(btn);
  function updateBtnScroll() {
    const mensagensDiv = safeGet('mensagens');
    const scrollContainer = mensagensDiv.parentElement;
    const nearBottom = (scrollContainer.scrollHeight - scrollContainer.scrollTop - scrollContainer.clientHeight) < 120;
    btn.style.display = nearBottom ? 'none' : 'flex';
  }
  const mensagensDiv = safeGet('mensagens');
  const scrollContainer = mensagensDiv.parentElement;
  scrollContainer.addEventListener('scroll', updateBtnScroll);
  const observer = new MutationObserver(updateBtnScroll);
  observer.observe(mensagensDiv, { childList: true, subtree: true });
  btn.onclick = function() {
    scrollContainer.scrollTop = scrollContainer.scrollHeight;
    updateBtnScroll();
  };
  setTimeout(updateBtnScroll, 500);
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
  fetch('/api/react', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      msgTimestamp: emojiPickerMsgTimestamp,
      emoji: e.detail.unicode,
      user: meuNumero
    })
  }).then(r => r.json()).then(resp => {
    console.log('[emoji-click] Resposta do backend:', resp);
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
socket.on('reacao-mensagem', ({ msgTimestamp, reactions }) => {
  const msg = todasMensagens.find(m => m.timestamp == msgTimestamp);
  if (msg) {
    msg.reactions = reactions;
    renderMensagens(safeGet('busca').value);
  } else {
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
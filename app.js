const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const multer = require('multer');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const Database = require('./database');

const MEDIA_DIR = path.join(__dirname, 'media');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR);

// Inicializar banco de dados
const db = new Database();

const upload = multer({ dest: MEDIA_DIR });

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sessão e Keycloak
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'sua-chave-secreta',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));
const keycloak = new Keycloak({ store: memoryStore });
app.use(keycloak.middleware());

app.use('/media', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use('/groupPhotos.json', express.static(path.join(__dirname, 'groupPhotos.json')));

let whatsappClient = null;
let meuNome = null;
let meuNumero = null;

// WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  }
});
whatsappClient = client;

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima com o WhatsApp!');
});

client.on('ready', async () => {
  console.log('Bot pronto!');
  try {
    const info = await client.getMe();
    meuNumero = info.id._serialized;
    meuNome = info.pushname || info.name || meuNumero;
  } catch (e) {
    meuNome = 'Você';
    meuNumero = null;
  }
  
  // Migrar dados do JSON para SQLite se necessário
  try {
    await db.migrateFromJSON(MESSAGES_FILE);
  } catch (error) {
    console.error('Erro na migração:', error);
  }
  
  // Atualiza as fotos dos grupos ao iniciar
  atualizarFotosGrupos();
  // (Opcional) Atualize a cada X minutos:
  setTimeout(atualizarFotosGrupos, 5000); // Aguarda 5 segundos para garantir sincronização
  setInterval(atualizarFotosGrupos, 10 * 60 * 1000); // a cada 10 minutos

  setTimeout(async () => {
    try {
      const chat = await client.getChatById('120363399931934649@g.us');
      const url = await chat.getProfilePicUrl();
      console.log('URL da foto do grupo (teste manual):', url);
    } catch (e) {
      console.log('Erro manual ao buscar foto do grupo:', e);
    }
  }, 15000);
  setTimeout(atualizarFotosGrupos, 15000); // 15 segundos
});

async function atualizarFotosGrupos() {
  const GROUP_PHOTOS_FILE = path.join(__dirname, 'groupPhotos.json');
  const chats = await client.getChats();
  const groupIds = chats.filter(c => c.isGroup).map(c => c.id._serialized);

  console.log('IDs de grupos encontrados:', groupIds);
  console.log('Buscando fotos para os grupos:', groupIds);

  const groupPhotos = {};

  for (const groupId of groupIds) {
    try {
      const url = await client.getProfilePicUrl(groupId);
      groupPhotos[groupId] = url || null;
      console.log(`Foto do grupo ${groupId}: ${url}`);
    } catch (e) {
      groupPhotos[groupId] = null;
      console.log(`Erro ao buscar foto do grupo ${groupId}:`, e && (e.message || e));
    }
  }

  fs.writeFileSync(GROUP_PHOTOS_FILE, JSON.stringify(groupPhotos, null, 2));
  console.log('Fotos dos grupos salvas em groupPhotos.json!');
}

// Função para salvar mensagens recebidas
async function saveMessage(msg, mediaFilename, mimetype, mediaError = null) {
  const isGroup = msg.from && msg.from.endsWith('@g.us');
  let groupName = null;
  let senderName = null;
  let photoUrl = null;

  if (isGroup) {
    try {
      const chat = await msg.getChat();
      groupName = chat && chat.name ? chat.name : msg.from;
    } catch (err) {
      groupName = msg.from;
    }
    senderName = msg.sender?.pushname || msg.sender?.name || msg.author || msg.from;
    // Foto do remetente no grupo
    try {
      const contact = await msg.getContact();
      photoUrl = await contact.getProfilePicUrl();
    } catch {
      photoUrl = null;
    }
  } else {
    groupName = null;
    senderName = msg._data?.notifyName || msg.sender?.pushname || msg.sender?.name || msg.from;
    try {
      const contact = await msg.getContact();
      photoUrl = await contact.getProfilePicUrl();
    } catch {
      photoUrl = null;
    }
  }

  const obj = {
    from: msg.from || 'unknown',
    to: msg.to || 'unknown',
    body: msg.body || '',
    timestamp: Date.now(),
    mediaFilename,
    mimetype,
    fromMe: msg.fromMe || false,
    senderName: senderName || 'Unknown',
    groupName,
    photoUrl,
    mediaError,
    reactions: [], // <-- novo campo
    id: msg.id?.id || `temp_${Date.now()}` // ou msg.id, dependendo do formato
  };
  
  try {
    await db.saveMessage(obj);
    io.emit('nova-mensagem', obj);
  } catch (error) {
    console.error('Erro ao salvar mensagem no banco:', error);
  }
}

// Evento para mensagens recebidas (e enviadas pelo próprio bot)
client.on('message_create', async (msg) => {
  // Só salva se for enviada por você (fromMe true)
  if (msg.fromMe) {
    let mediaFilename = null;
    let mimetype = null;
    let mediaError = null;

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          mimetype = media.mimetype;
          const ext = mimetype.split('/')[1];
          mediaFilename = `media_${Date.now()}.${ext}`;
          const filepath = path.join(MEDIA_DIR, mediaFilename);
          fs.writeFileSync(filepath, media.data, 'base64');
        }
      } catch (e) {
        mediaError = 'Não foi possível baixar a mídia automaticamente.';
      }
    }
    await saveMessage(msg, mediaFilename, mimetype, mediaError);
  }
});

// Salva mensagens recebidas (de outros contatos)
client.on('message', async (msg) => {
  if (!msg.fromMe) {
    let mediaFilename = null;
    let mimetype = null;
    let mediaError = null;

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          mimetype = media.mimetype;
          const ext = mimetype.split('/')[1];
          mediaFilename = `media_${Date.now()}.${ext}`;
          const filepath = path.join(MEDIA_DIR, mediaFilename);
          fs.writeFileSync(filepath, media.data, 'base64');
        }
      } catch (e) {
        mediaError = 'Não foi possível baixar a mídia automaticamente.';
      }
    }
    await saveMessage(msg, mediaFilename, mimetype, mediaError);
  }
});

client.on('message_reaction', async (reaction) => {
  console.log('[BACKEND][message_reaction][RAW]:', reaction);

  // Corrija a extração dos campos
  let emoji = reaction.emoji || reaction.reaction;
  let msgId = (reaction.msgId && reaction.msgId.id) || reaction.msgId || (reaction._data && reaction._data.msgId && reaction._data.msgId.id);
  let sender = reaction.senderId || reaction.author || (reaction.sender && (reaction.sender._serialized || reaction.sender));
  let event = 'add'; // WhatsApp Web.js só dispara para adição

  console.log('[BACKEND][message_reaction][PARSED]:', { emoji, event, msgId, sender });

  try {
    if (event === 'add' && emoji && sender && msgId) {
      await db.addReaction(msgId, emoji, sender);
      const reactions = await db.getMessageReactions(msgId);
      io.emit('reacao-mensagem', { msgId, reactions });
      console.log('[BACKEND][message_reaction] Reação adicionada:', emoji, sender);
    }
  } catch (error) {
    console.error('[BACKEND][message_reaction] Erro ao processar reação:', error);
  }
});

// API para buscar mensagens
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Limpar mensagens
app.post('/api/clear', async (req, res) => {
  try {
    await db.clearAllMessages();
    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao limpar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Enviar mensagem via WhatsApp
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;
  console.log(`[ENVIO] Tentando enviar para: ${to} | body: "${message}"`);
  try {
    const sentMsg = await client.sendMessage(to, message);

    // Salva manualmente a mensagem enviada
    const obj = {
      from: meuNumero,
      to: to,
      body: message,
      timestamp: Date.now(),
      mediaFilename: null,
      mimetype: null,
      fromMe: true,
      senderName: meuNome || meuNumero,
      groupName: to.endsWith('@g.us') ? null : undefined,
      photoUrl: null,
      mediaError: null,
      reactions: [],
      id: sentMsg.id.id // Corrigido: usa o id da mensagem enviada
    };
    
    await db.saveMessage(obj);
    io.emit('nova-mensagem', obj);

    res.json({ ok: true });
  } catch (e) {
    console.log(`[ENVIO][ERRO] Falha ao enviar para: ${to} | body: "${message}" | erro: ${e.message}`);
    res.json({ ok: false, error: e.message });
  }
});

// Enviar mídia via WhatsApp
app.post('/api/send-media', upload.single('file'), async (req, res) => {
  const { to } = req.body;
  const file = req.file;
  if (!file) return res.status(400).json({ error: 'Arquivo não enviado' });
  try {
    const media = fs.readFileSync(file.path);
    await client.sendMessage(to, new (require('whatsapp-web.js').MessageMedia)(
      file.mimetype,
      media.toString('base64'),
      file.originalname
    ));

    const isGroup = to.endsWith('@g.us');
    let groupName = null;
    let photoUrl = null;
    if (isGroup) {
      try {
        const chat = await client.getChatById(to);
        groupName = chat?.name || to;
      } catch {
        // ignora erro
      }
    }
    let obj = {
      from: meuNumero || 'unknown',
      to: to || 'unknown',
      body: null,
      timestamp: Date.now(),
      mediaFilename: file.filename,
      mimetype: file.mimetype,
      fromMe: true,
      senderName: meuNome || meuNumero || 'Unknown',
      groupName: groupName,
      photoUrl,
      mediaError: null,
      reactions: [],
      id: `media_${Date.now()}` // ID temporário para mídia
    };
    
    await db.saveMessage(obj);
    io.emit('nova-mensagem', obj);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/upload-manual', upload.single('file'), async (req, res) => {
  const { timestamp } = req.body;
  const file = req.file;
  if (!file || !timestamp) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const messages = await db.getAllMessages();
    const msg = messages.find(m => m.timestamp == timestamp);
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });

    const ext = path.extname(file.originalname) || '';
    const mediaFilename = `media_manual_${Date.now()}${ext}`;
    const mediaPath = path.join(MEDIA_DIR, mediaFilename);
    fs.copyFileSync(file.path, mediaPath);
    fs.unlinkSync(file.path);

    // Atualizar mensagem no banco
    const updatedMsg = {
      ...msg,
      mediaFilename: mediaFilename,
      mimetype: file.mimetype,
      mediaError: null
    };
    
    await db.saveMessage(updatedMsg);
    io.emit('nova-mensagem', updatedMsg);

    res.json({ ok: true });
  } catch (error) {
    console.error('Erro ao fazer upload manual:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/react', async (req, res) => {
  const { msgTimestamp, emoji, user } = req.body;
  if (!msgTimestamp || !emoji || !user) return res.status(400).json({ error: 'Dados inválidos' });

  try {
    const messages = await db.getAllMessages();
    const msg = messages.find(m => m.timestamp == msgTimestamp);
    if (!msg) return res.status(404).json({ error: 'Mensagem não encontrada' });

    // Verificar se a reação já existe
    const reactions = await db.getMessageReactions(msg.id);
    const existingReaction = reactions.find(r => r.emoji === emoji && r.user === user);

    if (existingReaction) {
      // Remove reação
      await db.removeReaction(msg.id, emoji, user);
    } else {
      // Adiciona reação
      await db.addReaction(msg.id, emoji, user);
      
      // MVP: enviar reação para o WhatsApp
      try {
        if (msg.id) {
          const chat = await client.getChatById(msg.from);
          const message = await chat.fetchMessages({ limit: 50 }).then(msgs => msgs.find(m => m.id.id == msg.id));
          if (message) {
            await message.react(emoji);
          }
        }
      } catch (e) {
        console.log('Erro ao enviar reação para o WhatsApp:', e);
      }
    }

    const updatedReactions = await db.getMessageReactions(msg.id);
    io.emit('reacao-mensagem', { msgTimestamp, reactions: updatedReactions });
    res.json({ ok: true, reactions: updatedReactions });
  } catch (error) {
    console.error('Erro ao processar reação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// WebSocket para atualização em tempo real
io.on('connection', socket => {
  console.log('Frontend conectado via socket.io');
});

// Rotas públicas (antes da proteção)
app.get('/login', (req, res) => {
  const authUrl =
    'http://localhost:8080/realms/meu-bot/protocol/openid-connect/auth' +
    '?client_id=meu-bot-backend' +
    '&state=abc123' +
    '&redirect_uri=http://localhost:3000/callback' +
    '&scope=openid' +
    '&response_type=code';
  res.redirect(authUrl);
});

app.get('/callback', (req, res) => {
  res.send('Callback do Keycloak recebido!');
});

// Protege todas as rotas abaixo
app.use(keycloak.protect());

// Agora, arquivos estáticos e APIs exigem login
app.use('/media', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/groupPhotos.json', express.static(path.join(__dirname, 'groupPhotos.json')));
app.use(express.json());

// Rotas protegidas
app.get('/protegido', (req, res) => {
  res.send('Você está autenticado pelo Keycloak!');
});

// Outras rotas protegidas (exemplo)
app.get('/api/messages', async (req, res) => {
  try {
    const messages = await db.getAllMessages();
    res.json(messages);
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;
  console.log(`[ENVIO] Tentando enviar para: ${to} | body: "${message}"`);
  try {
    const sentMsg = await client.sendMessage(to, message);

    // Salva manualmente a mensagem enviada
    const obj = {
      from: meuNumero || 'unknown',
      to: to || 'unknown',
      body: message || '',
      timestamp: Date.now(),
      mediaFilename: null,
      mimetype: null,
      fromMe: true,
      senderName: meuNome || meuNumero || 'Unknown',
      groupName: to.endsWith('@g.us') ? null : undefined,
      photoUrl: null,
      mediaError: null,
      reactions: [],
      id: sentMsg?.id?.id || `sent_${Date.now()}` // Corrigido: usa o id da mensagem enviada
    };
    
    await db.saveMessage(obj);
    io.emit('nova-mensagem', obj);

    res.json({ ok: true });
  } catch (e) {
    console.log(`[ENVIO][ERRO] Falha ao enviar para: ${to} | body: "${message}" | erro: ${e.message}`);
    res.json({ ok: false, error: e.message });
  }
});

server.listen(3000, () => {
  console.log('Acesse http://localhost:3000');
});

client.initialize();

// Exemplo ao receber uma nova mensagem (ajuste conforme sua lógica)
function salvarMensagem(msg) {
  // Garante que reactions sempre exista
  if (!Array.isArray(msg.reactions)) {
    msg.reactions = [];
  }
  // ...salvar msg normalmente...
}

// Se você usa um array global/lista:
// Remova ou corrija este bloco, pois 'mensagens' não existe
// mensagens.push({
//   ...dadosDaMensagem,
//   reactions: Array.isArray(dadosDaMensagem.reactions) ? dadosDaMensagem.reactions : []
// });

// Ou ao receber via socket/endpoint:
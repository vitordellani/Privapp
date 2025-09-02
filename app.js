const express = require('express');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const multer = require('multer');
const session = require('express-session');
const bcrypt = require('bcrypt');
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

// Configuração de sessão
const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'sua-chave-secreta',
  resave: false,
  saveUninitialized: false,
  store: memoryStore,
  cookie: {
    secure: false, // true em produção com HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 horas
  }
}));

app.use(express.json());

// Servir arquivos estáticos ANTES das rotas protegidas
app.use('/media', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/groupPhotos.json', express.static(path.join(__dirname, 'groupPhotos.json')));

// Middleware de autenticação
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  res.redirect('/login');
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.user && req.session.user.is_admin) {
    return next();
  }
  res.status(403).json({ error: 'Acesso negado. Apenas administradores.' });
}

// Rotas de autenticação
app.get('/login', (req, res) => {
  if (req.session && req.session.user) {
    if (req.session.user.is_admin) {
      return res.redirect('/admin');
    }
    return res.redirect('/');
  }
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const user = await db.authenticateUser(username, password);
    
    if (!user) {
      return res.status(401).json({ error: 'Usuário ou senha inválidos' });
    }

    // Verificar se o usuário precisa trocar a senha
    const needsPasswordReset = await db.isPasswordResetRequired(user.id);

    req.session.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      is_admin: user.is_admin
    };

    // Marcar usuário como online
    await db.setUserOnline(user.id);

    if (needsPasswordReset) {
      res.json({ redirect: '/change-password' });
    } else if (user.is_admin) {
      res.json({ redirect: '/admin' });
    } else {
      res.json({ redirect: '/' });
    }
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/logout', async (req, res) => {
  try {
    // Marcar usuário como offline antes de destruir a sessão
    if (req.session && req.session.user) {
      await db.setUserOffline(req.session.user.id);
    }
  } catch (error) {
    console.error('Erro ao marcar usuário como offline:', error);
  }
  
  req.session.destroy((err) => {
    if (err) {
      console.error('Erro ao destruir sessão:', err);
    }
    res.redirect('/login');
  });
});

// Rota para página de administração
app.get('/admin', requireAuth, requireAdmin, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Rota para página de troca de senha
app.get('/change-password', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'change-password.html'));
});

// API para gerenciamento de usuários
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await db.getAllUsers();
    res.json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, password, email, whatsappNumber, isAdmin } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuário e senha são obrigatórios' });
    }

    const userId = await db.createUser({ username, password, email, whatsappNumber, isAdmin });
    res.json({ id: userId, message: 'Usuário criado com sucesso' });
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    if (error.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'Nome de usuário já existe' });
    } else {
      res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
});

app.put('/api/users/:id/status', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    
    await db.updateUserStatus(id, isActive);
    res.json({ message: 'Status do usuário atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar status do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.deleteUser(id);
    res.json({ message: 'Usuário excluído com sucesso' });
  } catch (error) {
    console.error('Erro ao excluir usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas para redefinição de senha
app.post('/api/users/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await db.resetUserPassword(id);
    res.json({ message: 'Senha redefinida com sucesso para 12345678' });
  } catch (error) {
    console.error('Erro ao redefinir senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/admin/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    await db.resetAdminPassword();
    res.json({ message: 'Senha do admin redefinida com sucesso para admin2509' });
  } catch (error) {
    console.error('Erro ao redefinir senha do admin:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.post('/api/change-password', requireAuth, async (req, res) => {
  try {
    console.log('🔧 Iniciando processo de troca de senha...');
    
    const { newPassword } = req.body;
    const userId = req.session.user.id;
    
    console.log(`📝 User ID: ${userId}`);
    console.log(`📝 New password length: ${newPassword ? newPassword.length : 0}`);
    
    if (!newPassword) {
      console.log('❌ Nova senha não fornecida');
      return res.status(400).json({ error: 'Nova senha é obrigatória' });
    }

    // Verificar se o usuário precisa trocar a senha
    console.log('🔍 Verificando se usuário precisa trocar senha...');
    const needsReset = await db.isPasswordResetRequired(userId);
    
    if (!needsReset) {
      console.log('❌ Usuário não precisa trocar senha');
      return res.status(400).json({ error: 'Você não precisa trocar sua senha neste momento' });
    }
    
    console.log('✅ Usuário precisa trocar senha - prosseguindo...');

    // Hash da nova senha
    console.log('🔐 Gerando hash da nova senha...');
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    console.log('✅ Hash gerado com sucesso');
    
    // Atualizar senha e marcar como não precisando de reset
    console.log('📝 Marcando senha como alterada...');
    await db.markPasswordChanged(userId);
    console.log('✅ Marcação concluída');
    
    // Atualizar a senha usando uma query direta
    console.log('💾 Atualizando senha no banco...');
    const sql = 'UPDATE users SET password = ? WHERE id = ?';
    await new Promise((resolve, reject) => {
      db.db.run(sql, [hashedNewPassword, userId], function(err) {
        if (err) {
          console.error('❌ Erro na query de atualização:', err);
          reject(err);
        } else {
          console.log(`✅ Senha atualizada! ${this.changes} linha(s) afetada(s)`);
          resolve(this.changes);
        }
      });
    });

    console.log('🎉 Processo de troca de senha concluído com sucesso!');
    res.json({ message: 'Senha alterada com sucesso' });
  } catch (error) {
    console.error('❌ Erro ao alterar senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

app.get('/api/check-password-reset', requireAuth, async (req, res) => {
  try {
    const userId = req.session.user.id;
    const needsReset = await db.isPasswordResetRequired(userId);
    const isAdmin = req.session.user.is_admin;
    res.json({ needsReset, isAdmin });
  } catch (error) {
    console.error('Erro ao verificar reset de senha:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rotas para gerenciar números de WhatsApp
app.put('/api/users/:id/whatsapp', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { whatsappNumber } = req.body;
    
    if (!whatsappNumber) {
      return res.status(400).json({ error: 'Número do WhatsApp é obrigatório' });
    }
    
    // Validar formato do número (básico)
    const cleanNumber = whatsappNumber.replace(/\D/g, '');
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return res.status(400).json({ error: 'Formato de número inválido' });
    }
    
    await db.updateUserWhatsApp(id, cleanNumber);
    res.json({ message: 'Número do WhatsApp atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar WhatsApp:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para obter usuários online
app.get('/api/users/online', requireAuth, requireAdmin, async (req, res) => {
  try {
    const onlineUsers = await db.getOnlineUsers();
    res.json(onlineUsers);
  } catch (error) {
    console.error('Erro ao buscar usuários online:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para atualizar atividade do usuário (heartbeat)
app.post('/api/user/heartbeat', requireAuth, async (req, res) => {
  try {
    await db.setUserOnline(req.session.user.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Erro no heartbeat:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Proteger a rota principal
app.get('/', requireAuth, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Arquivos estáticos já configurados acima

let whatsappClient = null;
let meuNome = null;
let meuNumero = null;
let whatsappStatus = {
  status: 'initializing',
  lastQRCode: null,
  lastError: null,
  connectedAt: null
};

// WhatsApp client
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});
whatsappClient = client;

client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima com o WhatsApp!');
  whatsappStatus.status = 'qr_received';
  whatsappStatus.lastQRCode = qr;
  io.emit('whatsapp-status', { status: 'qr_received', qr });
  
  // Na versão 1.33.2, é recomendável regenerar o QR code após um tempo
  setTimeout(() => {
    if (whatsappStatus.status === 'qr_received') {
      console.log('QR code expirado, aguardando novo QR...');
      whatsappStatus.status = 'qr_expired';
      io.emit('whatsapp-status', { status: 'qr_expired' });
    }
  }, 60000); // 60 segundos - tempo aproximado de expiração do QR
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  console.log('WhatsApp desconectado:', reason);
  whatsappStatus.status = 'disconnected';
  whatsappStatus.lastError = reason;
  whatsappStatus.connectedAt = null;
  io.emit('whatsapp-status', { status: 'disconnected', reason });
});

// Evento de falha de autenticação
client.on('auth_failure', (msg) => {
  console.error('Falha na autenticação do WhatsApp:', msg);
  whatsappStatus.status = 'auth_failure';
  whatsappStatus.lastError = msg;
  io.emit('whatsapp-status', { status: 'auth_failure', message: msg });
});

// Evento de erro
client.on('error', (err) => {
  console.error('Erro no cliente WhatsApp:', err);
  whatsappStatus.status = 'error';
  whatsappStatus.lastError = err.message;
  io.emit('whatsapp-status', { status: 'error', message: err.message });
});

client.on('ready', async () => {
  console.log('Bot pronto!');
  whatsappStatus.status = 'connected';
  whatsappStatus.lastError = null;
  whatsappStatus.connectedAt = new Date().toISOString();
  io.emit('whatsapp-status', { status: 'connected' });
  try {
    // Usando client.info em vez de client.getMe() na versão 1.33.2
    if (client.info) {
      meuNumero = client.info.wid._serialized;
      meuNome = client.info.pushname || client.info.name || meuNumero;
    }
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

// Função para enviar notificações WhatsApp
async function sendWhatsAppNotifications(msg) {
  try {
    // Obter usuários online com números de WhatsApp cadastrados
    const onlineUsers = await db.getOnlineUsers();
    const usersWithWhatsApp = onlineUsers.filter(user => user.whatsapp_number);
    
    if (usersWithWhatsApp.length === 0) {
      console.log('[NOTIFICAÇÃO] Nenhum usuário online com WhatsApp cadastrado');
      return;
    }
    
    // Determinar nome do remetente
    let senderName = 'Contato desconhecido';
    const isGroup = msg.from && msg.from.endsWith('@g.us');
    
    if (isGroup) {
      try {
        const chat = await msg.getChat();
        const groupName = chat && chat.name ? chat.name : 'Grupo';
        const memberName = msg.sender?.pushname || msg.sender?.name || 'Membro';
        senderName = `${memberName} (${groupName})`;
      } catch (err) {
        senderName = 'Grupo';
      }
    } else {
      senderName = msg._data?.notifyName || msg.sender?.pushname || msg.sender?.name || 'Contato';
    }
    
    console.log(`[NOTIFICAÇÃO] Enviando notificações para ${usersWithWhatsApp.length} usuários online`);
    
    // Enviar notificação para cada usuário online
    for (const user of usersWithWhatsApp) {
      try {
        // Salvar notificação no banco
        const notificationId = await db.saveWhatsAppNotification(user.id, msg.id.id, senderName);
        
        // Formatar número para WhatsApp (adicionar @c.us se necessário)
        let whatsappId = user.whatsapp_number;
        if (!whatsappId.includes('@')) {
          whatsappId = `${user.whatsapp_number}@c.us`;
        }
        
        // Mensagem de notificação
        const notificationMessage = `🔔 *Privapp - Nova Mensagem*\n\nVocê tem uma nova mensagem de: *${senderName}*\n\nAcesse o Privapp para visualizar: ${process.env.APP_URL || 'http://localhost:3000'}`;
        
        // Enviar notificação via WhatsApp
        await client.sendMessage(whatsappId, notificationMessage);
        
        // Marcar notificação como enviada
        await db.markNotificationSent(notificationId);
        
        console.log(`[NOTIFICAÇÃO] Enviada para ${user.username} (${user.whatsapp_number})`);
        
      } catch (error) {
        console.error(`[NOTIFICAÇÃO] Erro ao enviar para ${user.username}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('[NOTIFICAÇÃO] Erro geral ao enviar notificações:', error);
  }
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

  // Para mensagens enviadas (fromMe = true), tentar extrair o userName do body
  let userName = null;
  if (msg.fromMe && msg.body) {
    const match = msg.body.match(/^\*([^*]+)\*:/);
    if (match) {
      userName = match[1].trim();
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
  
  // Adicionar userName se encontrado
  if (userName) {
    obj.userName = userName;
  }
  
  try {
    await db.saveMessage(obj);
    io.emit('nova-mensagem', obj);
  } catch (error) {
    console.error('Erro ao salvar mensagem no banco:', error);
  }
}

// Variável para rastrear mensagens já processadas via API
let mensagensEnviadasViaAPI = new Set();
// Variável para rastrear mensagens já processadas via socket
let mensagensProcessadasViaSocket = new Set();

// Evento para mensagens recebidas (e enviadas pelo próprio bot)
client.on('message_create', async (msg) => {
  // Verifica se a mensagem já foi processada via socket
  const socketKey = `${msg.id?.id}_${Date.now()}`;
  if (mensagensProcessadasViaSocket.has(socketKey)) {
    return; // Ignora mensagens já processadas
  }
  
  // Filtrar mensagens de status@broadcast (stories)
  if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') {
    console.log('[FILTRO] Mensagem de status@broadcast ignorada:', {
      from: msg.from,
      to: msg.to,
      body: msg.body?.substring(0, 50) + '...'
    });
    return; // Ignora mensagens de stories
  }
  
  // Só salva se for enviada por você (fromMe true) E não foi enviada via API
  if (msg.fromMe && !mensagensEnviadasViaAPI.has(msg.id?.id)) {
    let mediaFilename = null;
    let mimetype = null;
    let mediaError = null;

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          mimetype = media.mimetype;
          // Extrair extensão de forma mais segura para compatibilidade com v1.33.2
          const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
          mediaFilename = `media_${Date.now()}.${ext}`;
          const filepath = path.join(MEDIA_DIR, mediaFilename);
          fs.writeFileSync(filepath, media.data, 'base64');
          console.log(`[MEDIA] Mídia salva com sucesso: ${mediaFilename}`);
        }
      } catch (e) {
        console.error('[MEDIA] Erro ao baixar mídia:', e);
        mediaError = 'Não foi possível baixar a mídia automaticamente.';
      }
    }
    await saveMessage(msg, mediaFilename, mimetype, mediaError);
  }
});

// Salva mensagens recebidas (de outros contatos)
client.on('message', async (msg) => {
  // Filtrar mensagens de status@broadcast (stories)
  if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') {
    console.log('[FILTRO] Mensagem de status@broadcast ignorada:', {
      from: msg.from,
      to: msg.to,
      body: msg.body?.substring(0, 50) + '...'
    });
    return; // Ignora mensagens de stories
  }
  
  if (!msg.fromMe) {
    let mediaFilename = null;
    let mimetype = null;
    let mediaError = null;

    if (msg.hasMedia) {
      try {
        const media = await msg.downloadMedia();
        if (media) {
          mimetype = media.mimetype;
          // Extrair extensão de forma mais segura para compatibilidade com v1.33.2
          const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
          mediaFilename = `media_${Date.now()}.${ext}`;
          const filepath = path.join(MEDIA_DIR, mediaFilename);
          fs.writeFileSync(filepath, media.data, 'base64');
          console.log(`[MEDIA] Mídia recebida salva com sucesso: ${mediaFilename}`);
        }
      } catch (e) {
        console.error('[MEDIA] Erro ao baixar mídia recebida:', e);
        mediaError = 'Não foi possível baixar a mídia automaticamente.';
      }
    }
    
    await saveMessage(msg, mediaFilename, mimetype, mediaError);
    
    // Enviar notificações WhatsApp para usuários online
    await sendWhatsAppNotifications(msg);
  }
});

client.on('message_reaction', async (reaction) => {
  console.log('[BACKEND][message_reaction][RAW]:', reaction);

  // Extração dos campos adaptada para a versão 1.33.2
  let emoji = reaction.reaction;
  let msgId = reaction.msgId;
  let sender = reaction.senderId;
  let event = reaction.reaction ? 'add' : 'remove'; // Na versão 1.33.2, reaction é null quando removida

  console.log('[BACKEND][message_reaction][PARSED]:', { emoji, event, msgId, sender });

  try {
    if (event === 'add' && emoji && sender && msgId) {
      await db.addReaction(msgId, emoji, sender);
      const reactions = await db.getMessageReactions(msgId);
      io.emit('reacao-mensagem', { msgId, reactions });
      console.log('[BACKEND][message_reaction] Reação adicionada:', emoji, sender);
    } else if (event === 'remove' && sender && msgId) {
      // Na versão 1.33.2, também podemos receber eventos de remoção de reações
      await db.removeReaction(msgId, sender);
      const reactions = await db.getMessageReactions(msgId);
      io.emit('reacao-mensagem', { msgId, reactions });
      console.log('[BACKEND][message_reaction] Reação removida por:', sender);
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

// API para obter informações do usuário logado
app.get('/api/user-info', requireAuth, (req, res) => {
  try {
    res.json({
      id: req.session.user.id,
      username: req.session.user.username,
      isAdmin: req.session.user.is_admin
    });
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para buscar nome do usuário por username
app.get('/api/user/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await db.getUserByUsername(username);
    
    if (user) {
      res.json({ username: user.username });
    } else {
      res.status(404).json({ error: 'Usuário não encontrado' });
    }
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para upload de foto de perfil
app.post('/api/profile-photo', requireAuth, upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhuma imagem foi enviada' });
    }

    const userId = req.session.user.id;
    const originalName = req.file.originalname;
    const fileExtension = path.extname(originalName).toLowerCase();
    
    // Validar extensão
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    if (!allowedExtensions.includes(fileExtension)) {
      // Remover arquivo inválido
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Formato de imagem não suportado. Use JPG, PNG, GIF ou WebP.' });
    }

    // Criar diretório para fotos de perfil se não existir
    const profilePhotosDir = path.join(__dirname, 'profile-photos');
    if (!fs.existsSync(profilePhotosDir)) {
      fs.mkdirSync(profilePhotosDir);
    }

    // Gerar nome único para o arquivo
    const fileName = `profile_${userId}_${Date.now()}${fileExtension}`;
    const newPath = path.join(profilePhotosDir, fileName);

    // Mover arquivo para o diretório de fotos de perfil
    fs.renameSync(req.file.path, newPath);

    // Atualizar caminho no banco de dados
    const relativePath = `/profile-photos/${fileName}`;
    await db.updateProfilePhoto(userId, relativePath);

    res.json({ 
      success: true, 
      photoPath: relativePath,
      message: 'Foto de perfil atualizada com sucesso!' 
    });

  } catch (error) {
    console.error('Erro ao fazer upload da foto de perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para obter foto de perfil do usuário por ID
app.get('/api/profile-photo/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const photoPath = await db.getProfilePhoto(userId);
    
    if (photoPath) {
      res.json({ photoPath });
    } else {
      res.json({ photoPath: null });
    }
  } catch (error) {
    console.error('Erro ao buscar foto de perfil:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// API para obter foto de perfil do usuário por username
app.get('/api/profile-photo/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await db.getUserByUsername(username);
    
    if (user && user.profile_photo) {
      res.json({ photoPath: user.profile_photo });
    } else {
      res.json({ photoPath: null });
    }
  } catch (error) {
    console.error('Erro ao buscar foto de perfil por username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Servir arquivos de foto de perfil
app.use('/profile-photos', express.static(path.join(__dirname, 'profile-photos')));

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

// Endpoint para verificar o status do WhatsApp
app.get('/api/whatsapp-status', requireAuth, (req, res) => {
  res.json(whatsappStatus);
});

// Endpoint para reiniciar a conexão do WhatsApp
// Rota para desconectar o WhatsApp
app.post('/api/whatsapp-disconnect', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Desconectando cliente WhatsApp...');
    
    // Atualiza o status
    whatsappStatus.status = 'disconnecting';
    io.emit('whatsapp-status', { status: 'disconnecting' });
    
    // Tenta desconectar o cliente atual se existir
    if (whatsappClient) {
      try {
        await whatsappClient.destroy();
        console.log('Cliente WhatsApp desconectado com sucesso');
        whatsappStatus.status = 'disconnected';
        io.emit('whatsapp-status', { status: 'disconnected' });
        res.json({ success: true });
      } catch (err) {
        console.error('Erro ao desconectar cliente WhatsApp:', err);
        whatsappStatus.status = 'error';
        whatsappStatus.lastError = err.message;
        io.emit('whatsapp-status', { status: 'error', error: err.message });
        res.status(500).json({ success: false, error: err.message });
      }
    } else {
      console.log('Nenhum cliente WhatsApp para desconectar');
      whatsappStatus.status = 'disconnected';
      io.emit('whatsapp-status', { status: 'disconnected' });
      res.json({ success: true });
    }
  } catch (error) {
    console.error('Erro ao processar solicitação de desconexão:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/whatsapp-restart', requireAuth, requireAdmin, async (req, res) => {
  try {
    console.log('Reiniciando cliente WhatsApp...');
    
    // Atualiza o status
    whatsappStatus.status = 'restarting';
    io.emit('whatsapp-status', { status: 'restarting' });
    
    // Tenta desconectar o cliente atual se existir
    if (whatsappClient) {
      try {
        await whatsappClient.destroy();
        console.log('Cliente WhatsApp desconectado com sucesso');
      } catch (err) {
        console.error('Erro ao desconectar cliente WhatsApp:', err);
      }
    }
    
    // Inicializa um novo cliente
    const client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    
    // Registra os eventos no novo cliente
    client.on('qr', qr => {
      qrcode.generate(qr, { small: true });
      console.log('Escaneie o QR code acima com o WhatsApp!');
      whatsappStatus.status = 'qr_received';
      whatsappStatus.lastQRCode = qr;
      io.emit('whatsapp-status', { status: 'qr_received', qr });
    });
    
    client.on('ready', async () => {
      console.log('Bot pronto!');
      whatsappStatus.status = 'connected';
      whatsappStatus.lastError = null;
      whatsappStatus.connectedAt = new Date().toISOString();
      io.emit('whatsapp-status', { status: 'connected' });
      
      try {
        // Usando client.info em vez de client.getMe() na versão 1.33.2
        if (client.info) {
          meuNumero = client.info.wid._serialized;
          meuNome = client.info.pushname || client.info.name || meuNumero;
        }
      } catch (e) {
        meuNome = 'Você';
        meuNumero = null;
      }
    });
    
    client.on('disconnected', (reason) => {
      console.log('WhatsApp desconectado:', reason);
      whatsappStatus.status = 'disconnected';
      whatsappStatus.lastError = reason;
      whatsappStatus.connectedAt = null;
      io.emit('whatsapp-status', { status: 'disconnected', reason });
    });
    
    client.on('auth_failure', (msg) => {
      console.error('Falha na autenticação do WhatsApp:', msg);
      whatsappStatus.status = 'auth_failure';
      whatsappStatus.lastError = msg;
      io.emit('whatsapp-status', { status: 'auth_failure', message: msg });
    });
    
    client.on('error', (err) => {
      console.error('Erro no cliente WhatsApp:', err);
      whatsappStatus.status = 'error';
      whatsappStatus.lastError = err.message;
      io.emit('whatsapp-status', { status: 'error', message: err.message });
    });
    
    // Evento de conexão
    client.on('loading_screen', (percent, message) => {
      console.log(`Carregando WhatsApp: ${percent}% - ${message}`);
      whatsappStatus.status = 'loading';
      io.emit('whatsapp-status', { status: 'loading', percent, message });
    });
    
    // Inicia o cliente
    client.initialize();
    console.log('Cliente WhatsApp reinicializado');
    whatsappClient = client;
    
    res.json({ success: true, message: 'Cliente WhatsApp reiniciado com sucesso' });
  } catch (error) {
    console.error('Erro ao reiniciar cliente WhatsApp:', error);
    whatsappStatus.status = 'error';
    whatsappStatus.lastError = error.message;
    res.status(500).json({ error: 'Erro ao reiniciar cliente WhatsApp', details: error.message });
  }
});

// Enviar mensagem via WhatsApp
app.post('/api/send', async (req, res) => {
  const { to, message, replyTo } = req.body;
  console.log(`[ENVIO] Tentando enviar para: ${to} | body: "${message}" | replyTo:`, replyTo);
  
  // Verificar se o usuário está autenticado
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  try {
    let sentMsg;
    
    // Adicionar assinatura do usuário à mensagem
    const mensagemComAssinatura = `*${req.session.user.username}*:\n${message}`;
    
    // Se há uma mensagem para responder, usa o método de resposta do WhatsApp
    if (replyTo && replyTo.timestamp) {
      // Busca a mensagem original no banco para obter o ID correto
      const originalMessages = await db.getAllMessages();
      const originalMsg = originalMessages.find(m => m.timestamp === replyTo.timestamp);
      
      if (originalMsg && originalMsg.id) {
        try {
          // Busca a mensagem no WhatsApp usando o chat e o ID
          const chat = await client.getChatById(to);
          const quotedMessage = await chat.fetchMessages({ limit: 100 }).then(msgs => 
            msgs.find(m => m.id.id === originalMsg.id)
          );
          
          if (quotedMessage) {
            // Envia como resposta usando a mensagem encontrada
            sentMsg = await client.sendMessage(to, mensagemComAssinatura, {
              quotedMessageId: quotedMessage.id._serialized
            });
            console.log(`[ENVIO] Mensagem enviada como resposta para: ${originalMsg.id}`);
          } else {
            // Se não encontrar a mensagem, envia normalmente
            console.log(`[ENVIO] Mensagem original não encontrada, enviando normalmente`);
            sentMsg = await client.sendMessage(to, mensagemComAssinatura);
          }
        } catch (error) {
          console.log(`[ENVIO] Erro ao buscar mensagem para resposta:`, error.message);
          // Envia normalmente em caso de erro
          sentMsg = await client.sendMessage(to, mensagemComAssinatura);
        }
      } else {
        // Se não encontrar a mensagem original, envia normalmente
        console.log(`[ENVIO] Mensagem original não encontrada no banco, enviando normalmente`);
        sentMsg = await client.sendMessage(to, mensagemComAssinatura);
      }
    } else {
      // Envio normal
      sentMsg = await client.sendMessage(to, mensagemComAssinatura);
    }

    // Marca a mensagem como enviada via API para evitar duplicação
    if (sentMsg.id?.id) {
      mensagensEnviadasViaAPI.add(sentMsg.id.id);
      // Remove da lista após 30 segundos para evitar acúmulo de memória
      setTimeout(() => {
        mensagensEnviadasViaAPI.delete(sentMsg.id.id);
      }, 30000);
    }

    // Buscar foto de perfil do usuário logado
    let userProfilePhoto = null;
    try {
      userProfilePhoto = await db.getProfilePhoto(req.session.user.id);
    } catch (error) {
      console.log('Erro ao buscar foto de perfil do usuário:', error);
    }

    // DEBUG: Verificar informações da sessão
    console.log('[DEBUG] Informações da sessão:', {
      sessionExists: !!req.session,
      userExists: !!req.session?.user,
      username: req.session?.user?.username,
      userId: req.session?.user?.id
    });

    // Salva manualmente a mensagem enviada com o nome do usuário logado
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
      id: sentMsg.id.id,
      replyTo: replyTo || null, // Inclui informações de resposta
      userName: req.session.user.username, // Nome do usuário logado para assinatura
      userProfilePhoto: userProfilePhoto // Foto de perfil do usuário logado
    };
    
    // DEBUG: Verificar objeto antes de salvar
    console.log('[DEBUG] Objeto a ser salvo:', {
      id: obj.id,
      userName: obj.userName,
      body: obj.body.substring(0, 50)
    });
    
    await db.saveMessage(obj);
    
    // Marca como processada via socket para evitar duplicação
    const socketKey = `${sentMsg.id.id}_${Date.now()}`;
    mensagensProcessadasViaSocket.add(socketKey);
    
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
  
  // Verificar se o usuário está autenticado
  if (!req.session || !req.session.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  
  try {
    const media = fs.readFileSync(file.path);
    
    // Adicionar assinatura do usuário como legenda da mídia
    const legendaComAssinatura = `*${req.session.user.username}*:`;
    
    // Importar MessageMedia da biblioteca atualizada
    const { MessageMedia } = require('whatsapp-web.js');
    
    const sentMsg = await client.sendMessage(to, new MessageMedia(
      file.mimetype,
      media.toString('base64'),
      file.originalname
    ), { caption: legendaComAssinatura });

    // Marca a mensagem como enviada via API para evitar duplicação
    if (sentMsg.id?.id) {
      mensagensEnviadasViaAPI.add(sentMsg.id.id);
      // Remove da lista após 30 segundos para evitar acúmulo de memória
      setTimeout(() => {
        mensagensEnviadasViaAPI.delete(sentMsg.id.id);
      }, 30000);
    }

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
    // Buscar foto de perfil do usuário logado
    let userProfilePhoto = null;
    try {
      userProfilePhoto = await db.getProfilePhoto(req.session.user.id);
    } catch (error) {
      console.log('Erro ao buscar foto de perfil do usuário:', error);
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
      id: `media_${Date.now()}`, // ID temporário para mídia
      userName: req.session.user.username, // Nome do usuário logado para assinatura
      userProfilePhoto: userProfilePhoto // Foto de perfil do usuário logado
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
  const { msgTimestamp, msgId, emoji, user } = req.body;
  if ((!msgTimestamp && !msgId) || !emoji || !user) {
    return res.status(400).json({ error: 'Dados inválidos - precisa de msgTimestamp ou msgId' });
  }

  try {
    const messages = await db.getAllMessages();
    let msg = null;
    
    // Tenta buscar por ID primeiro (para mensagens enviadas pela interface)
    if (msgId) {
      msg = messages.find(m => m.id === msgId);
      console.log(`[REACAO] Buscando por ID: ${msgId}, encontrada: ${!!msg}`);
    }
    
    // Se não encontrou por ID, tenta por timestamp (para compatibilidade)
    if (!msg && msgTimestamp) {
      msg = messages.find(m => m.timestamp == msgTimestamp);
      console.log(`[REACAO] Buscando por timestamp: ${msgTimestamp}, encontrada: ${!!msg}`);
    }
    
    if (!msg) {
      console.log(`[REACAO] Mensagem não encontrada. ID: ${msgId}, Timestamp: ${msgTimestamp}`);
      return res.status(404).json({ error: 'Mensagem não encontrada' });
    }

    console.log(`[REACAO] Mensagem encontrada: ID=${msg.id}, fromMe=${msg.fromMe}, from=${msg.from}`);

    // Verificar se a reação já existe
    const reactions = await db.getMessageReactions(msg.id);
    const existingReaction = reactions.find(r => r.emoji === emoji && r.user === user);

    if (existingReaction) {
      // Remove reação
      console.log(`[REACAO] Removendo reação: ${emoji} de ${user}`);
      await db.removeReaction(msg.id, emoji, user);
      
      // Remover reação do WhatsApp também
      try {
        if (msg.id) {
          const chatId = msg.fromMe ? msg.to : msg.from;
          
          if (chatId) {
            console.log(`[REACAO] Tentando remover reação do WhatsApp. Chat: ${chatId}, MsgID: ${msg.id}`);
            const chat = await client.getChatById(chatId);
            
            // Tenta diferentes estratégias de busca
            let message = null;
            let searchStrategy = '';
            
            // Estratégia 1: Busca com limite pequeno
            try {
              const messages = await chat.fetchMessages({ limit: 50 });
              message = messages.find(m => m.id.id === msg.id);
              if (message) searchStrategy = 'limite 50';
            } catch (e) {
              console.log(`[REACAO] Erro na busca com limite 50:`, e.message);
            }
            
            // Estratégia 2: Busca com limite maior
            if (!message) {
              try {
                const messages = await chat.fetchMessages({ limit: 100 });
                message = messages.find(m => m.id.id === msg.id);
                if (message) searchStrategy = 'limite 100';
              } catch (e) {
                console.log(`[REACAO] Erro na busca com limite 100:`, e.message);
              }
            }
            
            // Estratégia 3: Busca com limite muito maior
            if (!message) {
              try {
                const messages = await chat.fetchMessages({ limit: 500 });
                message = messages.find(m => m.id.id === msg.id);
                if (message) searchStrategy = 'limite 500';
              } catch (e) {
                console.log(`[REACAO] Erro na busca com limite 500:`, e.message);
              }
            }
            
            // Estratégia 4: Busca por ID direto (se disponível)
            if (!message && msg.id) {
              try {
                message = await chat.fetchMessage(msg.id);
                if (message) searchStrategy = 'fetch direto';
              } catch (e) {
                console.log(`[REACAO] Erro na busca direta:`, e.message);
              }
            }
            
            if (message) {
              // Para remover reação, envia o mesmo emoji novamente
              await message.react(emoji);
              console.log(`[REACAO] Reação removida com sucesso do WhatsApp: ${emoji} (estratégia: ${searchStrategy})`);
            } else {
              console.log(`[REACAO] Mensagem não encontrada no WhatsApp para remover reação`);
            }
          }
        }
      } catch (e) {
        console.log('[REACAO] Erro ao remover reação do WhatsApp:', e.message);
      }
    } else {
      // Adiciona reação
      console.log(`[REACAO] Adicionando reação: ${emoji} de ${user}`);
      await db.addReaction(msg.id, emoji, user);
      
      // Enviar reação para o WhatsApp
      try {
        if (msg.id) {
          // Para mensagens enviadas, busca no chat de destino (msg.to)
          // Para mensagens recebidas, busca no chat de origem (msg.from)
          const chatId = msg.fromMe ? msg.to : msg.from;
          
          if (chatId) {
            console.log(`[REACAO] Tentando enviar reação para WhatsApp. Chat: ${chatId}, MsgID: ${msg.id}, fromMe: ${msg.fromMe}`);
            const chat = await client.getChatById(chatId);
            
            // Tenta diferentes estratégias de busca
            let message = null;
            let searchStrategy = '';
            
            // Estratégia 1: Busca com limite pequeno
            try {
              const messages = await chat.fetchMessages({ limit: 50 });
              message = messages.find(m => m.id.id === msg.id);
              if (message) searchStrategy = 'limite 50';
            } catch (e) {
              console.log(`[REACAO] Erro na busca com limite 50:`, e.message);
            }
            
            // Estratégia 2: Busca com limite maior
            if (!message) {
              try {
                const messages = await chat.fetchMessages({ limit: 100 });
                message = messages.find(m => m.id.id === msg.id);
                if (message) searchStrategy = 'limite 100';
              } catch (e) {
                console.log(`[REACAO] Erro na busca com limite 100:`, e.message);
              }
            }
            
            // Estratégia 3: Busca com limite muito maior
            if (!message) {
              try {
                const messages = await chat.fetchMessages({ limit: 500 });
                message = messages.find(m => m.id.id === msg.id);
                if (message) searchStrategy = 'limite 500';
              } catch (e) {
                console.log(`[REACAO] Erro na busca com limite 500:`, e.message);
              }
            }
            
            // Estratégia 4: Busca por ID direto (se disponível)
            if (!message && msg.id) {
              try {
                message = await chat.fetchMessage(msg.id);
                if (message) searchStrategy = 'fetch direto';
              } catch (e) {
                console.log(`[REACAO] Erro na busca direta:`, e.message);
              }
            }
            
            if (message) {
              await message.react(emoji);
              console.log(`[REACAO] Reação enviada com sucesso para WhatsApp: ${emoji} (estratégia: ${searchStrategy})`);
            } else {
              console.log(`[REACAO] Mensagem não encontrada no WhatsApp após todas as estratégias. ID: ${msg.id}`);
              console.log(`[REACAO] Chat: ${chatId}, fromMe: ${msg.fromMe}`);
            }
          } else {
            console.log(`[REACAO] Chat ID não encontrado. fromMe: ${msg.fromMe}, from: ${msg.from}, to: ${msg.to}`);
          }
        }
      } catch (e) {
        console.log('[REACAO] Erro ao enviar reação para o WhatsApp:', e.message);
        console.log('[REACAO] Stack trace:', e.stack);
      }
    }

    const updatedReactions = await db.getMessageReactions(msg.id);
    console.log(`[REACAO] Reações atualizadas:`, updatedReactions);
    
    // Emite evento com ambos timestamp e ID para compatibilidade
    io.emit('reacao-mensagem', { 
      msgTimestamp: msg.timestamp, 
      msgId: msg.id,
      reactions: updatedReactions 
    });
    
    res.json({ ok: true, reactions: updatedReactions });
  } catch (error) {
    console.error('[REACAO] Erro ao processar reação:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// WebSocket para atualização em tempo real
io.on('connection', socket => {
  console.log('Frontend conectado via socket.io');
});





// Função para encontrar uma porta disponível
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Tenta a próxima porta
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Inicia o servidor na primeira porta disponível
findAvailablePort(3000).then(port => {
  server.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
    console.log(`Acesse http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});

// Evento de conexão
client.on('loading_screen', (percent, message) => {
  console.log(`Carregando WhatsApp: ${percent}% - ${message}`);
  whatsappStatus.status = 'loading';
  io.emit('whatsapp-status', { status: 'loading', percent, message });
});

client.initialize();
console.log('Cliente WhatsApp inicializado');

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
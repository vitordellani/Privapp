const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const Keycloak = require('keycloak-connect');

const MEDIA_DIR = path.join(__dirname, 'media');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

const app = express();
const server = http.createServer(app);

// Configurar compressão gzip otimizada
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Configurar Socket.IO otimizado para alta latência
const io = new Server(server, {
  pingTimeout: 60000,    // 60s (padrão: 5s)
  pingInterval: 25000,   // 25s (padrão: 25s)
  upgradeTimeout: 30000, // 30s (padrão: 10s)
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  cors: {
    origin: true,
    credentials: true
  }
});

const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'sua-chave-secreta',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

const keycloak = new Keycloak({ store: memoryStore });
app.use(keycloak.middleware());

app.use(keycloak.protect());

// Servir arquivos de mídia com cache otimizado
app.use('/media', express.static(MEDIA_DIR, {
  maxAge: '7d', // 7 dias de cache
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3') || path.endsWith('.ogg') || path.endsWith('.wav')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 dias
    } else if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 dias
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Servir arquivos estáticos com cache
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // 1 dia para arquivos estáticos
  etag: true,
  lastModified: true
}));
app.use(express.json());

// Protege todas as rotas

// API para buscar mensagens
app.get('/api/messages', (req, res) => {
  let messages = [];
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } catch {
      messages = [];
    }
  }
  res.json(messages);
});

// Limpar mensagens
app.post('/api/clear', (req, res) => {
  fs.writeFileSync(MESSAGES_FILE, '[]');
  res.json({ ok: true });
});

// Enviar mensagem via WhatsApp
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;
  console.log('Tentando enviar mensagem para:', to, '| Conteúdo:', message); // <-- Adicione esta linha
  if (!whatsappClient) {
    return res.status(500).json({ error: 'WhatsApp não conectado' });
  }
  try {
    await whatsappClient.sendMessage(to, message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// WebSocket para atualização em tempo real
io.on('connection', socket => {
  console.log('Frontend conectado via socket.io');
  // Quando uma nova mensagem chegar, emitiremos via io.emit('nova-mensagem', msg)
});

// Módulo para receber comandos do frontend e repassar ao bot
let whatsappClient = null;
function setWhatsappClient(client) {
  whatsappClient = client;
}
module.exports = { io, setWhatsappClient };

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
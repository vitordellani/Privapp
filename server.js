const express = require('express');
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
const io = new Server(server);

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

app.use('/media', express.static(MEDIA_DIR));
app.use(express.static(path.join(__dirname, 'public')));
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
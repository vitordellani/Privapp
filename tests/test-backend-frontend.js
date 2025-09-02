/**
 * Script para testar a comunicação entre backend e frontend
 * simulando o comportamento do app.js com foco no status do WhatsApp
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Criar servidor Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página de teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'backend-frontend-test.html'));
});

// API para obter status do WhatsApp
app.get('/api/whatsapp-status', (req, res) => {
  res.json(whatsappStatus);
});

// Status inicial do WhatsApp
let whatsappStatus = {
  status: 'initializing',
  lastQRCode: null,
  lastError: null,
  connectedAt: null
};

// Conexão Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar status atual para o cliente que acabou de conectar
  socket.emit('whatsapp-status', whatsappStatus);
  
  // Receber solicitação de reinicialização
  socket.on('restart-whatsapp', async () => {
    console.log('Solicitação de reinicialização recebida');
    
    if (client && client.isInitialized) {
      try {
        await client.destroy();
        console.log('Cliente WhatsApp destruído com sucesso');
      } catch (err) {
        console.error('Erro ao destruir cliente WhatsApp:', err);
      }
    }
    
    whatsappStatus.status = 'initializing';
    whatsappStatus.lastError = null;
    whatsappStatus.lastQRCode = null;
    whatsappStatus.connectedAt = null;
    
    io.emit('whatsapp-status', whatsappStatus);
    
    // Reiniciar cliente
    initializeWhatsAppClient();
  });
  
  // Desconexão do cliente
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Inicializar cliente WhatsApp
let client;
let qrTimeout;

function initializeWhatsAppClient() {
  console.log('Inicializando cliente WhatsApp...');
  
  // Limpar timeout anterior se existir
  if (qrTimeout) {
    clearTimeout(qrTimeout);
    qrTimeout = null;
  }
  
  // Inicializar cliente com as mesmas configurações do app.js
  client = new Client({
    authStrategy: new LocalAuth({ clientId: 'test-backend-frontend' }),
    puppeteer: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      headless: false // Mostrar navegador para diagnóstico
    },
    webVersionCache: {
      type: 'remote',
      remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
    }
  });
  
  // Evento de QR code
  client.on('qr', (qr) => {
    console.log('\n==== QR CODE GERADO ====');
    qrcode.generate(qr, { small: true });
    
    whatsappStatus.status = 'qr_received';
    whatsappStatus.lastQRCode = qr;
    io.emit('whatsapp-status', whatsappStatus);
    
    // Na versão 1.33.2, é recomendável regenerar o QR code após um tempo
    qrTimeout = setTimeout(() => {
      if (whatsappStatus.status === 'qr_received') {
        console.log('QR code expirado, aguardando novo QR...');
        whatsappStatus.status = 'qr_expired';
        io.emit('whatsapp-status', whatsappStatus);
      }
    }, 60000); // 60 segundos - tempo aproximado de expiração do QR
  });
  
  // Evento de autenticação
  client.on('authenticated', () => {
    console.log('\n[INFO] Cliente autenticado com sucesso!');
    whatsappStatus.status = 'authenticated';
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Evento de desconexão
  client.on('disconnected', (reason) => {
    console.log('\n[ERRO] WhatsApp desconectado:', reason);
    whatsappStatus.status = 'disconnected';
    whatsappStatus.lastError = reason;
    whatsappStatus.connectedAt = null;
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Evento de falha de autenticação
  client.on('auth_failure', (msg) => {
    console.error('\n[ERRO] Falha na autenticação do WhatsApp:', msg);
    whatsappStatus.status = 'auth_failure';
    whatsappStatus.lastError = msg;
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Evento de erro
  client.on('error', (err) => {
    console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
    whatsappStatus.status = 'error';
    whatsappStatus.lastError = err.message;
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Evento de carregamento
  client.on('loading_screen', (percent, message) => {
    console.log(`\n[INFO] Carregando: ${percent}% - ${message}`);
    whatsappStatus.status = 'loading';
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Evento de mudança de estado
  client.on('change_state', state => {
    console.log('\n[INFO] Estado do cliente alterado para:', state);
    // Não alteramos o status principal aqui, apenas logamos
  });
  
  // Evento de pronto
  client.on('ready', async () => {
    console.log('\n[SUCESSO] Bot pronto e conectado!');
    whatsappStatus.status = 'connected';
    whatsappStatus.lastError = null;
    whatsappStatus.connectedAt = new Date().toISOString();
    io.emit('whatsapp-status', whatsappStatus);
    
    try {
      // Verificar se podemos obter informações do usuário usando client.info em vez de client.getMe()
      if (client.info) {
        console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
        console.log('ID:', client.info.wid._serialized);
        console.log('Nome:', client.info.pushname || client.info.name || 'Não disponível');
        console.log('Número:', client.info.wid.user);
      } else {
        console.log('\n[AVISO] client.info não está disponível');
      }
    } catch (e) {
      console.error('\n[ERRO] Não foi possível obter informações após o evento ready:', e);
    }
  });
  
  // Iniciar cliente
  client.initialize();
}

// Iniciar servidor
const PORT = 3040;
server.listen(PORT, () => {
  console.log(`Servidor de teste rodando em http://localhost:${PORT}`);
  console.log('Acesse esta URL no navegador para testar a comunicação entre backend e frontend');
  
  // Inicializar cliente WhatsApp
  initializeWhatsAppClient();
});

// Manipular encerramento do processo
process.on('SIGINT', async () => {
  console.log('\nEncerrando teste...');
  if (client && client.isInitialized) {
    try {
      await client.destroy();
      console.log('Cliente WhatsApp desconectado com sucesso.');
    } catch (err) {
      console.error('Erro ao desconectar cliente WhatsApp:', err);
    }
  }
  
  server.close(() => {
    console.log('Servidor HTTP encerrado.');
    process.exit(0);
  });
});

// Criar diretório public se não existir
const fs = require('fs');
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}
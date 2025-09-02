/**
 * Script de teste para verificar a conexão e autenticação com whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Inicialização do cliente
 * 2. Geração do QR code
 * 3. Autenticação
 * 4. Eventos de conexão
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Status de conexão
let connectionStatus = {
  status: 'initializing',
  lastQRCode: null,
  lastError: null,
  connectedAt: null
};

console.log('Iniciando teste de conexão com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-connection' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

// Evento de QR code
client.on('qr', (qr) => {
  console.log('\n\n==== QR CODE GERADO ====');
  qrcode.generate(qr, { small: true });
  console.log('\nEscaneie o QR code acima com o WhatsApp!');
  connectionStatus.status = 'qr_received';
  connectionStatus.lastQRCode = qr;
  
  // Verificar expiração do QR code após 60 segundos
  setTimeout(() => {
    if (connectionStatus.status === 'qr_received') {
      console.log('\n[AVISO] QR code expirado, aguardando novo QR...');
      connectionStatus.status = 'qr_expired';
    }
  }, 60000);
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  console.log('\n[ERRO] WhatsApp desconectado:', reason);
  connectionStatus.status = 'disconnected';
  connectionStatus.lastError = reason;
  connectionStatus.connectedAt = null;
});

// Evento de falha de autenticação
client.on('auth_failure', (msg) => {
  console.error('\n[ERRO] Falha na autenticação do WhatsApp:', msg);
  connectionStatus.status = 'auth_failure';
  connectionStatus.lastError = msg;
});

// Evento de erro
client.on('error', (err) => {
  console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
  connectionStatus.status = 'error';
  connectionStatus.lastError = err.message;
});

// Evento de pronto
client.on('ready', async () => {
  console.log('\n[SUCESSO] Bot pronto e conectado!');
  connectionStatus.status = 'connected';
  connectionStatus.lastError = null;
  connectionStatus.connectedAt = new Date().toISOString();
  
  try {
    const info = await client.getMe();
    console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
    console.log('ID:', info.id._serialized);
    console.log('Nome:', info.pushname || info.name || 'Não disponível');
    console.log('\nTeste de conexão concluído com sucesso!');
    
    // Encerrar após 5 segundos
    setTimeout(() => {
      console.log('\nEncerrando teste...');
      process.exit(0);
    }, 5000);
  } catch (e) {
    console.error('\n[ERRO] Não foi possível obter informações do usuário:', e);
  }
});

// Iniciar cliente
console.log('Iniciando cliente WhatsApp...');
client.initialize();

// Manipular encerramento do processo
process.on('SIGINT', async () => {
  console.log('\nEncerrando teste...');
  process.exit(0);
});
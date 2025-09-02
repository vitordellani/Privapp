/**
 * Script de teste para verificar o evento 'ready' do whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Inicialização do cliente WhatsApp
 * 2. Disparo do evento 'ready'
 * 3. Atualização do status de conexão
 * 4. Logs detalhados para diagnóstico
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Status de conexão
let whatsappStatus = {
  status: 'initializing',
  lastQRCode: null,
  lastError: null,
  connectedAt: null
};

console.log('Iniciando teste do evento ready com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-ready-event' }),
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
  console.log('\n\n==== QR CODE GERADO ====');
  qrcode.generate(qr, { small: true });
  console.log('\nEscaneie o QR code acima com o WhatsApp!');
  whatsappStatus.status = 'qr_received';
  whatsappStatus.lastQRCode = qr;
  
  // Na versão 1.33.2, é recomendável regenerar o QR code após um tempo
  setTimeout(() => {
    if (whatsappStatus.status === 'qr_received') {
      console.log('QR code expirado, aguardando novo QR...');
      whatsappStatus.status = 'qr_expired';
    }
  }, 60000); // 60 segundos - tempo aproximado de expiração do QR
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  console.log('\n[ERRO] WhatsApp desconectado:', reason);
  whatsappStatus.status = 'disconnected';
  whatsappStatus.lastError = reason;
  whatsappStatus.connectedAt = null;
});

// Evento de falha de autenticação
client.on('auth_failure', (msg) => {
  console.error('\n[ERRO] Falha na autenticação do WhatsApp:', msg);
  whatsappStatus.status = 'auth_failure';
  whatsappStatus.lastError = msg;
});

// Evento de erro
client.on('error', (err) => {
  console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
  whatsappStatus.status = 'error';
  whatsappStatus.lastError = err.message;
});

// Evento de carregamento
client.on('loading_screen', (percent, message) => {
  console.log(`\n[INFO] Carregando: ${percent}% - ${message}`);
  whatsappStatus.status = 'loading';
});

// Evento de pronto
client.on('ready', async () => {
  console.log('\n[SUCESSO] Bot pronto e conectado!');
  whatsappStatus.status = 'connected';
  whatsappStatus.lastError = null;
  whatsappStatus.connectedAt = new Date().toISOString();
  
  try {
    // Verificar se podemos obter informações do usuário
    const info = await client.getMe();
    console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
    console.log('ID:', info.id._serialized);
    console.log('Nome:', info.pushname || info.name || 'Não disponível');
    console.log('Número:', info.id.user);
    
    // Verificar se podemos obter contatos
    const contacts = await client.getContacts();
    console.log(`\nNúmero de contatos: ${contacts.length}`);
    
    // Verificar se podemos obter chats
    const chats = await client.getChats();
    console.log(`\nNúmero de chats: ${chats.length}`);
    
    console.log('\n==== STATUS FINAL ====');
    console.log('Status:', whatsappStatus.status);
    console.log('Conectado em:', whatsappStatus.connectedAt);
    
    console.log('\nTeste concluído com sucesso! O evento ready está funcionando corretamente.');
  } catch (e) {
    console.error('\n[ERRO] Não foi possível obter informações após o evento ready:', e);
    console.log('\nO evento ready foi disparado, mas houve erro ao acessar as APIs do WhatsApp.');
  }
});

// Iniciar cliente
console.log('Iniciando cliente WhatsApp...');
client.initialize();

// Manipular encerramento do processo
process.on('SIGINT', async () => {
  console.log('\nEncerrando teste...');
  try {
    await client.destroy();
    console.log('Cliente WhatsApp desconectado com sucesso.');
  } catch (err) {
    console.error('Erro ao desconectar cliente WhatsApp:', err);
  }
  process.exit(0);
});

// Adicionar verificação periódica do status
setInterval(() => {
  console.log('\n==== STATUS ATUAL ====');
  console.log('Status:', whatsappStatus.status);
  console.log('Último erro:', whatsappStatus.lastError || 'Nenhum');
  console.log('Conectado em:', whatsappStatus.connectedAt || 'Não conectado');
  
  // Verificar estado interno do cliente
  console.log('\n==== ESTADO INTERNO DO CLIENTE ====');
  console.log('Cliente inicializado:', client.isInitialized ? 'Sim' : 'Não');
  console.log('Puppeteer inicializado:', client.pupBrowser ? 'Sim' : 'Não');
  console.log('Página inicializada:', client.pupPage ? 'Sim' : 'Não');
  
  // Verificar se o cliente está realmente conectado
  if (client.info) {
    console.log('\n==== INFORMAÇÕES DO CLIENTE ====');
    console.log('WID:', client.info.wid ? client.info.wid._serialized : 'Não disponível');
    console.log('Plataforma:', client.info.platform || 'Não disponível');
    console.log('WhatsApp Web versão:', client.info.wa_version || 'Não disponível');
  } else {
    console.log('\nInformações do cliente não disponíveis.');
  }
}, 30000); // A cada 30 segundos
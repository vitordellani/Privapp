/**
 * Script para depuração avançada do evento 'ready' do whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Monitoramento detalhado do evento 'ready'
 * 2. Verificação de propriedades internas do cliente
 * 3. Logs detalhados para diagnóstico
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

// Status de conexão
let whatsappStatus = {
  status: 'initializing',
  lastQRCode: null,
  lastError: null,
  connectedAt: null,
  events: []
};

// Função para registrar eventos
function logEvent(eventName, data = null) {
  const timestamp = new Date().toISOString();
  const event = { timestamp, eventName, data };
  whatsappStatus.events.push(event);
  console.log(`\n[EVENTO] ${timestamp} - ${eventName}`, data ? data : '');
}

console.log('Iniciando depuração avançada do evento ready com whatsapp-web.js v1.33.2...');

// Verificar arquivos de sessão
const sessionDir = path.join(process.cwd(), '.wwebjs_auth', 'session-ready-debug');
const sessionExists = fs.existsSync(sessionDir);

console.log(`\nVerificando diretório de sessão: ${sessionDir}`);
console.log(`Sessão existente: ${sessionExists ? 'Sim' : 'Não'}`);

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'ready-debug' }),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    headless: true, // Usar modo headless para evitar problemas
    devtools: false // Desativar DevTools para evitar problemas
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});

// Monitorar todas as propriedades do cliente
function inspectClient() {
  console.log('\n==== INSPEÇÃO DO CLIENTE ====');
  
  // Propriedades principais
  const properties = [
    'isInitialized', 'authStrategy', 'info', 'options',
    'pupBrowser', 'pupPage'
  ];
  
  properties.forEach(prop => {
    try {
      if (prop === 'pupBrowser' || prop === 'pupPage') {
        console.log(`${prop}: ${client[prop] ? 'Disponível' : 'Não disponível'}`);
      } else if (prop === 'info' || prop === 'options' || prop === 'authStrategy') {
        console.log(`${prop}: ${JSON.stringify(client[prop], null, 2)}`);
      } else {
        console.log(`${prop}: ${client[prop]}`);
      }
    } catch (e) {
      console.log(`${prop}: Erro ao acessar - ${e.message}`);
    }
  });
  
  // Verificar métodos disponíveis
  console.log('\nMétodos disponíveis:');
  const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
    .filter(name => typeof client[name] === 'function');
  console.log(methods);
}

// Evento de QR code
client.on('qr', (qr) => {
  logEvent('qr');
  console.log('\n\n==== QR CODE GERADO ====');
  qrcode.generate(qr, { small: true });
  console.log('\nEscaneie o QR code acima com o WhatsApp!');
  whatsappStatus.status = 'qr_received';
  whatsappStatus.lastQRCode = qr;
});

// Evento de autenticação
client.on('authenticated', () => {
  logEvent('authenticated');
  console.log('\n[INFO] Cliente autenticado com sucesso!');
  whatsappStatus.status = 'authenticated';
  
  // Inspecionar cliente após autenticação
  inspectClient();
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  logEvent('disconnected', reason);
  console.log('\n[ERRO] WhatsApp desconectado:', reason);
  whatsappStatus.status = 'disconnected';
  whatsappStatus.lastError = reason;
  whatsappStatus.connectedAt = null;
});

// Evento de falha de autenticação
client.on('auth_failure', (msg) => {
  logEvent('auth_failure', msg);
  console.error('\n[ERRO] Falha na autenticação do WhatsApp:', msg);
  whatsappStatus.status = 'auth_failure';
  whatsappStatus.lastError = msg;
});

// Evento de erro
client.on('error', (err) => {
  logEvent('error', err.message);
  console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
  whatsappStatus.status = 'error';
  whatsappStatus.lastError = err.message;
});

// Evento de carregamento
client.on('loading_screen', (percent, message) => {
  logEvent('loading_screen', { percent, message });
  console.log(`\n[INFO] Carregando: ${percent}% - ${message}`);
  whatsappStatus.status = 'loading';
});

// Evento de mudança de estado
client.on('change_state', state => {
  logEvent('change_state', state);
  console.log('\n[INFO] Estado do cliente alterado para:', state);
});

// Evento de mudança de bateria
client.on('change_battery', batteryInfo => {
  logEvent('change_battery', batteryInfo);
  console.log('\n[INFO] Informações de bateria atualizadas:', batteryInfo);
});

// Evento de pronto
client.on('ready', async () => {
  logEvent('ready');
  console.log('\n[SUCESSO] Bot pronto e conectado!');
  whatsappStatus.status = 'connected';
  whatsappStatus.lastError = null;
  whatsappStatus.connectedAt = new Date().toISOString();
  
  // Inspecionar cliente após evento ready
  inspectClient();
  
  try {
    // Verificar se podemos obter informações do usuário
    console.log('\n[INFO] Tentando obter informações do usuário...');
    const info = client.info;
    console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
    console.log('ID:', info.wid._serialized);
    console.log('Nome:', info.pushname || 'Não disponível');
    console.log('Número:', info.wid.user);
    
    // Mostrar sequência de eventos
    console.log('\n==== SEQUÊNCIA DE EVENTOS ====');
    whatsappStatus.events.forEach((event, index) => {
      console.log(`${index + 1}. [${event.timestamp}] ${event.eventName}`, event.data ? event.data : '');
    });
    
    // Salvar log de eventos em arquivo
    const logDir = path.join(__dirname, 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir);
    }
    
    const logFile = path.join(logDir, `ready-debug-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify({
      status: whatsappStatus,
      events: whatsappStatus.events,
      timestamp: new Date().toISOString()
    }, null, 2));
    console.log(`\nLog de eventos salvo em: ${logFile}`);
    
    console.log('\n==== STATUS FINAL ====');
    console.log('Status:', whatsappStatus.status);
    console.log('Conectado em:', whatsappStatus.connectedAt);
    
    console.log('\nTeste concluído com sucesso!');
  } catch (e) {
    console.error('\n[ERRO] Não foi possível obter informações após o evento ready:', e);
    console.log('\nO evento ready foi disparado, mas houve erro ao acessar as APIs do WhatsApp.');
  }
});

// Iniciar cliente
console.log('Iniciando cliente WhatsApp...');
logEvent('initialize');
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

// Criar diretório de logs se não existir
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}
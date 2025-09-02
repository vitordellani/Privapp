/**
 * Script de teste para verificar o estado de autenticação do whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Estado de autenticação do cliente
 * 2. Verificação do arquivo de sessão
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
  authenticationEvents: []
};

console.log('Iniciando teste de estado de autenticação com whatsapp-web.js v1.33.2...');

// Verificar arquivos de sessão
const sessionDir = path.join(process.cwd(), '.wwebjs_auth', 'session-test-auth-state');
const sessionExists = fs.existsSync(sessionDir);

console.log(`\nVerificando diretório de sessão: ${sessionDir}`);
console.log(`Sessão existente: ${sessionExists ? 'Sim' : 'Não'}`);

if (sessionExists) {
  try {
    const files = fs.readdirSync(sessionDir);
    console.log(`\nArquivos de sessão encontrados: ${files.length}`);
    files.forEach(file => {
      console.log(`- ${file}`);
    });
  } catch (err) {
    console.error('Erro ao ler diretório de sessão:', err);
  }
}

// Função para registrar eventos
function logEvent(eventName, data = null) {
  const timestamp = new Date().toISOString();
  const event = { timestamp, eventName, data };
  whatsappStatus.authenticationEvents.push(event);
  console.log(`\n[EVENTO] ${timestamp} - ${eventName}`, data ? data : '');
}

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-auth-state' }),
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
  
  // Verificar arquivos de sessão após autenticação
  setTimeout(() => {
    try {
      if (fs.existsSync(sessionDir)) {
        const files = fs.readdirSync(sessionDir);
        console.log(`\n[INFO] Arquivos de sessão após autenticação: ${files.length}`);
        files.forEach(file => {
          const filePath = path.join(sessionDir, file);
          const stats = fs.statSync(filePath);
          console.log(`- ${file} (${stats.size} bytes, modificado em ${stats.mtime})`);
          
          // Se for um arquivo JSON, tentar ler e mostrar conteúdo
          if (file.endsWith('.json')) {
            try {
              const content = fs.readFileSync(filePath, 'utf8');
              const json = JSON.parse(content);
              console.log(`  Conteúdo: ${JSON.stringify(json).substring(0, 100)}...`);
            } catch (e) {
              console.log(`  Erro ao ler arquivo JSON: ${e.message}`);
            }
          }
        });
      }
    } catch (err) {
      console.error('Erro ao verificar arquivos de sessão após autenticação:', err);
    }
  }, 2000);
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

// Evento de pronto
client.on('ready', async () => {
  logEvent('ready');
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
    
    // Mostrar sequência de eventos de autenticação
    console.log('\n==== SEQUÊNCIA DE EVENTOS DE AUTENTICAÇÃO ====');
    whatsappStatus.authenticationEvents.forEach((event, index) => {
      console.log(`${index + 1}. [${event.timestamp}] ${event.eventName}`, event.data ? event.data : '');
    });
    
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
  
  // Verificar se o cliente está autenticado
  console.log('\n==== ESTADO DE AUTENTICAÇÃO ====');
  if (client.authStrategy) {
    console.log('Estratégia de autenticação:', client.authStrategy.constructor.name);
    if (client.authStrategy.clientId) {
      console.log('ID do cliente:', client.authStrategy.clientId);
    }
  } else {
    console.log('Estratégia de autenticação não disponível');
  }
}, 30000); // A cada 30 segundos
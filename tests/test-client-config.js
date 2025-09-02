/**
 * Script de teste para verificar diferentes configurações do cliente WhatsApp
 * 
 * Este script testa:
 * 1. Inicialização com diferentes configurações de webVersionCache
 * 2. Opções de puppeteer modificadas
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
  connectedAt: null
};

console.log('Iniciando teste de configurações do cliente com whatsapp-web.js v1.33.2...');

// Perguntar qual configuração testar
console.log('\nEscolha a configuração a ser testada:');
console.log('1. Configuração padrão do app.js (webVersionCache remoto)');
console.log('2. Configuração com webVersionCache local');
console.log('3. Configuração com puppeteer headless=true');
console.log('4. Configuração com puppeteer headless=false e devtools=true');

const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
});

readline.question('Digite o número da configuração (1-4): ', async (option) => {
  readline.close();
  
  let clientConfig = {};
  let configName = '';
  
  switch(option) {
    case '1':
      configName = 'Configuração padrão do app.js (webVersionCache remoto)';
      clientConfig = {
        authStrategy: new LocalAuth({ clientId: 'test-config-remote' }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: false
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
      };
      break;
    case '2':
      configName = 'Configuração com webVersionCache local';
      clientConfig = {
        authStrategy: new LocalAuth({ clientId: 'test-config-local' }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: false
        },
        webVersionCache: {
          type: 'local'
        }
      };
      break;
    case '3':
      configName = 'Configuração com puppeteer headless=true';
      clientConfig = {
        authStrategy: new LocalAuth({ clientId: 'test-config-headless' }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: true
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
      };
      break;
    case '4':
      configName = 'Configuração com puppeteer headless=false e devtools=true';
      clientConfig = {
        authStrategy: new LocalAuth({ clientId: 'test-config-devtools' }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: false,
          devtools: true
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
      };
      break;
    default:
      console.log('Opção inválida. Usando configuração padrão.');
      configName = 'Configuração padrão do app.js (webVersionCache remoto)';
      clientConfig = {
        authStrategy: new LocalAuth({ clientId: 'test-config-default' }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          headless: false
        },
        webVersionCache: {
          type: 'remote',
          remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
        }
      };
  }
  
  console.log(`\nTestando com: ${configName}`);
  console.log('Configuração:', JSON.stringify(clientConfig, null, 2));
  
  // Inicializar cliente com a configuração escolhida
  const client = new Client(clientConfig);
  
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
  
  // Evento de autenticação
  client.on('authenticated', () => {
    console.log('\n[INFO] Cliente autenticado com sucesso!');
    whatsappStatus.status = 'authenticated';
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
  
  // Evento de mudança de estado
  client.on('change_state', state => {
    console.log('\n[INFO] Estado do cliente alterado para:', state);
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
      
      // Salvar resultado do teste
      const testResult = {
        timestamp: new Date().toISOString(),
        configName,
        config: clientConfig,
        status: whatsappStatus.status,
        connectedAt: whatsappStatus.connectedAt,
        userInfo: {
          id: info.id._serialized,
          name: info.pushname || info.name || 'Não disponível',
          number: info.id.user
        }
      };
      
      const resultDir = path.join(__dirname, 'results');
      if (!fs.existsSync(resultDir)) {
        fs.mkdirSync(resultDir);
      }
      
      const resultFile = path.join(resultDir, `config-test-${Date.now()}.json`);
      fs.writeFileSync(resultFile, JSON.stringify(testResult, null, 2));
      console.log(`\nResultado do teste salvo em: ${resultFile}`);
      
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
});
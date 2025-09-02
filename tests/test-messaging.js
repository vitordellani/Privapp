/**
 * Script de teste para verificar o envio e recebimento de mensagens com whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Envio de mensagens de texto
 * 2. Recebimento de mensagens
 * 3. Formatação de mensagens
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');

// Criar interface de leitura para entrada do usuário
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Status de conexão
let connectionStatus = {
  status: 'initializing',
  connectedAt: null
};

console.log('Iniciando teste de mensagens com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-messaging' }),
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
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  console.log('\n[ERRO] WhatsApp desconectado:', reason);
  connectionStatus.status = 'disconnected';
  connectionStatus.connectedAt = null;
});

// Evento de erro
client.on('error', (err) => {
  console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
});

// Evento de pronto
client.on('ready', async () => {
  console.log('\n[SUCESSO] Bot pronto e conectado!');
  connectionStatus.status = 'connected';
  connectionStatus.connectedAt = new Date().toISOString();
  
  try {
    const info = await client.getMe();
    console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
    console.log('ID:', info.id._serialized);
    console.log('Nome:', info.pushname || info.name || 'Não disponível');
    
    // Iniciar teste de mensagens
    startMessagingTest();
  } catch (e) {
    console.error('\n[ERRO] Não foi possível obter informações do usuário:', e);
  }
});

// Evento de mensagem recebida
client.on('message', async (msg) => {
  // Filtrar mensagens de status@broadcast (stories)
  if (msg.from === 'status@broadcast' || msg.to === 'status@broadcast') {
    return;
  }
  
  console.log('\n==== MENSAGEM RECEBIDA ====');
  console.log('De:', msg.from);
  console.log('Conteúdo:', msg.body);
  
  if (msg.hasMedia) {
    console.log('Contém mídia:', msg.type);
    try {
      const media = await msg.downloadMedia();
      console.log('Mídia baixada com sucesso!');
      console.log('Tipo MIME:', media.mimetype);
    } catch (e) {
      console.error('Erro ao baixar mídia:', e);
    }
  }
});

// Função para iniciar teste de mensagens
async function startMessagingTest() {
  console.log('\n==== TESTE DE MENSAGENS ====');
  console.log('Digite o número de telefone para enviar mensagem (com código do país, ex: 5511999999999):');
  
  rl.question('Número: ', async (phoneNumber) => {
    // Formatar número para WhatsApp
    const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    
    console.log('\nDigite a mensagem a ser enviada:');
    rl.question('Mensagem: ', async (message) => {
      try {
        console.log('\nEnviando mensagem...');
        const sentMsg = await client.sendMessage(chatId, message);
        console.log('[SUCESSO] Mensagem enviada com ID:', sentMsg.id.id);
        
        console.log('\nAguardando resposta por 60 segundos...');
        console.log('(Você pode responder a mensagem no WhatsApp para testar o recebimento)');
        
        // Aguardar 60 segundos para receber resposta
        setTimeout(() => {
          console.log('\nTeste de mensagens concluído!');
          console.log('Pressione Ctrl+C para encerrar o teste.');
        }, 60000);
      } catch (e) {
        console.error('\n[ERRO] Falha ao enviar mensagem:', e);
        console.log('Pressione Ctrl+C para encerrar o teste.');
      }
    });
  });
}

// Iniciar cliente
console.log('Iniciando cliente WhatsApp...');
client.initialize();

// Manipular encerramento do processo
process.on('SIGINT', async () => {
  console.log('\nEncerrando teste...');
  rl.close();
  process.exit(0);
});
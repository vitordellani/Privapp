/**
 * Script de teste para verificar as reações de mensagens com whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Recebimento de reações
 * 2. Processamento de eventos de reação
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

console.log('Iniciando teste de reações com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-reactions' }),
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
    
    // Iniciar teste de reações
    startReactionTest();
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
  console.log('ID da mensagem:', msg.id.id);
  console.log('Conteúdo:', msg.body);
});

// Evento de reação de mensagem
client.on('message_reaction', async (reaction) => {
  console.log('\n==== REAÇÃO RECEBIDA ====');
  console.log('Dados brutos:', reaction);
  
  // Extração dos campos adaptada para a versão 1.33.2
  const emoji = reaction.reaction;
  const msgId = reaction.msgId;
  const sender = reaction.senderId;
  const event = reaction.reaction ? 'add' : 'remove';
  
  console.log('\n==== REAÇÃO PROCESSADA ====');
  console.log('Emoji:', emoji);
  console.log('ID da mensagem:', msgId);
  console.log('Remetente:', sender);
  console.log('Evento:', event);
});

// Função para iniciar teste de reações
async function startReactionTest() {
  console.log('\n==== TESTE DE REAÇÕES ====');
  console.log('Digite o número de telefone para enviar mensagem (com código do país, ex: 5511999999999):');
  
  rl.question('Número: ', async (phoneNumber) => {
    // Formatar número para WhatsApp
    const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    
    try {
      console.log('\nEnviando mensagem para teste de reação...');
      const sentMsg = await client.sendMessage(chatId, 'Esta é uma mensagem de teste para reações. Por favor, reaja a esta mensagem com um emoji.');
      console.log('[SUCESSO] Mensagem enviada com ID:', sentMsg.id.id);
      
      console.log('\nInstruções:');
      console.log('1. No WhatsApp, pressione e segure a mensagem enviada');
      console.log('2. Selecione "Reagir" e escolha um emoji');
      console.log('3. Depois, remova a reação (pressione o mesmo emoji)');
      console.log('4. Observe os eventos de reação sendo registrados no console');
      
      console.log('\nAguardando reações por 120 segundos...');
      
      // Aguardar 120 segundos para receber reações
      setTimeout(() => {
        console.log('\nTeste de reações concluído!');
        console.log('Pressione Ctrl+C para encerrar o teste.');
      }, 120000);
    } catch (e) {
      console.error('\n[ERRO] Falha ao enviar mensagem:', e);
      console.log('Pressione Ctrl+C para encerrar o teste.');
    }
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
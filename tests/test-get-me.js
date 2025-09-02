/**
 * Script para testar o método getMe() do whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Conexão com o WhatsApp Web
 * 2. Chamada do método getMe() após o evento ready
 * 3. Logs detalhados para diagnóstico
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

console.log('Iniciando teste do método getMe() com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-get-me' }),
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
});

// Evento de autenticação
client.on('authenticated', () => {
  console.log('\n[INFO] Cliente autenticado com sucesso!');
});

// Evento de desconexão
client.on('disconnected', (reason) => {
  console.log('\n[ERRO] WhatsApp desconectado:', reason);
});

// Evento de erro
client.on('error', (err) => {
  console.error('\n[ERRO] Erro no cliente WhatsApp:', err);
});

// Evento de pronto
client.on('ready', async () => {
  console.log('\n[SUCESSO] Bot pronto e conectado!');
  
  try {
    console.log('\n[INFO] Tentando obter informações do usuário com getMe()...');
    console.time('getMe');
    
    // Verificar se podemos obter informações do usuário
    const info = await client.getMe();
    console.timeEnd('getMe');
    
    console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
    console.log('ID:', info.id._serialized);
    console.log('Nome:', info.pushname || info.name || 'Não disponível');
    console.log('Número:', info.id.user);
    console.log('Objeto completo:', JSON.stringify(info, null, 2));
    
    // Verificar outras propriedades do cliente
    console.log('\n==== VERIFICANDO OUTRAS PROPRIEDADES DO CLIENTE ====');
    
    // Verificar info
    console.log('\n[INFO] Verificando client.info...');
    console.time('client.info');
    if (client.info) {
      console.log('client.info disponível:', JSON.stringify(client.info, null, 2));
    } else {
      console.log('client.info não disponível');
    }
    console.timeEnd('client.info');
    
    // Verificar contatos
    console.log('\n[INFO] Verificando client.getContacts()...');
    console.time('getContacts');
    try {
      const contacts = await client.getContacts();
      console.log(`Número de contatos: ${contacts.length}`);
    } catch (e) {
      console.error('Erro ao obter contatos:', e);
    }
    console.timeEnd('getContacts');
    
    // Verificar chats
    console.log('\n[INFO] Verificando client.getChats()...');
    console.time('getChats');
    try {
      const chats = await client.getChats();
      console.log(`Número de chats: ${chats.length}`);
    } catch (e) {
      console.error('Erro ao obter chats:', e);
    }
    console.timeEnd('getChats');
    
    // Verificar estado de conexão
    console.log('\n[INFO] Verificando estado de conexão...');
    console.log('client.isInitialized:', client.isInitialized);
    console.log('client.pupBrowser disponível:', !!client.pupBrowser);
    console.log('client.pupPage disponível:', !!client.pupPage);
    
    console.log('\nTeste concluído com sucesso!');
  } catch (e) {
    console.error('\n[ERRO] Erro ao executar getMe():', e);
    console.log('\nDetalhes do erro:');
    console.log('Mensagem:', e.message);
    console.log('Stack:', e.stack);
    
    // Verificar estado do cliente após o erro
    console.log('\n[INFO] Estado do cliente após erro:');
    console.log('client.isInitialized:', client.isInitialized);
    console.log('client.pupBrowser disponível:', !!client.pupBrowser);
    console.log('client.pupPage disponível:', !!client.pupPage);
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
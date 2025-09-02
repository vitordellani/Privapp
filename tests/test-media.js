/**
 * Script de teste para verificar o envio e recebimento de mídia com whatsapp-web.js v1.33.2
 * 
 * Este script testa:
 * 1. Envio de imagens
 * 2. Envio de documentos
 * 3. Recebimento de mídia
 */

const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

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

console.log('Iniciando teste de mídia com whatsapp-web.js v1.33.2...');

// Inicializar cliente com as mesmas configurações do app.js
const client = new Client({
  authStrategy: new LocalAuth({ clientId: 'test-media' }),
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
    // Usando client.info em vez de client.getMe() na versão 1.33.2
    if (client.info) {
      console.log('\n==== INFORMAÇÕES DO USUÁRIO ====');
      console.log('ID:', client.info.wid._serialized);
      console.log('Nome:', client.info.pushname || client.info.name || 'Não disponível');
      
      // Iniciar teste de mídia
      startMediaTest();
    } else {
      console.log('\n[AVISO] client.info não está disponível');
      // Iniciar teste de mídia mesmo sem informações do usuário
      startMediaTest();
    }
  } catch (e) {
    console.error('\n[ERRO] Não foi possível obter informações do usuário:', e);
    // Tentar iniciar teste de mídia mesmo com erro
    startMediaTest();
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
      
      // Salvar mídia recebida
      const ext = media.mimetype.split('/')[1]?.split(';')[0] || 'bin';
      const filename = `received_media_${Date.now()}.${ext}`;
      const filepath = path.join(__dirname, filename);
      
      fs.writeFileSync(filepath, media.data, 'base64');
      console.log(`Mídia salva em: ${filepath}`);
    } catch (e) {
      console.error('Erro ao baixar mídia:', e);
    }
  }
});

// Função para iniciar teste de mídia
async function startMediaTest() {
  console.log('\n==== TESTE DE MÍDIA ====');
  console.log('Digite o número de telefone para enviar mídia (com código do país, ex: 5511999999999):');
  
  rl.question('Número: ', async (phoneNumber) => {
    // Formatar número para WhatsApp
    const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    
    console.log('\nDigite o caminho completo para o arquivo de mídia:');
    rl.question('Caminho: ', async (filePath) => {
      try {
        if (!fs.existsSync(filePath)) {
          console.error('\n[ERRO] Arquivo não encontrado!');
          console.log('Pressione Ctrl+C para encerrar o teste.');
          return;
        }
        
        const mimetype = getMimeType(filePath);
        const data = fs.readFileSync(filePath, { encoding: 'base64' });
        const filename = path.basename(filePath);
        
        const media = new MessageMedia(mimetype, data, filename);
        
        console.log('\nEnviando mídia...');
        const sentMsg = await client.sendMessage(chatId, media, { 
          caption: 'Teste de mídia com whatsapp-web.js v1.33.2'
        });
        
        console.log('[SUCESSO] Mídia enviada com ID:', sentMsg.id.id);
        console.log('\nAguardando resposta por 60 segundos...');
        console.log('(Você pode responder com outra mídia no WhatsApp para testar o recebimento)');
        
        // Aguardar 60 segundos para receber resposta
        setTimeout(() => {
          console.log('\nTeste de mídia concluído!');
          console.log('Pressione Ctrl+C para encerrar o teste.');
        }, 60000);
      } catch (e) {
        console.error('\n[ERRO] Falha ao enviar mídia:', e);
        console.log('Pressione Ctrl+C para encerrar o teste.');
      }
    });
  });
}

// Função para obter o tipo MIME com base na extensão do arquivo
function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  const mimeTypes = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.mp3': 'audio/mpeg',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.txt': 'text/plain'
  };
  
  return mimeTypes[ext] || 'application/octet-stream';
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
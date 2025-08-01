const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const path = require('path');

const MEDIA_DIR = path.join(__dirname, 'media');
if (!fs.existsSync(MEDIA_DIR)) fs.mkdirSync(MEDIA_DIR);

const MESSAGES_FILE = path.join(__dirname, 'messages.json');

const client = new Client({
  authStrategy: new LocalAuth()
});

client.on('qr', qr => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima com o WhatsApp!');
});

client.on('ready', () => {
  console.log('Bot pronto!');
});

function saveMessage(msg, mediaFilename, mimetype) {
  let messages = [];
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } catch {
      messages = [];
    }
  }
  messages.push({
    from: msg.from,
    body: msg.body,
    timestamp: Date.now(),
    mediaFilename,
    mimetype
  });
  fs.writeFileSync(MESSAGES_FILE, JSON.stringify(messages, null, 2));
}

client.on('message', async msg => {
  let mediaFilename = null;
  let mimetype = null;

  if (msg.hasMedia) {
    const media = await msg.downloadMedia();
    if (media) {
      mimetype = media.mimetype;
      const ext = mimetype.split('/')[1];
      mediaFilename = `media_${Date.now()}.${ext}`;
      const filepath = path.join(MEDIA_DIR, mediaFilename);
      fs.writeFileSync(filepath, media.data, 'base64');
      console.log('Mídia salva:', mediaFilename);
    }
  }

  saveMessage(msg, mediaFilename, mimetype);

  if (msg.body === 'Oi') {
    msg.reply('Olá! Bot funcionando no meu bot API.');
  }
});

client.initialize();
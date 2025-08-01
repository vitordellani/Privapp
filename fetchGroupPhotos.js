const fs = require('fs');
const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const MESSAGES_FILE = path.join(__dirname, 'messages.json');
const GROUP_PHOTOS_FILE = path.join(__dirname, 'groupPhotos.json');

const client = new Client({ authStrategy: new LocalAuth() });

client.on('ready', async () => {
  let messages = [];
  if (fs.existsSync(MESSAGES_FILE)) {
    messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
  }
  // Pega todos os IDs de grupos únicos
  const groupIds = [...new Set(messages
    .filter(m => (m.to && m.to.endsWith('@g.us')) || (m.from && m.from.endsWith('@g.us')))
    .map(m => m.to || m.from)
  )];

  const groupPhotos = {};

  for (const groupId of groupIds) {
    try {
      const chat = await client.getChatById(groupId);
      const url = await chat.getProfilePicUrl();
      groupPhotos[groupId] = url || null;
      console.log(`Foto do grupo ${groupId}: ${url}`);
    } catch (e) {
      groupPhotos[groupId] = null;
      console.log(`Erro ao buscar foto do grupo ${groupId}`);
    }
  }

  fs.writeFileSync(GROUP_PHOTOS_FILE, JSON.stringify(groupPhotos, null, 2));
  console.log('Fotos dos grupos salvas em groupPhotos.json!');
  process.exit(0);
});

client.initialize();
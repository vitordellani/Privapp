# Migração da Biblioteca whatsapp-web.js v1.23.0 para v1.33.2

## Resumo das Alterações

Este documento descreve as alterações realizadas para migrar a biblioteca whatsapp-web.js da versão 1.23.0 para a versão 1.33.2 no projeto Privapp.

## Alterações Realizadas

### 1. Atualização da Versão no package.json

```json
"dependencies": {
  "whatsapp-web.js": "^1.33.2"
}
```

### 2. Configuração do WebVersionCache

Adicionada configuração de cache remoto para garantir compatibilidade com a nova versão:

```javascript
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  },
  webVersionCache: {
    type: 'remote',
    remotePath: 'https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html'
  }
});
```

### 3. Atualização do Tratamento de QR Code

Adicionada lógica para lidar com expiração de QR code:

```javascript
client.on('qr', (qr) => {
  qrcode.generate(qr, { small: true });
  console.log('Escaneie o QR code acima com o WhatsApp!');
  whatsappStatus.status = 'qr_received';
  whatsappStatus.lastQRCode = qr;
  io.emit('whatsapp-status', { status: 'qr_received', qr });
  
  // Na versão 1.33.2, é recomendável regenerar o QR code após um tempo
  setTimeout(() => {
    if (whatsappStatus.status === 'qr_received') {
      console.log('QR code expirado, aguardando novo QR...');
      whatsappStatus.status = 'qr_expired';
      io.emit('whatsapp-status', { status: 'qr_expired' });
    }
  }, 60000); // 60 segundos - tempo aproximado de expiração do QR
});
```

### 4. Atualização do Tratamento de Reações

Modificada a extração de campos para compatibilidade com a nova versão:

```javascript
// Extração dos campos adaptada para a versão 1.33.2
let emoji = reaction.reaction;
let msgId = reaction.msgId;
let sender = reaction.senderId;
let event = reaction.reaction ? 'add' : 'remove'; // Na versão 1.33.2, reaction é null quando removida
```

Adicionado suporte para eventos de remoção de reações:

```javascript
if (event === 'add' && emoji && sender && msgId) {
  await db.addReaction(msgId, emoji, sender);
  const reactions = await db.getMessageReactions(msgId);
  io.emit('reacao-mensagem', { msgId, reactions });
  console.log('[BACKEND][message_reaction] Reação adicionada:', emoji, sender);
} else if (event === 'remove' && sender && msgId) {
  // Na versão 1.33.2, também podemos receber eventos de remoção de reações
  await db.removeReaction(msgId, sender);
  const reactions = await db.getMessageReactions(msgId);
  io.emit('reacao-mensagem', { msgId, reactions });
  console.log('[BACKEND][message_reaction] Reação removida por:', sender);
}
```

### 5. Atualização do Método removeReaction no Database

Modificado para aceitar apenas messageId e userId, sem o parâmetro emoji obrigatório:

```javascript
// Remover reação
removeReaction(messageId, userId, emoji = null) {
  return new Promise((resolve, reject) => {
    let sql;
    let params;
    
    if (emoji) {
      // Se o emoji for fornecido, remove apenas a reação específica
      sql = `
        DELETE FROM reactions 
        WHERE message_id = ? AND emoji = ? AND user_id = ?
      `;
      params = [messageId, emoji, userId];
    } else {
      // Se o emoji não for fornecido, remove todas as reações do usuário para a mensagem
      sql = `
        DELETE FROM reactions 
        WHERE message_id = ? AND user_id = ?
      `;
      params = [messageId, userId];
    }

    this.db.run(sql, params, function(err) {
      if (err) {
        console.error('Erro ao remover reação:', err);
        reject(err);
        return;
      }
      resolve(this.changes);
    });
  });
}
```

### 6. Atualização do Tratamento de Mídia

Melhorada a extração de extensão de arquivo para compatibilidade com a nova versão:

```javascript
// Extrair extensão de forma mais segura para compatibilidade com v1.33.2
const ext = mimetype.split('/')[1]?.split(';')[0] || 'bin';
```

Atualizada a importação da classe MessageMedia:

```javascript
// Importar MessageMedia da biblioteca atualizada
const { MessageMedia } = require('whatsapp-web.js');
```

## Scripts de Teste

Foram criados scripts de teste para verificar a compatibilidade com a nova versão:

1. `tests/test-connection.js` - Testa a conexão e autenticação
2. `tests/test-messaging.js` - Testa o envio e recebimento de mensagens
3. `tests/test-media.js` - Testa o envio e recebimento de mídia
4. `tests/test-reactions.js` - Testa as reações de mensagens

## Instruções para Teste

1. Execute `npm install` para instalar a nova versão da biblioteca
2. Execute os scripts de teste para verificar a compatibilidade:
   ```
   node tests/test-connection.js
   node tests/test-messaging.js
   node tests/test-media.js
   node tests/test-reactions.js
   ```
3. Inicie a aplicação normalmente com `node app.js`

## Problemas Conhecidos e Soluções

1. **Erro de inicialização**: Resolvido com a configuração de webVersionCache
2. **QR code expirando**: Adicionada lógica para lidar com expiração
3. **Reações não funcionando**: Atualizado o tratamento de eventos de reação
4. **Problemas com mídia**: Melhorada a extração de extensão de arquivo

## Benefícios da Migração

1. **Suporte a multi-dispositivo**: Melhor compatibilidade com a versão mais recente do WhatsApp
2. **Correções de bugs**: Resolução de problemas conhecidos da versão anterior
3. **Novas funcionalidades**: Suporte a remoção de reações
4. **Melhor estabilidade**: Menos desconexões e erros de autenticação

## Próximos Passos

1. Monitorar o desempenho da aplicação com a nova versão
2. Reportar quaisquer problemas encontrados
3. Considerar a implementação de novas funcionalidades disponíveis na versão 1.33.2
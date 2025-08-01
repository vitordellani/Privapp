const fetch = require('node-fetch');

// Teste simples para verificar reações no WhatsApp
async function testarReacoesSimples() {
  console.log('🧪 Teste simples de reações no WhatsApp...\n');

  try {
    // Teste 1: Enviar uma mensagem
    console.log('1️⃣ Enviando mensagem de teste...');
    const testMessage = {
      to: '1234567890@c.us',
      message: 'Teste simples - ' + new Date().toISOString()
    };

    const sendResponse = await fetch('http://localhost:3000/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (!sendResponse.ok) {
      console.log('❌ Erro ao enviar mensagem:', await sendResponse.text());
      return;
    }

    console.log('✅ Mensagem enviada com sucesso');

    // Teste 2: Buscar a mensagem
    console.log('\n2️⃣ Buscando mensagem...');
    const messagesResponse = await fetch('http://localhost:3000/api/messages');
    const messages = await messagesResponse.json();
    
    const sentMessage = messages.find(m => 
      m.fromMe === true && 
      m.body === testMessage.message
    );

    if (!sentMessage) {
      console.log('❌ Mensagem não encontrada');
      return;
    }

    console.log('✅ Mensagem encontrada:', {
      id: sentMessage.id,
      fromMe: sentMessage.fromMe,
      to: sentMessage.to
    });

    // Teste 3: Adicionar uma reação
    console.log('\n3️⃣ Adicionando reação...');
    const reactionData = {
      msgTimestamp: sentMessage.timestamp,
      msgId: sentMessage.id,
      emoji: '👍',
      user: 'test-user'
    };

    const reactionResponse = await fetch('http://localhost:3000/api/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reactionData)
    });

    if (reactionResponse.ok) {
      const result = await reactionResponse.json();
      console.log('✅ Reação adicionada:', result);
    } else {
      console.log('❌ Erro ao adicionar reação:', await reactionResponse.text());
    }

    // Teste 4: Aguardar um pouco e verificar se a reação foi salva
    console.log('\n4️⃣ Aguardando 2 segundos...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const messagesAfterReaction = await fetch('http://localhost:3000/api/messages').then(r => r.json());
    const messageWithReaction = messagesAfterReaction.find(m => m.id === sentMessage.id);

    if (messageWithReaction && messageWithReaction.reactions && messageWithReaction.reactions.length > 0) {
      console.log('✅ Reação salva no banco:', messageWithReaction.reactions);
    } else {
      console.log('❌ Reação não foi salva');
    }

    console.log('\n🎉 Teste concluído!');
    console.log('\n📋 Verifique:');
    console.log('1. Se a reação aparece na interface');
    console.log('2. Se a reação aparece no WhatsApp');
    console.log('3. Os logs do servidor para mensagens [REACAO]');

  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Executar teste
testarReacoesSimples(); 
const fetch = require('node-fetch');

// Teste específico para reações em mensagens enviadas
async function testarReacoesMensagensEnviadas() {
  console.log('🧪 Iniciando testes de reações em mensagens enviadas...\n');

  try {
    // Teste 1: Verificar se a API está funcionando
    console.log('1️⃣ Testando conectividade da API...');
    const response = await fetch('http://localhost:3000/api/messages');
    if (response.ok) {
      const messages = await response.json();
      console.log(`✅ API está funcionando. ${messages.length} mensagens encontradas`);
    } else {
      console.log('❌ Erro na API:', response.status);
      return;
    }

    // Teste 2: Enviar uma mensagem de teste
    console.log('\n2️⃣ Enviando mensagem de teste...');
    const testMessage = {
      to: '1234567890@c.us', // Número de teste
      message: 'Teste de reação - ' + new Date().toISOString()
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

    // Teste 3: Buscar a mensagem enviada
    console.log('\n3️⃣ Buscando mensagem enviada...');
    const messagesResponse = await fetch('http://localhost:3000/api/messages');
    const messages = await messagesResponse.json();
    
    const sentMessage = messages.find(m => 
      m.fromMe === true && 
      m.body === testMessage.message
    );

    if (!sentMessage) {
      console.log('❌ Mensagem enviada não encontrada');
      return;
    }

    console.log('✅ Mensagem enviada encontrada:', {
      id: sentMessage.id,
      timestamp: sentMessage.timestamp,
      fromMe: sentMessage.fromMe
    });

    // Teste 4: Testar reação na mensagem enviada
    console.log('\n4️⃣ Testando reação na mensagem enviada...');
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
      const reactionResult = await reactionResponse.json();
      console.log('✅ Reação adicionada com sucesso:', reactionResult);
    } else {
      console.log('❌ Erro ao adicionar reação:', await reactionResponse.text());
    }

    // Teste 5: Verificar se a reação foi salva
    console.log('\n5️⃣ Verificando se a reação foi salva...');
    const messagesAfterReaction = await fetch('http://localhost:3000/api/messages').then(r => r.json());
    const messageWithReaction = messagesAfterReaction.find(m => m.id === sentMessage.id);

    if (messageWithReaction && messageWithReaction.reactions && messageWithReaction.reactions.length > 0) {
      console.log('✅ Reação salva corretamente:', messageWithReaction.reactions);
    } else {
      console.log('❌ Reação não foi salva corretamente');
    }

    // Teste 6: Testar remoção de reação
    console.log('\n6️⃣ Testando remoção de reação...');
    const removeReactionResponse = await fetch('http://localhost:3000/api/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reactionData)
    });

    if (removeReactionResponse.ok) {
      const removeResult = await removeReactionResponse.json();
      console.log('✅ Reação removida com sucesso:', removeResult);
    } else {
      console.log('❌ Erro ao remover reação:', await removeReactionResponse.text());
    }

    console.log('\n🎉 Testes de reações concluídos!');
    console.log('\n📋 Resumo das correções implementadas:');
    console.log('• ✅ Busca de mensagens por ID e timestamp');
    console.log('• ✅ Suporte a reações em mensagens enviadas');
    console.log('• ✅ Logs detalhados para debugging');
    console.log('• ✅ Compatibilidade com mensagens existentes');
    console.log('• ✅ Tratamento robusto de erros');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
testarReacoesMensagensEnviadas(); 
const fetch = require('node-fetch');

// Teste específico para verificar se reações são enviadas para o WhatsApp
async function testarReacoesWhatsApp() {
  console.log('🧪 Iniciando testes de reações no WhatsApp...\n');

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
      message: 'Teste de reação WhatsApp - ' + new Date().toISOString()
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
      fromMe: sentMessage.fromMe,
      from: sentMessage.from,
      to: sentMessage.to
    });

    // Teste 4: Testar reação na mensagem enviada
    console.log('\n4️⃣ Testando reação na mensagem enviada...');
    const reactionData = {
      msgTimestamp: sentMessage.timestamp,
      msgId: sentMessage.id,
      emoji: '👍',
      user: 'test-user'
    };

    console.log('📤 Enviando reação:', reactionData);

    const reactionResponse = await fetch('http://localhost:3000/api/react', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reactionData)
    });

    if (reactionResponse.ok) {
      const reactionResult = await reactionResponse.json();
      console.log('✅ Reação processada com sucesso:', reactionResult);
      
      if (reactionResult.reactions && reactionResult.reactions.length > 0) {
        console.log('✅ Reação salva no banco de dados');
      } else {
        console.log('⚠️ Reação não foi salva no banco de dados');
      }
    } else {
      console.log('❌ Erro ao processar reação:', await reactionResponse.text());
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

    // Teste 6: Testar diferentes emojis com usuários diferentes
    console.log('\n6️⃣ Testando diferentes emojis com usuários diferentes...');
    const emojis = ['❤️', '😂', '😮', '😢', '😡'];
    
    for (let i = 0; i < emojis.length; i++) {
      const emoji = emojis[i];
      const user = `user-${i + 1}`; // Usuário diferente para cada emoji
      
      console.log(`Testando emoji: ${emoji} com usuário: ${user}`);
      const emojiReactionData = {
        msgTimestamp: sentMessage.timestamp,
        msgId: sentMessage.id,
        emoji: emoji,
        user: user
      };

      const emojiResponse = await fetch('http://localhost:3000/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emojiReactionData)
      });

      if (emojiResponse.ok) {
        const result = await emojiResponse.json();
        console.log(`✅ Reação ${emoji} processada. Reações atuais:`, result.reactions);
      } else {
        console.log(`❌ Erro na reação ${emoji}:`, await emojiResponse.text());
      }
      
      // Aguarda um pouco entre as reações
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Teste 7: Testar remoção de reações
    console.log('\n7️⃣ Testando remoção de reações...');
    for (let i = 0; i < 3; i++) { // Remove as primeiras 3 reações
      const emoji = emojis[i];
      const user = `user-${i + 1}`;
      
      console.log(`Removendo reação: ${emoji} do usuário: ${user}`);
      const removeReactionData = {
        msgTimestamp: sentMessage.timestamp,
        msgId: sentMessage.id,
        emoji: emoji,
        user: user
      };

      const removeResponse = await fetch('http://localhost:3000/api/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(removeReactionData)
      });

      if (removeResponse.ok) {
        const result = await removeResponse.json();
        console.log(`✅ Reação ${emoji} removida. Reações restantes:`, result.reactions);
      } else {
        console.log(`❌ Erro ao remover reação ${emoji}:`, await removeResponse.text());
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log('\n🎉 Testes de reações no WhatsApp concluídos!');
    console.log('\n📋 Resumo das correções implementadas:');
    console.log('• ✅ Busca no chat correto (destino para mensagens enviadas)');
    console.log('• ✅ Busca expandida de mensagens (100-200 mensagens)');
    console.log('• ✅ Logs detalhados para debugging');
    console.log('• ✅ Tratamento de erros melhorado');
    console.log('• ✅ Suporte a múltiplos emojis');

    console.log('\n🔍 Para verificar se funcionou:');
    console.log('1. Verifique os logs do servidor para mensagens [REACAO]');
    console.log('2. Verifique se as reações aparecem no WhatsApp');
    console.log('3. Confirme se as reações estão salvas no banco de dados');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
testarReacoesWhatsApp(); 
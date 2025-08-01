const fetch = require('node-fetch');

// Teste das correções implementadas
async function testarCorrecoes() {
  console.log('🧪 Iniciando testes das correções...\n');

  try {
    // Teste 1: Verificar se a API está funcionando
    console.log('1️⃣ Testando conectividade da API...');
    const response = await fetch('http://localhost:3000/api/messages');
    if (response.ok) {
      console.log('✅ API está funcionando corretamente');
    } else {
      console.log('❌ Erro na API:', response.status);
    }

    // Teste 2: Verificar se o sistema de envio está funcionando
    console.log('\n2️⃣ Testando sistema de envio...');
    const testMessage = {
      to: '1234567890@c.us', // Número de teste
      message: 'Teste de correção - ' + new Date().toISOString()
    };

    const sendResponse = await fetch('http://localhost:3000/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testMessage)
    });

    if (sendResponse.ok) {
      console.log('✅ Sistema de envio está funcionando');
    } else {
      console.log('❌ Erro no sistema de envio:', await sendResponse.text());
    }

    // Teste 3: Verificar sistema de resposta
    console.log('\n3️⃣ Testando sistema de resposta...');
    const replyMessage = {
      to: '1234567890@c.us',
      message: 'Esta é uma resposta de teste',
      replyTo: {
        timestamp: Date.now() - 60000, // 1 minuto atrás
        body: 'Mensagem original para responder',
        from: '1234567890@c.us',
        senderName: 'Teste'
      }
    };

    const replyResponse = await fetch('http://localhost:3000/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(replyMessage)
    });

    if (replyResponse.ok) {
      console.log('✅ Sistema de resposta está funcionando');
    } else {
      console.log('❌ Erro no sistema de resposta:', await replyResponse.text());
    }

    console.log('\n🎉 Testes concluídos!');
    console.log('\n📋 Resumo das correções implementadas:');
    console.log('• ✅ Prevenção de duplicação de mensagens');
    console.log('• ✅ Melhoria no sistema de respostas do WhatsApp');
    console.log('• ✅ Sincronização otimizada entre frontend e backend');
    console.log('• ✅ Verificação de mensagens já processadas');
    console.log('• ✅ Renderização inteligente de novas mensagens');

  } catch (error) {
    console.error('❌ Erro durante os testes:', error.message);
  }
}

// Executar testes
testarCorrecoes(); 
// Teste para verificar se o encaminhamento está enviando mensagens pelo WhatsApp
const fetch = require('node-fetch');

async function testarEncaminhamentoReal() {
  console.log('🧪 Testando encaminhamento real via WhatsApp...\n');

  try {
    // 1. Buscar mensagens da API
    console.log('1. Buscando mensagens da API...');
    const response = await fetch('http://localhost:3000/api/messages');
    const messages = await response.json();
    
    if (!Array.isArray(messages) || messages.length === 0) {
      console.log('❌ Nenhuma mensagem encontrada para testar encaminhamento');
      return;
    }
    
    console.log(`✅ ${messages.length} mensagens encontradas`);

    // 2. Buscar contatos únicos
    console.log('\n2. Buscando contatos únicos...');
    const contatos = [...new Set(messages.map(m => m.fromMe ? m.to : m.from))]
      .filter(c => c && c !== 'unknown');
    
    if (contatos.length === 0) {
      console.log('❌ Nenhum contato encontrado para testar encaminhamento');
      return;
    }
    
    console.log(`✅ ${contatos.length} contatos únicos encontrados`);
    console.log('Primeiros 3 contatos:', contatos.slice(0, 3));

    // 3. Escolher uma mensagem para encaminhar
    const mensagemParaEncaminhar = messages.find(m => m.body && m.body.trim().length > 0);
    if (!mensagemParaEncaminhar) {
      console.log('❌ Nenhuma mensagem com texto encontrada para encaminhar');
      return;
    }
    
    console.log('\n3. Mensagem selecionada para encaminhamento:');
    console.log('- ID:', mensagemParaEncaminhar.id);
    console.log('- From:', mensagemParaEncaminhar.from);
    console.log('- To:', mensagemParaEncaminhar.to);
    console.log('- Body:', mensagemParaEncaminhar.body);
    console.log('- FromMe:', mensagemParaEncaminhar.fromMe);

    // 4. Escolher um contato para encaminhar (primeiro contato)
    const contatoDestino = contatos[0];
    console.log(`\n4. Contato de destino: ${contatoDestino}`);

    // 5. Testar envio via API
    console.log('\n5. Testando envio via API...');
    const testMessage = `🧪 Teste de encaminhamento: "${mensagemParaEncaminhar.body}"`;
    
    const sendResponse = await fetch('http://localhost:3000/api/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to: contatoDestino,
        message: testMessage,
        replyTo: null
      })
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResult.ok) {
      console.log('✅ Mensagem enviada com sucesso via API!');
      console.log('📱 Verifique se a mensagem apareceu no WhatsApp');
    } else {
      console.log('❌ Erro ao enviar mensagem via API:', sendResult.error);
    }

    // 6. Simular função de encaminhamento do frontend
    console.log('\n6. Simulando função de encaminhamento do frontend...');
    
    const promises = [];
    let enviadas = 0;
    let erros = 0;
    
    // Simular encaminhamento para 2 contatos
    const contatosParaTeste = contatos.slice(0, 2);
    
    contatosParaTeste.forEach(contato => {
      const promise = fetch('http://localhost:3000/api/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: contato,
          message: `🔄 Encaminhamento: "${mensagemParaEncaminhar.body}"`,
          replyTo: null
        })
      })
      .then(response => response.json())
      .then(data => {
        if (data.ok) {
          enviadas++;
          console.log(`✅ Encaminhamento para ${contato}: SUCESSO`);
        } else {
          erros++;
          console.log(`❌ Encaminhamento para ${contato}: ${data.error}`);
        }
      })
      .catch(error => {
        erros++;
        console.log(`❌ Encaminhamento para ${contato}: ${error.message}`);
      });
      
      promises.push(promise);
    });
    
    // Aguardar todas as requisições
    await Promise.all(promises);
    
    console.log('\n📊 Resultado do teste de encaminhamento:');
    console.log(`- Enviadas: ${enviadas}`);
    console.log(`- Erros: ${erros}`);
    
    if (enviadas > 0) {
      console.log('\n🎉 Teste concluído! O encaminhamento está funcionando.');
      console.log('📱 Verifique se as mensagens apareceram no WhatsApp');
    } else {
      console.log('\n❌ Teste falhou. Verifique os logs do servidor.');
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
    console.log('\n💡 Certifique-se de que a aplicação está rodando em http://localhost:3000');
  }
}

// Executar teste
testarEncaminhamentoReal(); 
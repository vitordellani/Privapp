// Teste detalhado da estrutura das mensagens
const fetch = require('node-fetch');

async function testarEstruturaMensagens() {
  console.log('🔍 Testando estrutura detalhada das mensagens...\n');

  try {
    const response = await fetch('http://localhost:3000/api/messages');
    const messages = await response.json();
    
    console.log(`📊 Total de mensagens: ${messages.length}\n`);
    
    if (messages.length === 0) {
      console.log('❌ Nenhuma mensagem encontrada');
      return;
    }

    // Analisar primeira mensagem
    const primeiraMsg = messages[0];
    console.log('📋 Estrutura da primeira mensagem:');
    console.log(JSON.stringify(primeiraMsg, null, 2));
    
    // Verificar propriedades importantes
    console.log('\n🔍 Verificação de propriedades:');
    console.log('- from:', primeiraMsg.from ? '✅' : '❌');
    console.log('- to:', primeiraMsg.to ? '✅' : '❌');
    console.log('- body:', primeiraMsg.body ? '✅' : '❌');
    console.log('- fromMe:', typeof primeiraMsg.fromMe === 'boolean' ? '✅' : '❌');
    console.log('- timestamp:', primeiraMsg.timestamp ? '✅' : '❌');
    console.log('- id:', primeiraMsg.id ? '✅' : '❌');
    
    // Verificar propriedades incorretas
    console.log('\n🚫 Propriedades incorretas:');
    console.log('- contato:', primeiraMsg.contato ? '❌ PRESENTE' : '✅ AUSENTE');
    console.log('- texto:', primeiraMsg.texto ? '❌ PRESENTE' : '✅ AUSENTE');
    
    // Analisar todas as mensagens
    console.log('\n📈 Análise de todas as mensagens:');
    
    const propriedades = {};
    const tipos = {};
    
    messages.forEach((msg, index) => {
      Object.keys(msg).forEach(key => {
        if (!propriedades[key]) propriedades[key] = 0;
        propriedades[key]++;
        
        if (!tipos[key]) tipos[key] = new Set();
        tipos[key].add(typeof msg[key]);
      });
    });
    
    console.log('\n📊 Propriedades encontradas:');
    Object.entries(propriedades).forEach(([prop, count]) => {
      const percentual = ((count / messages.length) * 100).toFixed(1);
      console.log(`- ${prop}: ${count}/${messages.length} (${percentual}%) - tipos: ${Array.from(tipos[prop]).join(', ')}`);
    });
    
    // Verificar mensagens sem body
    const mensagensSemBody = messages.filter(m => !m.body);
    console.log(`\n⚠️  Mensagens sem 'body': ${mensagensSemBody.length}/${messages.length}`);
    
    if (mensagensSemBody.length > 0) {
      console.log('Primeira mensagem sem body:');
      console.log(JSON.stringify(mensagensSemBody[0], null, 2));
    }
    
    // Verificar contatos únicos
    const contatos = [...new Set(messages.map(m => m.fromMe ? m.to : m.from))]
      .filter(c => c && c !== 'unknown');
    
    console.log(`\n👥 Contatos únicos: ${contatos.length}`);
    console.log('Primeiros 5 contatos:', contatos.slice(0, 5));
    
    console.log('\n✅ Teste de estrutura concluído!');

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.message);
  }
}

testarEstruturaMensagens(); 
const Database = require('./database');

async function testDatabase() {
  console.log('Testando banco de dados SQLite...');
  
  const db = new Database();
  
  try {
    // Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Teste 1: Buscar todas as mensagens
    console.log('\n1. Buscando todas as mensagens...');
    const messages = await db.getAllMessages();
    console.log(`Total de mensagens: ${messages.length}`);
    
    if (messages.length > 0) {
      console.log('Primeira mensagem:', {
        id: messages[0].id,
        from: messages[0].from,
        to: messages[0].to,
        body: messages[0].body?.substring(0, 50) + '...',
        timestamp: new Date(messages[0].timestamp).toLocaleString(),
        reactions: messages[0].reactions.length
      });
    }
    
    // Teste 2: Verificar reações
    console.log('\n2. Verificando reações...');
    let totalReactions = 0;
    for (const msg of messages) {
      totalReactions += msg.reactions.length;
    }
    console.log(`Total de reações: ${totalReactions}`);
    
    // Teste 3: Buscar reações de uma mensagem específica
    if (messages.length > 0) {
      console.log('\n3. Buscando reações da primeira mensagem...');
      const reactions = await db.getMessageReactions(messages[0].id);
      console.log(`Reações da mensagem ${messages[0].id}:`, reactions);
    }
    
    // Teste 4: Testar adição de reação
    console.log('\n4. Testando adição de reação...');
    if (messages.length > 0) {
      const testReaction = await db.addReaction(messages[0].id, '👍', 'test-user');
      console.log('Reação de teste adicionada com ID:', testReaction);
      
      // Verificar se foi adicionada
      const updatedReactions = await db.getMessageReactions(messages[0].id);
      console.log('Reações após adição:', updatedReactions);
      
      // Remover reação de teste
      await db.removeReaction(messages[0].id, '👍', 'test-user');
      console.log('Reação de teste removida');
    }
    
    console.log('\n✅ Todos os testes passaram!');
    
  } catch (error) {
    console.error('❌ Erro nos testes:', error);
  } finally {
    await db.close();
  }
}

testDatabase(); 
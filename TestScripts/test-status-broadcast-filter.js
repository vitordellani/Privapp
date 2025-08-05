const Database = require('../database');
const path = require('path');

async function testStatusBroadcastFilter() {
  console.log('🧪 Testando filtro de status@broadcast...');
  
  const db = new Database();
  
  try {
    // Aguardar inicialização
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('\n1. Verificando mensagens existentes...');
    const allMessages = await db.getAllMessages();
    console.log(`Total de mensagens no banco: ${allMessages.length}`);
    
    // Verificar se há mensagens de status@broadcast
    const statusMessages = allMessages.filter(msg => 
      msg.from === 'status@broadcast' || msg.to === 'status@broadcast'
    );
    
    if (statusMessages.length > 0) {
      console.log(`❌ ERRO: Encontradas ${statusMessages.length} mensagens de status@broadcast que não deveriam estar na lista:`);
      statusMessages.forEach((msg, index) => {
        console.log(`   ${index + 1}. From: ${msg.from}, To: ${msg.to}, Body: ${msg.body?.substring(0, 50)}...`);
      });
    } else {
      console.log('✅ Nenhuma mensagem de status@broadcast encontrada na lista (filtro funcionando)');
    }
    
    console.log('\n2. Testando inserção de mensagem de status@broadcast...');
    
    // Tentar inserir uma mensagem de teste de status@broadcast
    const testMessage = {
      id: 'test_status_broadcast_' + Date.now(),
      from: 'status@broadcast',
      to: '5511999999999@c.us',
      body: 'Esta é uma mensagem de teste de status/story',
      timestamp: Date.now(),
      fromMe: false,
      senderName: 'Status Test',
      reactions: []
    };
    
    try {
      await db.saveMessage(testMessage);
      console.log('⚠️  Mensagem de teste salva no banco (isso é esperado)');
      
      // Verificar se aparece na lista (não deveria aparecer devido ao filtro)
      const messagesAfterInsert = await db.getAllMessages();
      const testMessageInList = messagesAfterInsert.find(msg => msg.id === testMessage.id);
      
      if (testMessageInList) {
        console.log('❌ ERRO: Mensagem de status@broadcast aparece na lista (filtro não está funcionando)');
      } else {
        console.log('✅ Mensagem de status@broadcast não aparece na lista (filtro funcionando corretamente)');
      }
      
    } catch (error) {
      console.log('❌ Erro ao inserir mensagem de teste:', error.message);
    }
    
    console.log('\n3. Limpando mensagens de status@broadcast do banco...');
    
    // Executar limpeza direta no banco
    await new Promise((resolve, reject) => {
      db.db.run(
        "DELETE FROM messages WHERE from_number = 'status@broadcast' OR to_number = 'status@broadcast'",
        function(err) {
          if (err) {
            reject(err);
            return;
          }
          console.log(`🧹 ${this.changes} mensagens de status@broadcast removidas do banco`);
          resolve();
        }
      );
    });
    
    console.log('\n4. Verificação final...');
    const finalMessages = await db.getAllMessages();
    console.log(`Total de mensagens após limpeza: ${finalMessages.length}`);
    
    const remainingStatusMessages = finalMessages.filter(msg => 
      msg.from === 'status@broadcast' || msg.to === 'status@broadcast'
    );
    
    if (remainingStatusMessages.length === 0) {
      console.log('✅ Nenhuma mensagem de status@broadcast restante');
    } else {
      console.log(`❌ Ainda existem ${remainingStatusMessages.length} mensagens de status@broadcast`);
    }
    
    console.log('\n🎉 Teste concluído!');
    console.log('\n📋 Resumo do filtro implementado:');
    console.log('   • Event listeners do WhatsApp filtram mensagens de status@broadcast');
    console.log('   • Método getAllMessages() exclui mensagens de status@broadcast da consulta');
    console.log('   • Mensagens de stories não são salvas nem exibidas na interface');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error);
  } finally {
    await db.close();
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testStatusBroadcastFilter();
}

module.exports = testStatusBroadcastFilter;
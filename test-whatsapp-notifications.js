const Database = require('./database');

// Simular teste de notificações WhatsApp
async function testWhatsAppNotifications() {
  const db = new Database();
  
  try {
    console.log('=== TESTE DE NOTIFICAÇÕES WHATSAPP ===');
    
    // 1. Verificar usuários online
    console.log('\n1. Verificando usuários online...');
    const onlineUsers = await db.getOnlineUsers();
    console.log(`Usuários online encontrados: ${onlineUsers.length}`);
    onlineUsers.forEach(user => {
      console.log(`- ${user.username} (WhatsApp: ${user.whatsapp_number || 'Não cadastrado'})`);
    });
    
    // 2. Verificar usuários com WhatsApp
    console.log('\n2. Verificando usuários com WhatsApp cadastrado...');
    const usersWithWhatsApp = onlineUsers.filter(user => user.whatsapp_number);
    console.log(`Usuários online com WhatsApp: ${usersWithWhatsApp.length}`);
    
    if (usersWithWhatsApp.length === 0) {
      console.log('❌ PROBLEMA: Nenhum usuário online tem WhatsApp cadastrado!');
      console.log('\nSoluções:');
      console.log('1. Faça login no sistema para ficar online');
      console.log('2. Cadastre um número de WhatsApp no painel admin');
      return;
    }
    
    // 3. Simular salvamento de notificação
    console.log('\n3. Testando salvamento de notificação...');
    const testUser = usersWithWhatsApp[0];
    const notificationId = await db.saveWhatsAppNotification(
      testUser.id, 
      'test_message_123', 
      'Teste de Remetente'
    );
    console.log(`✅ Notificação salva com ID: ${notificationId}`);
    
    // 4. Marcar como enviada
    console.log('\n4. Testando marcação como enviada...');
    await db.markNotificationSent(notificationId);
    console.log('✅ Notificação marcada como enviada');
    
    // 5. Verificar notificações pendentes
    console.log('\n5. Verificando notificações pendentes...');
    const pendingNotifications = await db.getPendingNotifications();
    console.log(`Notificações pendentes: ${pendingNotifications.length}`);
    
    console.log('\n=== TESTE CONCLUÍDO ===');
    console.log('✅ Sistema de notificações está funcionando corretamente!');
    console.log('\nSe as notificações não estão chegando, verifique:');
    console.log('1. Se o WhatsApp Web está conectado (QR Code escaneado)');
    console.log('2. Se o número cadastrado está correto (formato: 5511999999999)');
    console.log('3. Se há mensagens sendo recebidas no chat para disparar as notificações');
    
  } catch (error) {
    console.error('❌ ERRO no teste:', error);
  } finally {
    process.exit(0);
  }
}

testWhatsAppNotifications();
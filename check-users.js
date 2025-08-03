const Database = require('./database');

async function checkUsers() {
  const db = new Database();
  
  try {
    console.log('=== VERIFICAÇÃO DE USUÁRIOS ===');
    
    const allUsers = await db.getAllUsers();
    console.log('\nTodos os usuários:');
    allUsers.forEach(user => {
      console.log(`- ${user.username}: active=${user.is_active}, admin=${user.is_admin}`);
    });
    
    console.log('\n=== USUÁRIOS COM WHATSAPP ===');
    const usersWithWhatsApp = await db.getUsersWithWhatsApp();
    usersWithWhatsApp.forEach(user => {
      console.log(`- ${user.username}: WhatsApp=${user.whatsapp_number}, online=${user.is_online}`);
    });
    
    console.log('\n=== USUÁRIOS ONLINE ===');
    const onlineUsers = await db.getOnlineUsers();
    onlineUsers.forEach(user => {
      console.log(`- ${user.username}: WhatsApp=${user.whatsapp_number || 'Não cadastrado'}`);
    });
    
  } catch (error) {
    console.error('Erro:', error);
  } finally {
    process.exit(0);
  }
}

checkUsers();
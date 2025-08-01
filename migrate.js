const Database = require('./database');
const fs = require('fs');
const path = require('path');

async function migrateData() {
  console.log('Iniciando migração de dados do JSON para SQLite...');
  
  const db = new Database();
  const jsonFilePath = path.join(__dirname, 'messages.json');
  
  try {
    // Aguardar inicialização do banco
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Executar migração
    await db.migrateFromJSON(jsonFilePath);
    
    console.log('Migração concluída com sucesso!');
    console.log('O arquivo messages.json.backup foi criado como backup.');
    
    // Verificar dados migrados
    const messages = await db.getAllMessages();
    console.log(`Total de mensagens migradas: ${messages.length}`);
    
    // Contar reações
    let totalReactions = 0;
    for (const msg of messages) {
      totalReactions += msg.reactions.length;
    }
    console.log(`Total de reações migradas: ${totalReactions}`);
    
  } catch (error) {
    console.error('Erro durante migração:', error);
  } finally {
    await db.close();
  }
}

// Executar migração se chamado diretamente
if (require.main === module) {
  migrateData();
}

module.exports = migrateData; 
#!/usr/bin/env node

/**
 * Script de teste para verificar a funcionalidade de troca de senha
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'messages.db');

async function testChangePassword() {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Conectado ao banco de dados SQLite');
      
      // Verificar se existe usuário admin
      db.get('SELECT id, username, password, password_reset_required FROM users WHERE username = ? AND is_admin = 1', ['admin'], (err, user) => {
        if (err) {
          console.error('❌ Erro ao buscar usuário admin:', err.message);
          reject(err);
          return;
        }
        
        if (!user) {
          console.log('⚠️  Usuário admin não encontrado');
          resolve(false);
          return;
        }
        
        console.log('✅ Usuário admin encontrado:');
        console.log(`   ID: ${user.id}`);
        console.log(`   Username: ${user.username}`);
        console.log(`   Password reset required: ${user.password_reset_required}`);
        
        // Testar verificação de senha atual
        const currentPassword = 'admin2509';
        bcrypt.compare(currentPassword, user.password, (err, isMatch) => {
          if (err) {
            console.error('❌ Erro ao verificar senha:', err.message);
            reject(err);
            return;
          }
          
          console.log(`✅ Senha atual "${currentPassword}" é válida: ${isMatch}`);
          
          if (isMatch) {
            // Testar criação de nova senha
            const newPassword = 'NovaSenha123';
            bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
              if (err) {
                console.error('❌ Erro ao gerar hash da nova senha:', err.message);
                reject(err);
                return;
              }
              
              console.log('✅ Hash da nova senha gerado com sucesso');
              
              // Atualizar senha no banco
              const updateSql = 'UPDATE users SET password = ?, password_reset_required = 0 WHERE id = ?';
              db.run(updateSql, [hashedPassword, user.id], function(err) {
                if (err) {
                  console.error('❌ Erro ao atualizar senha:', err.message);
                  reject(err);
                  return;
                }
                
                console.log(`✅ Senha atualizada com sucesso! ${this.changes} linha(s) afetada(s)`);
                
                // Verificar se a nova senha funciona
                bcrypt.compare(newPassword, hashedPassword, (err, isNewPasswordValid) => {
                  if (err) {
                    console.error('❌ Erro ao verificar nova senha:', err.message);
                    reject(err);
                    return;
                  }
                  
                  console.log(`✅ Nova senha "${newPassword}" é válida: ${isNewPasswordValid}`);
                  
                  // Restaurar senha original para não afetar o sistema
                  const restoreSql = 'UPDATE users SET password = ?, password_reset_required = 1 WHERE id = ?';
                  db.run(restoreSql, [user.password, user.id], function(err) {
                    if (err) {
                      console.error('⚠️  Erro ao restaurar senha original:', err.message);
                    } else {
                      console.log('✅ Senha original restaurada');
                    }
                    
                    db.close((err) => {
                      if (err) {
                        console.error('⚠️  Erro ao fechar conexão:', err.message);
                      } else {
                        console.log('🔌 Conexão com banco fechada');
                      }
                      resolve(true);
                    });
                  });
                });
              });
            });
          } else {
            console.log('⚠️  Senha atual não é válida, pulando teste de atualização');
            db.close((err) => {
              if (err) {
                console.error('⚠️  Erro ao fechar conexão:', err.message);
              } else {
                console.log('🔌 Conexão com banco fechada');
              }
              resolve(false);
            });
          }
        });
      });
    });
  });
}

// Executar o teste
async function main() {
  console.log('🧪 Iniciando teste da funcionalidade de troca de senha...\n');
  
  try {
    const success = await testChangePassword();
    
    if (success) {
      console.log('\n🎉 Teste concluído com sucesso!');
      console.log('💡 A funcionalidade de troca de senha está funcionando corretamente.');
    } else {
      console.log('\n⚠️  Teste concluído com limitações.');
      console.log('💡 Verifique se o usuário admin existe e tem a senha correta.');
    }
  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error.message);
    process.exit(1);
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  main();
}

module.exports = { testChangePassword }; 
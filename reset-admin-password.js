#!/usr/bin/env node

/**
 * Script para resetar a senha do administrador
 * 
 * Uso: node reset-admin-password.js
 * 
 * Este script redefine a senha do usuário admin para 'admin2509'
 * e marca que o admin deve trocar a senha no próximo login.
 */

const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const path = require('path');

// Configuração do banco de dados
const dbPath = path.join(__dirname, 'messages.db');

function resetAdminPassword() {
  return new Promise((resolve, reject) => {
    // Conectar ao banco de dados
    const db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('❌ Erro ao conectar ao banco de dados:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ Conectado ao banco de dados SQLite');
      
      // Hash da nova senha do admin
      const adminPassword = 'admin2509';
      
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          console.error('❌ Erro ao gerar hash da senha:', err.message);
          reject(err);
          return;
        }
        
        // Verificar se a coluna password_reset_required existe e adicionar se necessário
        db.get("PRAGMA table_info(users)", (err, rows) => {
          if (err) {
            console.error('❌ Erro ao verificar estrutura da tabela:', err.message);
            reject(err);
            return;
          }
          
          // Verificar se a coluna password_reset_required existe
          db.all("PRAGMA table_info(users)", (err, columns) => {
            if (err) {
              console.error('❌ Erro ao verificar colunas da tabela:', err.message);
              reject(err);
              return;
            }
            
            const hasPasswordResetColumn = columns.some(col => col.name === 'password_reset_required');
            
            if (!hasPasswordResetColumn) {
              console.log('📝 Adicionando coluna password_reset_required...');
              
              // Adicionar a coluna
              db.run("ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT 0", (err) => {
                if (err) {
                  console.error('❌ Erro ao adicionar coluna:', err.message);
                  reject(err);
                  return;
                }
                console.log('✅ Coluna password_reset_required adicionada com sucesso');
                updateAdminPassword();
              });
            } else {
              updateAdminPassword();
            }
          });
          
          function updateAdminPassword() {
            // Atualizar a senha do admin
            const sql = `
              UPDATE users 
              SET password = ?, password_reset_required = 1 
              WHERE username = ? AND is_admin = 1
            `;
            
            db.run(sql, [hash, 'admin'], function(err) {
              if (err) {
                console.error('❌ Erro ao atualizar senha do admin:', err.message);
                reject(err);
                return;
              }
              
              if (this.changes === 0) {
                console.log('⚠️  Nenhum usuário admin encontrado para atualizar');
                resolve(false);
              } else {
                console.log('✅ Senha do admin redefinida com sucesso!');
                console.log('📝 Nova senha: admin2509');
                console.log('🔒 O admin será obrigado a trocar a senha no próximo login');
                resolve(true);
              }
              
              // Fechar conexão
              db.close((err) => {
                if (err) {
                  console.error('⚠️  Erro ao fechar conexão:', err.message);
                } else {
                  console.log('🔌 Conexão com banco fechada');
                }
              });
            });
          }
        });
      });
    });
  });
}

// Executar o script
async function main() {
  console.log('🔧 Iniciando reset da senha do administrador...\n');
  
  try {
    const success = await resetAdminPassword();
    
    if (success) {
      console.log('\n🎉 Processo concluído com sucesso!');
      console.log('💡 Agora você pode fazer login com:');
      console.log('   Usuário: admin');
      console.log('   Senha: admin2509');
    } else {
      console.log('\n⚠️  Processo concluído, mas nenhuma alteração foi feita.');
      console.log('💡 Verifique se existe um usuário admin no sistema.');
    }
  } catch (error) {
    console.error('\n❌ Erro durante o processo:', error.message);
    process.exit(1);
  }
}

// Verificar se o script está sendo executado diretamente
if (require.main === module) {
  main();
}

module.exports = { resetAdminPassword }; 
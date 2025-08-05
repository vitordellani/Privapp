const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, 'messages.db');
    this.db = null;
    this.init();
  }

  init() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) {
          console.error('Erro ao conectar ao banco:', err);
          reject(err);
          return;
        }
        console.log('Conectado ao banco SQLite');
        this.createTables().then(resolve).catch(reject);
      });
    });
  }

  createTables() {
    return new Promise((resolve, reject) => {
      const createMessagesTable = `
        CREATE TABLE IF NOT EXISTS messages (
          id TEXT PRIMARY KEY,
          from_number TEXT NOT NULL,
          to_number TEXT NOT NULL,
          body TEXT,
          timestamp INTEGER NOT NULL,
          media_filename TEXT,
          mimetype TEXT,
          from_me BOOLEAN DEFAULT 0,
          sender_name TEXT,
          group_name TEXT,
          photo_url TEXT,
          media_error TEXT,
          user_name TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;

      const createReactionsTable = `
        CREATE TABLE IF NOT EXISTS reactions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          message_id TEXT NOT NULL,
          emoji TEXT NOT NULL,
          user_id TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
          UNIQUE(message_id, emoji, user_id)
        )
      `;

      const createUsersTable = `
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          email TEXT,
          is_admin BOOLEAN DEFAULT 0,
          is_active BOOLEAN DEFAULT 1,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_login DATETIME,
          profile_photo TEXT,
          password_reset_required BOOLEAN DEFAULT 0,
          whatsapp_number TEXT,
          is_online BOOLEAN DEFAULT 0,
          last_activity DATETIME
        )
      `;

      const createNotificationsTable = `
        CREATE TABLE IF NOT EXISTS whatsapp_notifications (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          message_id TEXT NOT NULL,
          sender_name TEXT NOT NULL,
          notification_sent BOOLEAN DEFAULT 0,
          sent_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
      `;

      this.db.serialize(() => {
        this.db.run(createMessagesTable, (err) => {
          if (err) {
            console.error('Erro ao criar tabela messages:', err);
            reject(err);
            return;
          }
          console.log('Tabela messages criada/verificada');

          this.db.run(createReactionsTable, (err) => {
            if (err) {
              console.error('Erro ao criar tabela reactions:', err);
              reject(err);
              return;
            }
            console.log('Tabela reactions criada/verificada');

            this.db.run(createUsersTable, (err) => {
              if (err) {
                console.error('Erro ao criar tabela users:', err);
                reject(err);
                return;
              }
              console.log('Tabela users criada/verificada');
              
              this.db.run(createNotificationsTable, (err) => {
                if (err) {
                  console.error('Erro ao criar tabela whatsapp_notifications:', err);
                  reject(err);
                  return;
                }
                console.log('Tabela whatsapp_notifications criada/verificada');
                this.createDefaultAdmin().then(resolve).catch(reject);
              });
            });
          });
        });
      });
    });
  }

  // Criar usuário admin padrão
  createDefaultAdmin() {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      const adminPassword = 'admin123'; // Senha padrão que deve ser alterada
      
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          console.error('Erro ao criar hash da senha admin:', err);
          reject(err);
          return;
        }

        const sql = `
          INSERT OR IGNORE INTO users (username, password, email, is_admin, is_active)
          VALUES (?, ?, ?, ?, ?)
        `;
        
        this.db.run(sql, ['admin', hash, 'admin@privapp.com', 1, 1], (err) => {
          if (err) {
            console.error('Erro ao criar usuário admin:', err);
            reject(err);
            return;
          }
          console.log('Usuário admin criado/verificado');
          resolve();
        });
      });
    });
  }

  // Métodos de autenticação
  async authenticateUser(username, password) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      
      const sql = 'SELECT * FROM users WHERE username = ? AND is_active = 1';
      
      this.db.get(sql, [username], (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        
        if (!user) {
          resolve(null);
          return;
        }
        
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            reject(err);
            return;
          }
          
          if (isMatch) {
            // Atualizar último login
            this.updateLastLogin(user.id);
            resolve(user);
          } else {
            resolve(null);
          }
        });
      });
    });
  }

  updateLastLogin(userId) {
    const sql = 'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?';
    this.db.run(sql, [userId]);
  }

  // Métodos de gerenciamento de usuários
  getAllUsers() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, is_admin, is_active, created_at, last_login FROM users ORDER BY created_at DESC';
      
      this.db.all(sql, [], (err, users) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(users);
      });
    });
  }

  createUser(userData) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      const { username, password, email, whatsappNumber, isAdmin } = userData;
      
      bcrypt.hash(password, 10, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        const sql = `
          INSERT INTO users (username, password, email, whatsapp_number, is_admin, is_active)
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        
        this.db.run(sql, [username, hash, email, whatsappNumber || null, isAdmin ? 1 : 0, 1], function(err) {
          if (err) {
            reject(err);
            return;
          }
          resolve(this.lastID);
        });
      });
    });
  }

  updateUserStatus(userId, isActive) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET is_active = ? WHERE id = ?';
      
      this.db.run(sql, [isActive ? 1 : 0, userId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  deleteUser(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'DELETE FROM users WHERE id = ? AND is_admin = 0'; // Não permite deletar admin
      
      this.db.run(sql, [userId], (err) => {
        if (err) {
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  getUserById(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, password, is_admin, is_active, created_at, last_login FROM users WHERE id = ?';
      
      this.db.get(sql, [userId], (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(user);
      });
    });
  }

  // Buscar usuário por username
  getUserByUsername(username) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, is_admin, is_active, created_at, last_login, profile_photo FROM users WHERE username = ?';
      
      this.db.get(sql, [username], (err, user) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(user);
      });
    });
  }

  // Atualizar foto de perfil do usuário
  updateProfilePhoto(userId, photoPath) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET profile_photo = ? WHERE id = ?';
      this.db.run(sql, [photoPath, userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }

  // Buscar foto de perfil do usuário
  getProfilePhoto(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT profile_photo FROM users WHERE id = ?';
      this.db.get(sql, [userId], (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result ? result.profile_photo : null);
      });
    });
  }

  // Salvar mensagem
  saveMessage(messageData) {
    return new Promise((resolve, reject) => {
      const { 
        id, from, to, body, timestamp, mediaFilename, mimetype, 
        fromMe, senderName, groupName, photoUrl, mediaError, userName, userProfilePhoto 
      } = messageData;

      // DEBUG: Verificar dados recebidos
      console.log('[DEBUG] saveMessage recebeu:', {
        id,
        userName,
        userNameType: typeof userName,
        userNameLength: userName ? userName.length : 'N/A'
      });

      // Validações para evitar valores NULL
      const validatedId = id || `temp_${Date.now()}`;
      const validatedFrom = from || 'unknown';
      const validatedTo = to || 'unknown';
      const validatedBody = body || '';
      const validatedTimestamp = timestamp || Date.now();
      const validatedSenderName = senderName || 'Unknown';
      const validatedUserName = userName || null;
      const validatedUserProfilePhoto = userProfilePhoto || null;

      // DEBUG: Verificar dados validados
      console.log('[DEBUG] saveMessage validou:', {
        validatedUserName,
        validatedUserNameType: typeof validatedUserName
      });

      const sql = `
        INSERT OR REPLACE INTO messages 
        (id, from_number, to_number, body, timestamp, media_filename, mimetype, 
         from_me, sender_name, group_name, photo_url, media_error, user_name, user_profile_photo)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        validatedId, validatedFrom, validatedTo, validatedBody, validatedTimestamp, 
        mediaFilename, mimetype, fromMe ? 1 : 0, validatedSenderName, 
        groupName, photoUrl, mediaError, validatedUserName, validatedUserProfilePhoto
      ], function(err) {
        if (err) {
          console.error('Erro ao salvar mensagem:', err);
          console.error('Dados que causaram erro:', {
            id: validatedId,
            from: validatedFrom,
            to: validatedTo,
            body: validatedBody?.substring(0, 50),
            timestamp: validatedTimestamp
          });
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  // Buscar todas as mensagens
  getAllMessages() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT 
          m.id, m.from_number as "from", m.to_number as "to", m.body, 
          m.timestamp, m.media_filename as mediaFilename, m.mimetype,
          m.from_me as fromMe, m.sender_name as senderName, 
          m.group_name as groupName, m.photo_url as photoUrl,
          m.media_error as mediaError, m.user_name as userName,
          m.user_profile_photo as userProfilePhoto
        FROM messages m
        WHERE m.from_number != 'status@broadcast' AND m.to_number != 'status@broadcast'
        ORDER BY m.timestamp ASC
      `;

      this.db.all(sql, [], async (err, rows) => {
        if (err) {
          console.error('Erro ao buscar mensagens:', err);
          reject(err);
          return;
        }

        // Buscar reações para cada mensagem
        const messages = [];
        for (const row of rows) {
          try {
            const reactions = await this.getMessageReactions(row.id);
            messages.push({
              ...row,
              fromMe: Boolean(row.fromMe),
              reactions: reactions
            });
          } catch (error) {
            console.error('Erro ao buscar reações para mensagem:', row.id, error);
            messages.push({
              ...row,
              fromMe: Boolean(row.fromMe),
              reactions: []
            });
          }
        }

        resolve(messages);
      });
    });
  }

  // Adicionar reação
  addReaction(messageId, emoji, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT OR REPLACE INTO reactions (message_id, emoji, user_id)
        VALUES (?, ?, ?)
      `;

      this.db.run(sql, [messageId, emoji, userId], function(err) {
        if (err) {
          console.error('Erro ao adicionar reação:', err);
          reject(err);
          return;
        }
        resolve(this.lastID);
      });
    });
  }

  // Remover reação
  removeReaction(messageId, emoji, userId) {
    return new Promise((resolve, reject) => {
      const sql = `
        DELETE FROM reactions 
        WHERE message_id = ? AND emoji = ? AND user_id = ?
      `;

      this.db.run(sql, [messageId, emoji, userId], function(err) {
        if (err) {
          console.error('Erro ao remover reação:', err);
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }

  // Buscar reações de uma mensagem
  getMessageReactions(messageId) {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT emoji, user_id as user
        FROM reactions 
        WHERE message_id = ?
      `;

      this.db.all(sql, [messageId], (err, rows) => {
        if (err) {
          console.error('Erro ao buscar reações:', err);
          reject(err);
          return;
        }
        resolve(rows);
      });
    });
  }

  // Limpar todas as mensagens
  clearAllMessages() {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM messages', (err) => {
        if (err) {
          console.error('Erro ao limpar mensagens:', err);
          reject(err);
          return;
        }
        resolve();
      });
    });
  }

  // Migrar dados do JSON para SQLite
  async migrateFromJSON(jsonFilePath) {
    try {
      if (!fs.existsSync(jsonFilePath)) {
        console.log('Arquivo JSON não encontrado, pulando migração');
        return;
      }

      const jsonData = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
      console.log(`Migrando ${jsonData.length} mensagens do JSON para SQLite...`);

      for (const message of jsonData) {
        await this.saveMessage(message);
        
        // Migrar reações se existirem
        if (message.reactions && Array.isArray(message.reactions)) {
          for (const reaction of message.reactions) {
            await this.addReaction(message.id, reaction.emoji, reaction.user);
          }
        }
      }

      console.log('Migração concluída com sucesso!');
      
      // Fazer backup do arquivo JSON original
      const backupPath = jsonFilePath + '.backup';
      fs.copyFileSync(jsonFilePath, backupPath);
      console.log(`Backup do JSON salvo em: ${backupPath}`);
      
    } catch (error) {
      console.error('Erro durante migração:', error);
      throw error;
    }
  }

  // Redefinir senha do usuário
  resetUserPassword(userId) {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      const defaultPassword = '12345678';
      
      bcrypt.hash(defaultPassword, 10, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        const sql = 'UPDATE users SET password = ?, password_reset_required = 1 WHERE id = ?';
        
        this.db.run(sql, [hash, userId], function(err) {
          if (err) {
            console.error('Erro ao redefinir senha:', err);
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      });
    });
  }

  // Redefinir senha do admin
  resetAdminPassword() {
    return new Promise((resolve, reject) => {
      const bcrypt = require('bcrypt');
      const adminPassword = 'admin2509';
      
      bcrypt.hash(adminPassword, 10, (err, hash) => {
        if (err) {
          reject(err);
          return;
        }

        const sql = 'UPDATE users SET password = ?, password_reset_required = 1 WHERE username = ? AND is_admin = 1';
        
        this.db.run(sql, [hash, 'admin'], function(err) {
          if (err) {
            console.error('Erro ao redefinir senha do admin:', err);
            reject(err);
            return;
          }
          resolve(this.changes);
        });
      });
    });
  }

  // Verificar se usuário precisa trocar senha
  isPasswordResetRequired(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT password_reset_required FROM users WHERE id = ?';
      
      this.db.get(sql, [userId], (err, row) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(row ? row.password_reset_required === 1 : false);
      });
    });
  }

  // Marcar que usuário trocou a senha
  markPasswordChanged(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET password_reset_required = 0 WHERE id = ?';
      
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
          return;
        }
        resolve(this.changes);
      });
    });
  }

  // Métodos para gerenciar usuários online
  setUserOnline(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET is_online = 1, last_activity = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  setUserOffline(userId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET is_online = 0 WHERE id = ?';
      this.db.run(sql, [userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  getOnlineUsers() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, whatsapp_number, last_activity FROM users WHERE is_online = 1 AND is_active = 1';
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  updateUserWhatsApp(userId, whatsappNumber) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE users SET whatsapp_number = ? WHERE id = ?';
      this.db.run(sql, [whatsappNumber, userId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  getUsersWithWhatsApp() {
    return new Promise((resolve, reject) => {
      const sql = 'SELECT id, username, email, whatsapp_number, is_online FROM users WHERE whatsapp_number IS NOT NULL AND whatsapp_number != "" AND is_active = 1';
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Métodos para notificações WhatsApp
  saveWhatsAppNotification(userId, messageId, senderName) {
    return new Promise((resolve, reject) => {
      const sql = 'INSERT INTO whatsapp_notifications (user_id, message_id, sender_name) VALUES (?, ?, ?)';
      this.db.run(sql, [userId, messageId, senderName], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  markNotificationSent(notificationId) {
    return new Promise((resolve, reject) => {
      const sql = 'UPDATE whatsapp_notifications SET notification_sent = 1, sent_at = CURRENT_TIMESTAMP WHERE id = ?';
      this.db.run(sql, [notificationId], function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  getPendingNotifications() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT n.id, n.user_id, n.message_id, n.sender_name, u.whatsapp_number, u.username
        FROM whatsapp_notifications n
        JOIN users u ON n.user_id = u.id
        WHERE n.notification_sent = 0 AND u.is_online = 1 AND u.whatsapp_number IS NOT NULL
      `;
      this.db.all(sql, [], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  // Fechar conexão
  close() {
    return new Promise((resolve) => {
      if (this.db) {
        this.db.close((err) => {
          if (err) {
            console.error('Erro ao fechar banco:', err);
          } else {
            console.log('Conexão com banco fechada');
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = Database;
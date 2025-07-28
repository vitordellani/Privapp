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
            resolve();
          });
        });
      });
    });
  }

  // Salvar mensagem
  saveMessage(messageData) {
    return new Promise((resolve, reject) => {
      const { 
        id, from, to, body, timestamp, mediaFilename, mimetype, 
        fromMe, senderName, groupName, photoUrl, mediaError 
      } = messageData;

      // Validações para evitar valores NULL
      const validatedId = id || `temp_${Date.now()}`;
      const validatedFrom = from || 'unknown';
      const validatedTo = to || 'unknown';
      const validatedBody = body || '';
      const validatedTimestamp = timestamp || Date.now();
      const validatedSenderName = senderName || 'Unknown';

      const sql = `
        INSERT OR REPLACE INTO messages 
        (id, from_number, to_number, body, timestamp, media_filename, mimetype, 
         from_me, sender_name, group_name, photo_url, media_error)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      this.db.run(sql, [
        validatedId, validatedFrom, validatedTo, validatedBody, validatedTimestamp, 
        mediaFilename, mimetype, fromMe ? 1 : 0, validatedSenderName, 
        groupName, photoUrl, mediaError
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
          m.media_error as mediaError
        FROM messages m
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
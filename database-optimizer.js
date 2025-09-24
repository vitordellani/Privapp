const sqlite3 = require('sqlite3').verbose();
const path = require('path');

/**
 * Classe para otimização de performance do banco de dados
 * Implementa índices, consultas paginadas e cache para reduzir latência
 */
class DatabaseOptimizer {
  constructor(database) {
    this.db = database.db;
    this.cache = new Map();
    this.cacheTimeout = 60000; // 1 minuto de cache
  }

  /**
   * Criar índices otimizados para consultas frequentes
   */
  async createOptimizedIndexes() {
    const indexes = [
      // Índices para mensagens
      'CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON messages(timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_from_to ON messages(from_number, to_number)',
      'CREATE INDEX IF NOT EXISTS idx_messages_contact ON messages(from_number) WHERE from_me = 0',
      'CREATE INDEX IF NOT EXISTS idx_messages_to_contact ON messages(to_number) WHERE from_me = 1',
      'CREATE INDEX IF NOT EXISTS idx_messages_from_me ON messages(from_me, timestamp DESC)',
      'CREATE INDEX IF NOT EXISTS idx_messages_user_name ON messages(user_name)',
      
      // Índices para reações
      'CREATE INDEX IF NOT EXISTS idx_reactions_msg_id ON reactions(message_id)',
      'CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_reactions_composite ON reactions(message_id, user_id)',
      
      // Índices para usuários
      'CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = 1',
      'CREATE INDEX IF NOT EXISTS idx_users_online ON users(is_online) WHERE is_online = 1',
      'CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)',
      'CREATE INDEX IF NOT EXISTS idx_users_last_activity ON users(last_activity DESC)',
      
      // Índices para notificações
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON whatsapp_notifications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_sent ON whatsapp_notifications(notification_sent, created_at DESC)'
    ];
    
    console.log('[DB-OPTIMIZER] Criando índices otimizados...');
    
    for (const index of indexes) {
      try {
        await this.runQuery(index);
        console.log('[DB-OPTIMIZER] ✅ Índice criado:', index.split(' ')[5]);
      } catch (error) {
        console.error('[DB-OPTIMIZER] ❌ Erro ao criar índice:', error.message);
      }
    }
    
    console.log('[DB-OPTIMIZER] Índices otimizados criados com sucesso!');
  }

  /**
   * Executar query com Promise
   */
  runQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this);
        }
      });
    });
  }

  /**
   * Executar query SELECT com Promise
   */
  allQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  /**
   * Executar query SELECT para um único resultado
   */
  getQuery(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row);
        }
      });
    });
  }

  /**
   * Buscar mensagens com paginação otimizada
   */
  async getMessagesPaginated(contact, limit = 50, offset = 0, includeReactions = true) {
    const cacheKey = `messages_${contact}_${limit}_${offset}_${includeReactions}`;
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('[DB-OPTIMIZER] 📋 Cache hit para mensagens:', cacheKey);
        return cached.data;
      }
    }

    const query = `
      SELECT 
        m.id, m.from_number as "from", m.to_number as "to", m.body, 
        m.timestamp, m.media_filename as mediaFilename, m.mimetype,
        m.from_me as fromMe, m.sender_name as senderName, 
        m.group_name as groupName, m.photo_url as photoUrl,
        m.media_error as mediaError, m.user_name as userName,

        m.user_profile_photo as userProfilePhoto,

        m.is_read as isRead, m.read_at as readAt,

        ${includeReactions ? 'GROUP_CONCAT(r.emoji) as reactions_emojis,' : ''}
        ${includeReactions ? 'GROUP_CONCAT(r.user_id) as reactions_users' : ''}
      FROM messages m
      ${includeReactions ? 'LEFT JOIN reactions r ON m.id = r.message_id' : ''}
      WHERE (m.from_number = ? OR m.to_number = ?)
        AND m.from_number != 'status@broadcast' 
        AND m.to_number != 'status@broadcast'
      ${includeReactions ? 'GROUP BY m.id' : ''}
      ORDER BY m.timestamp DESC
      LIMIT ? OFFSET ?
    `;
    
    try {
      const rows = await this.allQuery(query, [contact, contact, limit, offset]);
      
      // Processar reações se incluídas
      const messages = rows.map(row => {
        const message = {
          ...row,
          fromMe: Boolean(row.fromMe),
          isRead: Boolean(row.isRead),
          readAt: row.readAt,
          reactions: []
        };
        
        if (includeReactions && row.reactions_emojis) {
          const emojis = row.reactions_emojis.split(',');
          const users = row.reactions_users.split(',');
          
          message.reactions = emojis.map((emoji, index) => ({
            emoji,
            user: users[index]
          }));
        }
        
        // Remover campos temporários
        delete message.reactions_emojis;
        delete message.reactions_users;
        
        return message;
      });
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: messages,
        timestamp: Date.now()
      });
      
      console.log(`[DB-OPTIMIZER] 📊 Mensagens carregadas: ${messages.length} (${contact})`);
      return messages;
      
    } catch (error) {
      console.error('[DB-OPTIMIZER] Erro ao buscar mensagens paginadas:', error);
      throw error;
    }
  }

  /**
   * Buscar contatos com contagem de mensagens não lidas
   */
  async getContactsWithUnreadCount() {
    const cacheKey = 'contacts_unread_count';
    
    // Verificar cache
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey);
      if (Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log('[DB-OPTIMIZER] 📋 Cache hit para contatos');
        return cached.data;
      }
    }

    const query = `
      SELECT 
        CASE 
          WHEN from_me = 1 THEN to_number 
          ELSE from_number 
        END as contact,
        sender_name,
        MAX(timestamp) as last_message_time,
        COUNT(CASE WHEN from_me = 0 AND is_read = 0 THEN 1 END) as unread_count,
        (
          SELECT body 
          FROM messages m2 
          WHERE (m2.from_number = contact OR m2.to_number = contact)
            AND m2.timestamp = MAX(m.timestamp)
          LIMIT 1
        ) as last_message
      FROM messages m
      WHERE from_number != 'status@broadcast' 
        AND to_number != 'status@broadcast'
      GROUP BY contact
      ORDER BY last_message_time DESC
    `;
    
    try {
      const contacts = await this.allQuery(query);
      
      // Salvar no cache
      this.cache.set(cacheKey, {
        data: contacts,
        timestamp: Date.now()
      });
      
      console.log(`[DB-OPTIMIZER] 📊 Contatos carregados: ${contacts.length}`);
      return contacts;
      
    } catch (error) {
      console.error('[DB-OPTIMIZER] Erro ao buscar contatos:', error);
      throw error;
    }
  }

  /**
   * Inserir mensagens em lote para melhor performance
   */
  async insertMessagesBatch(messages) {
    if (!messages || messages.length === 0) {
      return;
    }

    const stmt = await new Promise((resolve, reject) => {
      const statement = this.db.prepare(`
        INSERT OR REPLACE INTO messages 
        (id, from_number, to_number, body, timestamp, media_filename, mimetype, 
         from_me, sender_name, group_name, photo_url, media_error, user_name, user_profile_photo, is_read, read_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      if (statement) {
        resolve(statement);
      } else {
        reject(new Error('Falha ao preparar statement'));
      }
    });
    
    try {
      await this.runQuery('BEGIN TRANSACTION');
      
      for (const msg of messages) {
        const {
          id, from, to, body, timestamp, mediaFilename, mimetype,
          fromMe, senderName, groupName, photoUrl, mediaError, userName, userProfilePhoto,
          isRead: rawIsRead, readAt: rawReadAt
        } = msg;

        const normalizedFromMe = fromMe ? 1 : 0;
        const initialIsRead = normalizedFromMe ? 1 : (rawIsRead ? 1 : 0);
        const initialReadAt = initialIsRead ? (rawReadAt || new Date().toISOString()) : null;

        await new Promise((resolve, reject) => {
          stmt.run([
            id || `temp_${Date.now()}`,
            from || 'unknown',
            to || 'unknown', 
            body || '',
            timestamp || Date.now(),
            mediaFilename,
            mimetype,
            normalizedFromMe,
            senderName || 'Unknown',
            groupName,
            photoUrl,
            mediaError,
            userName,
            userProfilePhoto,
            initialIsRead,
            initialReadAt
          ], (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      }
      
      await this.runQuery('COMMIT');
      console.log(`[DB-OPTIMIZER] ✅ Lote de ${messages.length} mensagens inserido com sucesso`);
      
    } catch (error) {
      await this.runQuery('ROLLBACK');
      console.error('[DB-OPTIMIZER] ❌ Erro no lote de mensagens:', error);
      throw error;
    } finally {
      stmt.finalize();
    }
    
    // Limpar cache relacionado
    this.clearCache('messages_');
    this.clearCache('contacts_');
  }

  /**
   * Buscar estatísticas de performance do banco
   */
  async getDatabaseStats() {
    try {
      const stats = {};
      
      // Contagem de tabelas
      stats.messages_count = await this.getQuery('SELECT COUNT(*) as count FROM messages');
      stats.reactions_count = await this.getQuery('SELECT COUNT(*) as count FROM reactions');
      stats.users_count = await this.getQuery('SELECT COUNT(*) as count FROM users');
      
      // Tamanho do banco
      const sizeQuery = "SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()";
      stats.database_size = await this.getQuery(sizeQuery);
      
      // Índices
      const indexQuery = "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%'";
      const indexes = await this.allQuery(indexQuery);
      stats.indexes_count = indexes.length;
      
      // Cache stats
      stats.cache_size = this.cache.size;
      
      console.log('[DB-OPTIMIZER] 📊 Estatísticas do banco:', stats);
      return stats;
      
    } catch (error) {
      console.error('[DB-OPTIMIZER] Erro ao obter estatísticas:', error);
      throw error;
    }
  }

  /**
   * Limpar cache por prefixo
   */
  clearCache(prefix = '') {
    if (!prefix) {
      this.cache.clear();
      console.log('[DB-OPTIMIZER] 🗑️ Cache completamente limpo');
      return;
    }
    
    const keysToDelete = [];
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`[DB-OPTIMIZER] 🗑️ Cache limpo: ${keysToDelete.length} entradas removidas`);
  }

  /**
   * Executar VACUUM para otimizar o banco
   */
  async vacuumDatabase() {
    try {
      console.log('[DB-OPTIMIZER] 🔧 Iniciando VACUUM do banco...');
      await this.runQuery('VACUUM');
      console.log('[DB-OPTIMIZER] ✅ VACUUM concluído com sucesso');
    } catch (error) {
      console.error('[DB-OPTIMIZER] ❌ Erro no VACUUM:', error);
      throw error;
    }
  }

  /**
   * Analisar tabelas para otimizar planos de consulta
   */
  async analyzeDatabase() {
    try {
      console.log('[DB-OPTIMIZER] 📈 Analisando tabelas...');
      await this.runQuery('ANALYZE');
      console.log('[DB-OPTIMIZER] ✅ Análise concluída');
    } catch (error) {
      console.error('[DB-OPTIMIZER] ❌ Erro na análise:', error);
      throw error;
    }
  }

  /**
   * Configurar otimizações de performance do SQLite
   */
  async configurePerformanceSettings() {
    const settings = [
      'PRAGMA journal_mode = WAL',        // Write-Ahead Logging para melhor concorrência
      'PRAGMA synchronous = NORMAL',      // Balanço entre segurança e performance
      'PRAGMA cache_size = 10000',        // Cache de 10MB
      'PRAGMA temp_store = MEMORY',       // Tabelas temporárias em memória
      'PRAGMA mmap_size = 268435456',     // Memory-mapped I/O de 256MB
      'PRAGMA optimize'                   // Otimização automática
    ];
    
    console.log('[DB-OPTIMIZER] ⚙️ Configurando otimizações de performance...');
    
    for (const setting of settings) {
      try {
        await this.runQuery(setting);
        console.log(`[DB-OPTIMIZER] ✅ ${setting}`);
      } catch (error) {
        console.error(`[DB-OPTIMIZER] ❌ Erro em ${setting}:`, error.message);
      }
    }
  }

  /**
   * Inicializar todas as otimizações
   */
  async initialize() {
    try {
      console.log('[DB-OPTIMIZER] 🚀 Inicializando otimizações do banco de dados...');
      
      await this.configurePerformanceSettings();
      await this.createOptimizedIndexes();
      await this.analyzeDatabase();
      
      console.log('[DB-OPTIMIZER] ✅ Otimizações inicializadas com sucesso!');
      
      // Configurar limpeza automática de cache
      setInterval(() => {
        this.clearExpiredCache();
      }, 300000); // A cada 5 minutos
      
    } catch (error) {
      console.error('[DB-OPTIMIZER] ❌ Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Limpar cache expirado
   */
  clearExpiredCache() {
    const now = Date.now();
    const keysToDelete = [];
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.cache.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`[DB-OPTIMIZER] 🗑️ Cache expirado limpo: ${keysToDelete.length} entradas`);
    }
  }
}

module.exports = DatabaseOptimizer;



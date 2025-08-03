const Database = require('./database');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class ColumnMigration {
  constructor() {
    const dbPath = path.join(__dirname, 'messages.db');
    this.db = new sqlite3.Database(dbPath);
  }

  async migrateColumns() {
    console.log('Iniciando migração de colunas...');
    
    try {
      // Verificar se as colunas existem
      const tableInfo = await this.getTableInfo('users');
      const columnNames = tableInfo.map(col => col.name);
      
      console.log('Colunas existentes:', columnNames);
      
      // Adicionar coluna whatsapp_number se não existir
      if (!columnNames.includes('whatsapp_number')) {
        await this.addColumn('users', 'whatsapp_number', 'TEXT');
        console.log('Coluna whatsapp_number adicionada');
      }
      
      // Adicionar coluna is_online se não existir
      if (!columnNames.includes('is_online')) {
        await this.addColumn('users', 'is_online', 'BOOLEAN DEFAULT 0');
        console.log('Coluna is_online adicionada');
      }
      
      // Adicionar coluna last_activity se não existir
      if (!columnNames.includes('last_activity')) {
        await this.addColumn('users', 'last_activity', 'DATETIME');
        console.log('Coluna last_activity adicionada');
      }
      
      console.log('Migração concluída com sucesso!');
      
    } catch (error) {
      console.error('Erro na migração:', error);
    } finally {
      this.db.close();
    }
  }
  
  getTableInfo(tableName) {
    return new Promise((resolve, reject) => {
      this.db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }
  
  addColumn(tableName, columnName, columnType) {
    return new Promise((resolve, reject) => {
      const sql = `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`;
      this.db.run(sql, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

// Executar migração
const migration = new ColumnMigration();
migration.migrateColumns();
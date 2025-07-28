# Migração para SQLite - Privapp

## Resumo da Migração

A aplicação Privapp foi migrada com sucesso do armazenamento JSON para SQLite, oferecendo melhor performance, integridade de dados e escalabilidade.

## Arquivos Modificados

### Novos Arquivos Criados:
- `database.js` - Módulo principal do banco de dados SQLite
- `migrate.js` - Script de migração dos dados JSON para SQLite
- `test-db.js` - Script de teste do banco de dados
- `messages.db` - Arquivo do banco SQLite (criado automaticamente)
- `messages.json.backup` - Backup do arquivo JSON original

### Arquivos Modificados:
- `app.js` - Atualizado para usar SQLite ao invés de JSON
- `package.json` - Adicionada dependência `sqlite3`
- `.gitignore` - Adicionados arquivos de banco e backup

## Estrutura do Banco de Dados

### Tabela `messages`
```sql
CREATE TABLE messages (
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
```

### Tabela `reactions`
```sql
CREATE TABLE reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id TEXT NOT NULL,
  emoji TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES messages (id) ON DELETE CASCADE,
  UNIQUE(message_id, emoji, user_id)
)
```

## Benefícios da Migração

### 1. Performance
- **Consultas mais rápidas**: Índices automáticos no SQLite
- **Menos uso de memória**: Não precisa carregar todo o JSON na memória
- **Consultas otimizadas**: SQL permite filtros e ordenação eficientes

### 2. Integridade de Dados
- **Chaves primárias**: Evita duplicatas de mensagens
- **Chaves estrangeiras**: Garante integridade referencial das reações
- **Transações**: Operações atômicas para evitar corrupção

### 3. Escalabilidade
- **Suporte a grandes volumes**: SQLite pode lidar com milhões de registros
- **Consultas complexas**: Possibilidade de JOINs e agregações
- **Backup eficiente**: Arquivo único e compacto

### 4. Manutenibilidade
- **Estrutura clara**: Esquema bem definido
- **Migrações**: Facilita futuras atualizações
- **Debugging**: Logs mais detalhados de operações

## Como Executar

### 1. Instalação das Dependências
```bash
npm install
```

### 2. Migração dos Dados (Automática)
A migração acontece automaticamente na primeira execução da aplicação:
```bash
npm start
```

### 3. Migração Manual (Opcional)
Se precisar migrar manualmente:
```bash
node migrate.js
```

### 4. Teste do Banco
Para verificar se tudo está funcionando:
```bash
node test-db.js
```

## Funcionalidades Mantidas

Todas as funcionalidades originais foram preservadas:

- ✅ Receber e enviar mensagens
- ✅ Gerenciar reações (adicionar/remover)
- ✅ Upload de mídia
- ✅ Interface web com Socket.IO
- ✅ Autenticação Keycloak
- ✅ Atualização em tempo real

## APIs Atualizadas

### GET `/api/messages`
- **Antes**: Lê arquivo JSON
- **Agora**: Consulta SQLite com JOIN para reações

### POST `/api/send`
- **Antes**: Adiciona ao array JSON
- **Agora**: INSERT no SQLite

### POST `/api/react`
- **Antes**: Modifica array de reações no JSON
- **Agora**: INSERT/DELETE na tabela reactions

### POST `/api/clear`
- **Antes**: Limpa arquivo JSON
- **Agora**: DELETE FROM messages

## Backup e Segurança

- **Backup automático**: `messages.json.backup` criado durante migração
- **Integridade**: Chaves estrangeiras garantem consistência
- **Transações**: Operações críticas são atômicas

## Monitoramento

### Logs Importantes
- `Conectado ao banco SQLite` - Inicialização bem-sucedida
- `Migrando X mensagens do JSON para SQLite` - Progresso da migração
- `Erro ao salvar mensagem no banco` - Problemas de escrita

### Métricas
- Total de mensagens migradas
- Total de reações migradas
- Performance das consultas

## Troubleshooting

### Erro: "SQLITE_ERROR: near 'from': syntax error"
- **Causa**: Palavras reservadas no SQL
- **Solução**: Usar aspas duplas nos aliases

### Erro: "SQLITE_CONSTRAINT: NOT NULL constraint failed: messages.from_number"
- **Causa**: Valores NULL sendo passados para campos obrigatórios
- **Solução**: Validações implementadas no `database.js` e `app.js`
- **Status**: ✅ **CORRIGIDO** - Validações automáticas implementadas

### Erro: "Database is locked"
- **Causa**: Múltiplas conexões simultâneas
- **Solução**: Aguardar liberação ou reiniciar aplicação

### Erro: "no such table"
- **Causa**: Banco não inicializado
- **Solução**: Verificar se `database.js` está sendo importado

## Próximos Passos

1. **Monitoramento**: Acompanhar performance em produção
2. **Otimizações**: Adicionar índices conforme necessário
3. **Backup**: Implementar backup automático do banco
4. **Migração**: Considerar migração para PostgreSQL para produção

## Correções Implementadas

### ✅ Erro de Constraint NOT NULL Corrigido
- **Problema**: Erro `SQLITE_CONSTRAINT: NOT NULL constraint failed: messages.from_number`
- **Causa**: Valores NULL sendo passados para campos obrigatórios
- **Solução**: Implementadas validações automáticas em:
  - `database.js`: Validação no método `saveMessage()`
  - `app.js`: Validação na função `saveMessage()` e APIs
- **Resultado**: Aplicação agora trata valores NULL/undefined automaticamente

### Validações Implementadas:
- `from` → `'unknown'` se NULL/undefined
- `to` → `'unknown'` se NULL/undefined  
- `body` → `''` se NULL/undefined
- `id` → `temp_${timestamp}` se NULL/undefined
- `senderName` → `'Unknown'` se NULL/undefined
- `timestamp` → `Date.now()` se NULL/undefined

## Conclusão

A migração para SQLite foi bem-sucedida, mantendo todas as funcionalidades existentes enquanto melhora significativamente a performance e integridade dos dados. **O erro de constraint NOT NULL foi identificado e corrigido**, garantindo que a aplicação funcione de forma estável mesmo com dados incompletos ou inválidos. A aplicação agora está preparada para lidar com volumes maiores de mensagens e oferece uma base sólida para futuras expansões. 
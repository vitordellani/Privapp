# Sistema de Login - Privapp

## Visão Geral

O sistema de login foi implementado com sucesso na aplicação Privapp, permitindo múltiplos usuários acessarem o sistema com diferentes níveis de permissão.

## Funcionalidades Implementadas

### 1. Autenticação de Usuários
- **Login seguro** com senhas criptografadas usando bcrypt
- **Sessões persistentes** usando express-session
- **Redirecionamento automático** baseado no tipo de usuário

### 2. Tipos de Usuário
- **Administrador**: Acesso à página de gerenciamento de usuários
- **Usuário Normal**: Acesso à aplicação principal (index)

### 3. Gerenciamento de Usuários (Admin)
- ✅ Criar novos usuários
- ✅ Ativar/Desativar usuários
- ✅ Excluir usuários (exceto admin)
- ✅ Visualizar lista de usuários
- ✅ Ver histórico de login

## Estrutura do Banco de Dados

### Tabela `users`
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  email TEXT,
  is_admin BOOLEAN DEFAULT 0,
  is_active BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_login DATETIME
);
```

## Rotas Implementadas

### Autenticação
- `GET /login` - Página de login
- `POST /login` - Processar login
- `GET /logout` - Fazer logout

### Administração
- `GET /admin` - Página de administração (apenas admin)
- `GET /api/users` - Listar usuários
- `POST /api/users` - Criar usuário
- `PUT /api/users/:id/status` - Ativar/Desativar usuário
- `DELETE /api/users/:id` - Excluir usuário

### Proteção de Rotas
- `GET /` - Página principal (requer autenticação)

## Usuário Padrão

**Administrador inicial:**
- **Usuário:** `admin`
- **Senha:** `admin123`
- **Email:** `admin@privapp.com`

⚠️ **IMPORTANTE:** Altere a senha do administrador após o primeiro login!

## Como Usar

### 1. Primeiro Acesso
1. Acesse `http://localhost:3000`
2. Você será redirecionado para `/login`
3. Use as credenciais padrão do admin
4. Após o login, você será redirecionado para `/admin`

### 2. Gerenciamento de Usuários (Admin)
1. Na página de administração, clique em "Novo Usuário"
2. Preencha os dados do usuário
3. Marque "Usuário Administrador" se necessário
4. Clique em "Criar Usuário"

### 3. Usuários Normais
1. Usuários normais fazem login normalmente
2. São redirecionados para a aplicação principal
3. Podem usar todas as funcionalidades do WhatsApp

### 4. Controles de Acesso
- **Ativar/Desativar:** Clique no ícone de play/pause
- **Excluir:** Clique no ícone de lixeira
- **Admin não pode ser excluído** por segurança

## Segurança

### Implementada
- ✅ Senhas criptografadas com bcrypt (salt rounds: 10)
- ✅ Sessões seguras com express-session
- ✅ Middleware de autenticação
- ✅ Middleware de autorização para admin
- ✅ Proteção contra SQL injection
- ✅ Validação de entrada

### Recomendações Futuras
- 🔒 Implementar rate limiting
- 🔒 Adicionar autenticação de dois fatores
- 🔒 Implementar logs de auditoria
- 🔒 Adicionar expiração de sessão
- 🔒 Implementar recuperação de senha

## Arquivos Modificados/Criados

### Backend
- `database.js` - Adicionada tabela users e métodos de autenticação
- `app.js` - Adicionadas rotas de autenticação e middleware
- `package.json` - Adicionada dependência bcrypt

### Frontend
- `public/login.html` - Página de login (novo)
- `public/admin.html` - Página de administração (novo)
- `public/index.html` - Adicionado botão de logout
- `public/styles.css` - Estilos para botão de logout
- `public/script.js` - Função de logout

## Estrutura de Arquivos

```
Privapp/
├── app.js                 # Rotas de autenticação
├── database.js           # Métodos de usuário
├── public/
│   ├── login.html        # Página de login
│   ├── admin.html        # Página de administração
│   ├── index.html        # Página principal (modificada)
│   ├── styles.css        # Estilos (modificada)
│   └── script.js         # Scripts (modificado)
└── messages.db           # Banco SQLite (criado automaticamente)
```

## Troubleshooting

### Problemas Comuns

1. **Erro de módulo bcrypt**
   ```bash
   npm install bcrypt
   ```

2. **Usuário não consegue fazer login**
   - Verifique se o usuário está ativo
   - Confirme se a senha está correta
   - Verifique os logs do servidor

3. **Erro de permissão no banco**
   - Verifique se o arquivo `messages.db` tem permissões de escrita
   - Reinicie o servidor

4. **Sessão não persiste**
   - Verifique se o middleware de sessão está configurado
   - Confirme se o secret está definido

## Próximos Passos

1. **Alterar senha do admin** após primeiro login
2. **Criar usuários normais** para teste
3. **Configurar backup** do banco de dados
4. **Implementar logs** de acesso
5. **Adicionar validações** mais robustas

## Suporte

Para dúvidas ou problemas:
1. Verifique os logs do servidor
2. Confirme se todas as dependências estão instaladas
3. Verifique se o banco de dados foi criado corretamente
4. Teste com o usuário admin padrão primeiro 
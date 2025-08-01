# Sistema de Redefinição de Senha - Privapp

## Visão Geral

O sistema de redefinição de senha do Privapp implementa uma funcionalidade de segurança padrão que obriga usuários a trocar suas senhas após uma redefinição administrativa.

## Funcionalidades

### 1. Redefinição de Senha de Usuários
- **Senha padrão**: `12345678`
- **Acesso**: Apenas administradores
- **Localização**: Interface administrativa (`/admin`)
- **Botão**: Ícone de chave (🔑) na tabela de usuários

### 2. Redefinição de Senha do Admin
- **Senha padrão**: `admin2509`
- **Acesso**: Apenas administradores
- **Localização**: Interface administrativa (`/admin`)
- **Botão**: "Resetar Senha Admin" no cabeçalho

### 3. Definição Obrigatória de Nova Senha
- **Trigger**: Primeiro login após redefinição
- **Página**: `/change-password`
- **Validações**: 
  - Mínimo 8 caracteres
  - Pelo menos uma letra maiúscula
  - Pelo menos uma letra minúscula
  - Pelo menos um número
  - Não exige senha atual (senha temporária conhecida)

## Fluxo de Funcionamento

### Para Usuários Comuns
1. Admin redefine senha → Nova senha: `12345678`
2. Usuário faz login com senha redefinida
3. Sistema detecta necessidade de troca
4. Usuário é redirecionado para `/change-password`
5. Usuário define nova senha (sem precisar informar senha atual)
6. Sistema marca `password_reset_required = 0`
7. Usuário é redirecionado para página principal

### Para Administradores
1. Admin redefine senha do admin → Nova senha: `admin2509`
2. Admin faz login com senha redefinida
3. Sistema detecta necessidade de troca
4. Admin é redirecionado para `/change-password`
5. Admin define nova senha (sem precisar informar senha atual)
6. Sistema marca `password_reset_required = 0`
7. Admin é redirecionado para `/admin`

## Estrutura do Banco de Dados

### Tabela `users`
```sql
ALTER TABLE users ADD COLUMN password_reset_required BOOLEAN DEFAULT 0;
```

### Campos Adicionados
- `password_reset_required`: Indica se o usuário precisa trocar a senha

## APIs Implementadas

### Redefinição de Senha
- `POST /api/users/:id/reset-password` - Redefinir senha de usuário
- `POST /api/admin/reset-password` - Redefinir senha do admin

### Definição de Nova Senha
- `POST /api/change-password` - Definir nova senha (sem exigir senha atual)
- `GET /api/check-password-reset` - Verificar se precisa trocar senha

## Scripts Disponíveis

### Script de Reset do Admin
```bash
node reset-admin-password.js
```

**Funcionalidades:**
- Conecta diretamente ao banco SQLite
- Redefine senha do admin para `admin2509`
- Marca necessidade de troca de senha
- Feedback visual do processo

## Interface do Usuário

### Página de Definição de Nova Senha (`/change-password`)
- Design responsivo e moderno
- Não exige senha atual (senha temporária conhecida)
- Validação em tempo real dos requisitos
- Indicadores visuais de força da senha
- Mensagens de erro claras
- Redirecionamento automático após sucesso

### Interface Administrativa
- Botão de reset individual para cada usuário
- Botão de reset para admin no cabeçalho
- Confirmações antes de executar ações
- Feedback visual das operações

## Segurança

### Medidas Implementadas
1. **Hash de Senhas**: Todas as senhas são hasheadas com bcrypt
2. **Validação de Sessão**: Verificação de autenticação em todas as rotas
3. **Controle de Acesso**: Apenas admins podem redefinir senhas
4. **Senhas Temporárias**: Senhas redefinidas são temporárias
5. **Validação de Força**: Requisitos mínimos para novas senhas

### Boas Práticas
- Senhas padrão são conhecidas e temporárias
- Usuários são obrigados a trocar senhas no primeiro acesso
- Interface clara sobre a necessidade de troca
- Logs de operações administrativas

## Configuração

### Dependências
- `bcrypt`: Para hash de senhas
- `sqlite3`: Banco de dados
- `express-session`: Gerenciamento de sessões

### Variáveis de Ambiente
Nenhuma variável adicional necessária. O sistema usa as configurações existentes.

## Troubleshooting

### Problemas Comuns

1. **Usuário não consegue fazer login após reset**
   - Verificar se a senha foi redefinida corretamente
   - Confirmar se o usuário está ativo no sistema

2. **Página de troca de senha não aparece**
   - Verificar se `password_reset_required = 1` no banco
   - Confirmar se a rota `/change-password` está acessível

3. **Erro ao redefinir senha**
   - Verificar permissões de administrador
   - Confirmar se o banco de dados está acessível

### Logs
- Todas as operações de redefinição são logadas no console
- Erros são exibidos com detalhes para debugging

## Manutenção

### Backup
- Sempre fazer backup do banco antes de operações em massa
- O script de reset do admin é seguro para uso individual

### Monitoramento
- Verificar logs de redefinição de senha
- Monitorar tentativas de login com senhas padrão
- Acompanhar usuários que não trocaram senhas

## Futuras Melhorias

1. **Notificações por Email**: Avisar usuários sobre redefinição
2. **Histórico de Senhas**: Evitar reutilização de senhas antigas
3. **Política de Expiração**: Forçar troca periódica de senhas
4. **Auditoria**: Log detalhado de todas as operações
5. **Múltiplos Admins**: Controle de quem pode redefinir senhas 
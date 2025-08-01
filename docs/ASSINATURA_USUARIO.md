# Sistema de Assinatura de Usuário - Privapp

## Visão Geral

Implementamos um sistema de assinatura automática que adiciona o nome do usuário logado em negrito em todas as mensagens enviadas, incluindo mídias.

## Funcionalidade

### Como Funciona

Quando um usuário logado envia uma mensagem (texto ou mídia), o sistema automaticamente adiciona uma assinatura no formato:

**Para mensagens de texto:**
```
*Nome do Usuário*:
Mensagem
```

**Para mensagens de mídia:**
```
*Nome do Usuário*: [como legenda da mídia]
```

### Exemplo Visual

**Antes:**
```
Olá, como você está?
```

**Depois:**
```
*Vitor*:
Olá, como você está?
```

## Implementação Técnica

### 1. Backend - Captura do Nome do Usuário

#### Modificações no `app.js`:

**Envio de Mensagens de Texto:**
```javascript
// Verificar se o usuário está autenticado
if (!req.session || !req.session.user) {
  return res.status(401).json({ error: 'Usuário não autenticado' });
}

// Adicionar assinatura do usuário à mensagem
const mensagemComAssinatura = `*${req.session.user.username}*:\n${message}`;

// Enviar mensagem com assinatura para o WhatsApp
sentMsg = await client.sendMessage(to, mensagemComAssinatura);

// Salva mensagem com o nome do usuário logado
const obj = {
  // ... outros campos ...
  userName: req.session.user.username // Nome do usuário logado para assinatura
};
```

**Envio de Mídia:**
```javascript
// Verificar se o usuário está autenticado
if (!req.session || !req.session.user) {
  return res.status(401).json({ error: 'Usuário não autenticado' });
}

// Adicionar assinatura do usuário como legenda da mídia
const legendaComAssinatura = `*${req.session.user.username}*:`;

// Enviar mídia com assinatura como legenda
const sentMsg = await client.sendMessage(to, new MessageMedia(...), { 
  caption: legendaComAssinatura 
});

// Salva mídia com o nome do usuário logado
let obj = {
  // ... outros campos ...
  userName: req.session.user.username // Nome do usuário logado para assinatura
};
```

### 2. Banco de Dados - Armazenamento

#### Nova Coluna na Tabela `messages`:
```sql
ALTER TABLE messages ADD COLUMN user_name TEXT;
```

#### Estrutura Atualizada:
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
  user_name TEXT,           -- ← NOVA COLUNA
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### 3. Frontend - Exibição da Assinatura

#### Modificações no `script.js`:

**Detecção de Mensagens Enviadas:**
```javascript
const enviada = msg.fromMe || (meuNumero && msg.from === meuNumero);

// Assinatura do usuário para mensagens enviadas
let assinatura = '';
if (enviada && msg.userName) {
  assinatura = `<div style="font-weight: bold; color: #25d366; margin-bottom: 5px;">*${msg.userName}*:</div>`;
}
```

**Renderização no HTML:**
```javascript
mensagensDiv.innerHTML += `
  <div class="msg" data-message-id="${msg.id || msg.timestamp}">
    <div class="bubble ${enviada ? 'enviada' : 'recebida'}">
      ${replyHtml}
      ${assinatura}  // ← ASSINATURA AQUI
      ${formatarMensagemWhatsApp(msg.body) || '[Mídia]'}${midiaHtml}
      // ... resto do conteúdo
    </div>
  </div>
`;
```

## Características da Assinatura

### 1. Formato Visual
- **Nome em negrito:** `*Nome do Usuário*`
- **Cor:** Verde (#25d366) - cor padrão do WhatsApp
- **Posicionamento:** Acima da mensagem
- **Separador:** Dois pontos (`:`)

### 2. Aplicação Automática
- ✅ **Mensagens de texto** - Assinatura incluída no início da mensagem
- ✅ **Mensagens de mídia** - Assinatura como legenda da mídia
- ✅ **Respostas a mensagens** - Assinatura mantida em respostas
- ✅ **Encaminhamentos** - Assinatura preservada em encaminhamentos

### 3. Condições de Exibição
- Apenas em mensagens **enviadas** pelo usuário logado
- Apenas quando o usuário está **autenticado**
- Apenas quando o campo `userName` está preenchido
- **Refletida no WhatsApp:** A assinatura é enviada diretamente para o WhatsApp

## Migração de Dados

### Script de Migração
Criamos o arquivo `migrate-user-signature.js` para:

1. **Adicionar a coluna** `user_name` à tabela existente
2. **Atualizar mensagens existentes** com valor padrão "Usuário"
3. **Verificar se a migração** já foi executada

### Execução da Migração
```bash
node migrate-user-signature.js
```

**Saída esperada:**
```
Conectado ao banco SQLite para migração de assinatura
Adicionando campo user_name à tabela messages...
Campo user_name adicionado com sucesso!
Mensagens existentes atualizadas com valor padrão
Migração de assinatura de usuário concluída com sucesso!
```

## Arquivos Modificados

### Backend
- `app.js` - Adicionada captura do nome do usuário logado
- `database.js` - Adicionado campo `userName` na estrutura
- `migrate-user-signature.js` - Script de migração (novo)

### Frontend
- `public/script.js` - Adicionada renderização da assinatura

## Fluxo Completo

### 1. Usuário Faz Login
```
Usuário: "vitor"
Senha: "123456"
→ Sessão criada: req.session.user = { username: "vitor", ... }
```

### 2. Usuário Envia Mensagem
```
POST /api/send
Body: { to: "5511999999999", message: "Olá!" }
→ Sistema captura: req.session.user.username = "vitor"
```

### 3. Mensagem Salva no Banco
```javascript
{
  from: "5511888888888",
  to: "5511999999999", 
  body: "Olá!",
  userName: "vitor",  // ← Nome do usuário logado
  fromMe: true,
  // ... outros campos
}
```

### 4. Frontend Renderiza
```html
<div class="bubble enviada">
  <div style="font-weight: bold; color: #25d366; margin-bottom: 5px;">*vitor*:</div>
  Olá!
</div>
```

### 5. WhatsApp Recebe
```
*vitor*:
Olá!
```

## Teste da Funcionalidade

### Cenário 1: Mensagem de Texto
1. **Faça login** com qualquer usuário
2. **Envie uma mensagem** para qualquer contato
3. **Verifique se aparece:** `*Nome do Usuário*:` acima da mensagem

### Cenário 2: Mensagem de Mídia
1. **Faça login** com qualquer usuário
2. **Envie uma imagem/vídeo** para qualquer contato
3. **Verifique se aparece:** `*Nome do Usuário*:` acima da mídia

### Cenário 3: Usuário Não Autenticado
1. **Tente enviar mensagem** sem estar logado
2. **Resultado esperado:** Erro 401 - "Usuário não autenticado"

## Benefícios

### 1. Identificação Clara
- **Facilita identificação** de quem enviou cada mensagem
- **Especialmente útil** em ambientes com múltiplos usuários
- **Padrão visual** consistente com WhatsApp

### 2. Segurança
- **Autenticação obrigatória** para envio
- **Rastreabilidade** de mensagens por usuário
- **Prevenção** de envios anônimos

### 3. Experiência do Usuário
- **Interface intuitiva** e familiar
- **Feedback visual** imediato
- **Consistência** com padrões do WhatsApp

## Configurações

### Cores da Assinatura
```css
/* Cor padrão do WhatsApp */
color: #25d366;

/* Estilo em negrito */
font-weight: bold;

/* Espaçamento */
margin-bottom: 5px;
```

### Formato da Assinatura
```javascript
// Formato: *Nome do Usuário*:
`*${msg.userName}*:`
```

## Próximas Melhorias

### Possíveis Expansões
1. **Personalização de cores** por usuário
2. **Assinaturas customizadas** (texto livre)
3. **Configuração de exibição** (ligar/desligar)
4. **Histórico de assinaturas** por usuário
5. **Assinaturas em grupos** com identificação específica

## Troubleshooting

### Problemas Comuns

1. **Assinatura não aparece**
   - Verifique se o usuário está logado
   - Confirme se a mensagem é `fromMe: true`
   - Verifique se o campo `userName` está preenchido

2. **Erro 401 ao enviar**
   - Faça login novamente
   - Verifique se a sessão não expirou

3. **Migração falhou**
   - Execute `node migrate-user-signature.js` novamente
   - Verifique permissões do banco de dados

## Status da Implementação

- ✅ **Backend implementado**
- ✅ **Frontend implementado**
- ✅ **Banco de dados atualizado**
- ✅ **Migração executada**
- ✅ **Testes realizados**
- ✅ **Documentação criada**

A funcionalidade está **100% funcional** e pronta para uso! 
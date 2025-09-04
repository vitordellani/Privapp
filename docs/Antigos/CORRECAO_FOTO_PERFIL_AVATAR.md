# Correção do Sistema de Foto de Perfil nos Avatares

## Problemas Identificados

1. **Elemento verde sobre a foto**: O fundo verde do avatar estava aparecendo por cima da foto de perfil
2. **Foto única para todos**: A mesma foto estava aparecendo em todos os avatares, quando cada usuário deveria ter sua própria foto

## Soluções Implementadas

### 1. Correção do CSS para Remover Fundo Verde

**Arquivo**: `public/styles.css`

#### Mudanças no CSS:
- Adicionado `position: absolute`, `top: 0`, `left: 0`, `z-index: 1` para a imagem
- Adicionado seletor `:has(img)` para remover o fundo quando há imagem
- Aplicado para modo normal, modo escuro e responsivo

```css
/* Estilo para imagem no avatar das mensagens */
.user-avatar-diagonal img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  position: absolute;
  top: 0;
  left: 0;
  z-index: 1;
}

/* Remover fundo quando há imagem */
.user-avatar-diagonal:has(img) {
  background: none;
}
```

### 2. Nova API para Buscar Foto por Username

**Arquivo**: `app.js`

#### Nova API:
```javascript
// API para obter foto de perfil do usuário por username
app.get('/api/profile-photo/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const user = await db.getUserByUsername(username);
    
    if (user && user.profile_photo) {
      res.json({ photoPath: user.profile_photo });
    } else {
      res.json({ photoPath: null });
    }
  } catch (error) {
    console.error('Erro ao buscar foto de perfil por username:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

### 3. Correção do JavaScript para Fotos Individuais

**Arquivo**: `public/script.js`

#### Mudanças na função `atualizarAvataresMensagens()`:
- Agora busca a foto específica para cada usuário usando o `data-user-id`
- Usa a nova API `/api/profile-photo/username/:username`
- Processa cada avatar individualmente

#### Mudanças na função `atualizarAvatarMensagemComFoto()`:
- Adicionado controle do fundo verde via JavaScript
- Remove o fundo quando há foto
- Restaura o fundo quando não há foto

```javascript
// Remover fundo verde quando há foto
avatarElement.style.background = 'none';

// Restaurar fundo verde quando não há foto
avatarElement.style.background = 'linear-gradient(135deg, #25d366, #128c7e)';
```

## Resultado

- ✅ A foto de perfil agora aparece corretamente dentro da circunferência do avatar
- ✅ O fundo verde não aparece mais por cima da foto
- ✅ Cada usuário tem sua própria foto de perfil nos avatares
- ✅ O sistema funciona em modo normal, escuro e responsivo

## Como Funciona

1. Cada mensagem enviada tem um `data-user-id` com o username do remetente
2. A função `atualizarAvataresMensagens()` busca cada avatar e identifica o usuário
3. Para cada usuário, faz uma requisição para `/api/profile-photo/username/:username`
4. Se encontrar uma foto, aplica ela ao avatar e remove o fundo verde
5. Se não encontrar foto, mantém o fundo verde com a inicial do usuário 
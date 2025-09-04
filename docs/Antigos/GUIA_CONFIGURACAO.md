# Guia de Configuração - Privapp

## 🔧 Configuração Detalhada

### 1. Configuração do Ambiente

#### **Requisitos do Sistema**
```bash
# Verificar versão do Node.js
node --version  # Deve ser 20+

# Verificar versão do NPM
npm --version   # Deve ser 8+

# Verificar espaço em disco
df -h           # Mínimo 1GB livre
```

#### **Dependências do Sistema (Linux)**
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils

# CentOS/RHEL
sudo yum install -y \
    wget \
    ca-certificates \
    liberation-fonts \
    libappindicator \
    alsa-lib \
    atk \
    cups-libs \
    dbus-libs \
    mesa-libgbm \
    gtk3 \
    nss \
    libX11 \
    libXcomposite \
    libXdamage \
    libXrandr \
    xdg-utils
```

### 2. Configuração do Keycloak

#### **Instalação e Configuração Inicial**

1. **Iniciar o Keycloak**
```bash
cd keycloak-26.2.1/bin
./kc.sh start-dev
```

2. **Acessar o Console de Administração**
```
http://localhost:8080
```

3. **Criar Realm**
   - Clique em "Create Realm"
   - Nome: `meu-bot`
   - Clique em "Create"

4. **Criar Cliente**
   - Vá em "Clients" → "Create"
   - Client ID: `meu-bot-backend`
   - Client Protocol: `openid-connect`
   - Root URL: `http://localhost:3000`

5. **Configurar Cliente**
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3000/*`
   - Web Origins: `http://localhost:3000`
   - Salve as configurações

6. **Obter Secret**
   - Vá na aba "Credentials"
   - Copie o "Secret"
   - Atualize o arquivo `keycloak.json`

#### **Configuração de Usuários**

1. **Criar Usuário**
   - Vá em "Users" → "Add user"
   - Username: `admin`
   - Email: `admin@privapp.com`
   - Salve

2. **Definir Senha**
   - Vá na aba "Credentials"
   - Password: `admin123`
   - Temporary: `OFF`
   - Salve

3. **Atribuir Roles**
   - Vá na aba "Role Mappings"
   - Adicione roles conforme necessário

### 3. Configuração da Aplicação

#### **Variáveis de Ambiente**

Crie um arquivo `.env` na raiz do projeto:

```env
# Configurações do Servidor
PORT=3000
NODE_ENV=development

# Configurações do WhatsApp
WHATSAPP_SESSION_PATH=./.wwebjs_auth
WHATSAPP_PUPPETEER_ARGS=--no-sandbox,--disable-setuid-sandbox

# Configurações do Keycloak
KEYCLOAK_REALM=meu-bot
KEYCLOAK_AUTH_SERVER_URL=http://localhost:8080
KEYCLOAK_CLIENT_ID=meu-bot-backend
KEYCLOAK_CLIENT_SECRET=PQA9lKhUKKIHaqlv7zZKUn44TIttVOJo

# Configurações de Armazenamento
MEDIA_DIR=./media
MESSAGES_FILE=./messages.json
GROUP_PHOTOS_FILE=./groupPhotos.json

# Configurações de Segurança
SESSION_SECRET=sua-chave-secreta-muito-segura
```

#### **Configuração de Logs**

Crie um arquivo `logger.js`:

```javascript
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'privapp' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(__dirname, 'logs', 'combined.log') 
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

### 4. Configuração de Backup

#### **Script de Backup Automático**

Crie um arquivo `backup.sh`:

```bash
#!/bin/bash

# Configurações
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="privapp_backup_$DATE"

# Criar diretório de backup
mkdir -p "$BACKUP_DIR"

# Backup dos dados
tar -czf "$BACKUP_DIR/$BACKUP_NAME.tar.gz" \
    messages.json \
    groupPhotos.json \
    media/ \
    .wwebjs_auth/

# Manter apenas os últimos 10 backups
ls -t "$BACKUP_DIR"/privapp_backup_*.tar.gz | tail -n +11 | xargs -r rm

echo "Backup criado: $BACKUP_NAME.tar.gz"
```

#### **Configuração de Cron (Linux)**

```bash
# Editar crontab
crontab -e

# Adicionar linha para backup diário às 2h
0 2 * * * /caminho/para/privapp/backup.sh
```

### 5. Configuração de Proxy (Opcional)

#### **Configuração para Redes Corporativas**

```javascript
// Adicione no app.js
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--proxy-server=http://proxy.empresa.com:8080'
    ]
  }
});
```

### 6. Configuração de SSL (Produção)

#### **Certificado Auto-assinado**

```bash
# Gerar certificado
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes

# Configurar no app.js
const https = require('https');
const fs = require('fs');

const options = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
};

const server = https.createServer(options, app);
```

### 7. Configuração de Monitoramento

#### **Health Check Endpoint**

Adicione no `app.js`:

```javascript
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    whatsapp: {
      connected: client.isConnected || false,
      authenticated: client.authStrategy.isAuthenticated || false
    }
  };
  
  res.json(health);
});
```

#### **Configuração do PM2**

Crie um arquivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [{
    name: 'privapp',
    script: 'app.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 8. Configuração de Firewall

#### **Regras de Firewall (Linux)**

```bash
# Permitir porta 3000
sudo ufw allow 3000

# Permitir porta 8080 (Keycloak)
sudo ufw allow 8080

# Verificar status
sudo ufw status
```

### 9. Configuração de Performance

#### **Otimizações do Node.js**

```bash
# Configurar variáveis de ambiente
export NODE_OPTIONS="--max-old-space-size=2048"
export UV_THREADPOOL_SIZE=64
```

#### **Otimizações do Puppeteer**

```javascript
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  }
});
```

### 10. Configuração de Segurança

#### **Headers de Segurança**

Adicione no `app.js`:

```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "https://cdn.socket.io", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"]
    }
  }
}));
```

#### **Rate Limiting**

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // limite por IP
});

app.use('/api/', limiter);
```

### 11. Troubleshooting

#### **Problemas Comuns e Soluções**

1. **WhatsApp não conecta**
   ```bash
   # Limpar cache de autenticação
   rm -rf .wwebjs_auth/
   
   # Reiniciar aplicação
   npm start
   ```

2. **Erro de memória**
   ```bash
   # Aumentar heap size
   node --max-old-space-size=4096 app.js
   ```

3. **Problemas de permissão**
   ```bash
   # Corrigir permissões
   chmod -R 755 .
   chown -R $USER:$USER .
   ```

4. **Porta em uso**
   ```bash
   # Verificar processo
   lsof -i :3000
   
   # Matar processo
   kill -9 <PID>
   ```

### 12. Manutenção

#### **Limpeza Automática**

Crie um script `cleanup.js`:

```javascript
const fs = require('fs');
const path = require('path');

// Limpar arquivos temporários
const cleanup = () => {
  const tempDir = path.join(__dirname, 'temp');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  
  // Limpar logs antigos
  const logsDir = path.join(__dirname, 'logs');
  if (fs.existsSync(logsDir)) {
    const files = fs.readdirSync(logsDir);
    const now = Date.now();
    const maxAge = 30 * 24 * 60 * 60 * 1000; // 30 dias
    
    files.forEach(file => {
      const filePath = path.join(logsDir, file);
      const stats = fs.statSync(filePath);
      if (now - stats.mtime.getTime() > maxAge) {
        fs.unlinkSync(filePath);
      }
    });
  }
};

cleanup();
```

Execute diariamente via cron:
```bash
0 3 * * * node /caminho/para/privapp/cleanup.js
```

---

Este guia cobre as principais configurações necessárias para um ambiente de produção estável e seguro. 
# Privapp - WhatsApp Web Clone com Mensagens Temporárias

## 📋 Visão Geral

O **Privapp** é uma aplicação web que funciona como um clone do WhatsApp Web, permitindo o uso do WhatsApp através de uma interface web personalizada com recursos avançados de privacidade e controle de mensagens temporárias. A aplicação mantém todos os dados localmente e oferece funcionalidades extras como notificações personalizadas, modo escuro e gerenciamento de reações.

## 🎯 Objetivos Principais

1. **Uso do WhatsApp via Web**: Acesso ao WhatsApp através de uma interface web personalizada
2. **Mensagens Temporárias**: Sistema que permite usar o WhatsApp sem perder dados importantes
3. **Privacidade**: Todos os dados são armazenados localmente
4. **Controle Total**: Gerenciamento completo de conversas, notificações e mídia
5. **Interface Moderna**: Design responsivo com modo escuro e recursos avançados

## 🏗️ Arquitetura da Aplicação

### Backend (Node.js + Express)
- **Servidor**: Express.js com Socket.IO para comunicação em tempo real
- **WhatsApp**: Integração via whatsapp-web.js e Puppeteer
- **Autenticação**: Keycloak para controle de acesso
- **Armazenamento**: Sistema de arquivos local (JSON + mídia)

### Frontend (HTML + CSS + JavaScript)
- **Interface**: Bootstrap 5 para design responsivo
- **Tempo Real**: Socket.IO para atualizações instantâneas
- **Mídia**: Suporte completo para imagens, vídeos, áudios e PDFs
- **Notificações**: Sistema personalizado de alertas

## 🚀 Funcionalidades

### ✅ Implementadas

#### **Gestão de Conversas**
- Lista de conversas com fotos de perfil
- Busca de contatos e mensagens
- Suporte a grupos e conversas individuais
- Indicadores de mensagens não lidas

#### **Sistema de Mensagens**
- Envio e recebimento de mensagens de texto
- Suporte completo a mídia (imagens, vídeos, áudios, documentos)
- Reações às mensagens (emojis)
- Histórico completo de conversas
- Busca dentro das conversas

#### **Interface Avançada**
- Modo escuro/claro
- Design responsivo
- Visualização de mídia em modais
- Upload manual de arquivos
- Preview de arquivos antes do envio

#### **Notificações Personalizadas**
- Sons de notificação customizados por contato
- Notificações contínuas
- Controle granular de alertas

#### **Segurança e Privacidade**
- Autenticação via Keycloak
- Armazenamento local de dados
- Controle de acesso por sessão

### 🔄 Funcionalidades em Tempo Real
- Atualização automática de mensagens
- Sincronização de reações
- Upload de fotos de grupos
- Notificações instantâneas

## 📦 Estrutura do Projeto

```
meu-bot-whatsapp/
├── app.js                 # Servidor principal
├── package.json           # Dependências
├── keycloak.json          # Configuração de autenticação
├── Dockerfile            # Containerização
├── public/               # Frontend
│   ├── index.html        # Interface principal
│   ├── script.js         # Lógica do frontend
│   ├── styles.css        # Estilos
│   └── img/              # Imagens de fundo
├── media/                # Mídia recebida/enviada
├── messages.json         # Banco de dados de mensagens
├── groupPhotos.json      # Fotos dos grupos
└── keycloak-26.2.1/      # Servidor Keycloak
```

## 🛠️ Instalação e Configuração

### Pré-requisitos
- Node.js 20+
- NPM ou Yarn
- Docker (opcional)
- Navegador moderno

### Instalação Local

1. **Clone o repositório**
```bash
git clone <url-do-repositorio>
cd meu-bot-whatsapp
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure o Keycloak** (opcional)
```bash
# Inicie o Keycloak
cd keycloak-26.2.1/bin
./kc.sh start-dev
```

4. **Inicie a aplicação**
```bash
npm start
```

5. **Acesse a aplicação**
```
http://localhost:3000
```

### Instalação com Docker

```bash
# Construa a imagem
docker build -t privapp .

# Execute o container
docker run -p 3000:3000 privapp
```

## 📱 Como Usar

### Primeiro Acesso

1. **Acesse a aplicação** no navegador
2. **Escaneie o QR Code** que aparece no terminal
3. **Aguarde a conexão** com o WhatsApp
4. **Comece a usar** a interface web

### Funcionalidades Principais

#### **Enviar Mensagens**
1. Selecione um contato na lista
2. Digite sua mensagem no campo de texto
3. Clique em "Enviar" ou pressione Enter

#### **Enviar Mídia**
1. Clique no ícone de clipe (📎)
2. Selecione o arquivo desejado
3. Confirme o envio

#### **Gerenciar Contatos**
1. Clique no botão "Adicionar Contato"
2. Preencha número e nome
3. Configure notificações personalizadas

#### **Usar Reações**
1. Clique nos três pontos ao lado de uma mensagem
2. Selecione um emoji para reagir
3. A reação será sincronizada com o WhatsApp

#### **Buscar Mensagens**
1. Use o campo de busca na lista de contatos
2. Use o campo de busca dentro da conversa
3. Filtre por texto ou mídia

### Modo Escuro
- Clique no botão 🌙 no canto superior direito
- A interface alterna entre modo claro e escuro

## 🔧 Configurações Avançadas

### Personalização de Notificações

1. **Som Personalizado**
   - Edite um contato
   - Clique em "Escolher arquivo"
   - Selecione um arquivo de áudio
   - Teste com o botão 🔊

2. **Notificações Contínuas**
   - Ative a opção "Notificações contínuas"
   - O som tocará até você visualizar a mensagem

### Gerenciamento de Dados

- **Limpar Mensagens**: Use o botão "Limpar" para remover todo o histórico
- **Backup**: Os dados são salvos em `messages.json` e pasta `media/`
- **Restauração**: Copie os arquivos de backup para restaurar

## 🔒 Segurança

### Autenticação
- Sistema de login via Keycloak
- Controle de sessão
- Proteção de rotas

### Privacidade
- Dados armazenados localmente
- Sem envio para servidores externos
- Controle total sobre suas informações

## 🚨 Limitações Atuais

1. **Dependência do WhatsApp Web**: Requer conexão estável
2. **Armazenamento Local**: Dados não sincronizam entre dispositivos
3. **Reações Limitadas**: Algumas reações podem não sincronizar perfeitamente
4. **Mídia**: Arquivos muito grandes podem causar lentidão

## 💡 Sugestões de Melhorias

### Funcionalidades Sugeridas

#### **Privacidade e Segurança**
- [ ] Criptografia de dados locais
- [ ] Backup automático para nuvem
- [ ] Sincronização entre dispositivos
- [ ] Modo incógnito (sem histórico)

#### **Interface e UX**
- [ ] Temas personalizáveis
- [ ] Atalhos de teclado
- [ ] Modo compacto para telas pequenas
- [ ] Suporte a múltiplas contas

#### **Funcionalidades Avançadas**
- [ ] Agendamento de mensagens
- [ ] Respostas automáticas
- [ ] Filtros de spam
- [ ] Estatísticas de uso
- [ ] Exportação de conversas

#### **Integrações**
- [ ] API REST para integração externa
- [ ] Webhooks para notificações
- [ ] Integração com calendário
- [ ] Backup para Google Drive/Dropbox

#### **Performance**
- [ ] Paginação de mensagens
- [ ] Compressão de mídia
- [ ] Cache inteligente
- [ ] Otimização de memória

### Melhorias Técnicas

#### **Backend**
- [ ] Migração para banco de dados (SQLite/PostgreSQL)
- [ ] Sistema de logs estruturado
- [ ] Testes automatizados
- [ ] Documentação da API

#### **Frontend**
- [ ] Framework moderno (React/Vue.js)
- [ ] PWA (Progressive Web App)
- [ ] Notificações push
- [ ] Offline mode

#### **DevOps**
- [ ] CI/CD pipeline
- [ ] Monitoramento e alertas
- [ ] Backup automático
- [ ] Deploy automatizado

## 🐛 Solução de Problemas

### Problemas Comuns

#### **QR Code não aparece**
- Verifique se o terminal tem permissão de exibição
- Reinicie a aplicação
- Verifique a conexão com a internet

#### **Mensagens não carregam**
- Verifique se o WhatsApp está conectado
- Recarregue a página
- Verifique os logs no terminal

#### **Mídia não carrega**
- Verifique o espaço em disco
- Verifique permissões da pasta `media/`
- Tente fazer upload manual

#### **Reações não sincronizam**
- Aguarde alguns segundos
- Recarregue a conversa
- Verifique se a mensagem existe no WhatsApp

### Logs e Debug

```bash
# Ver logs em tempo real
tail -f logs/app.log

# Verificar status do WhatsApp
curl http://localhost:3000/api/status

# Limpar cache
rm -rf .wwebjs_auth/
```

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Verifique os logs no terminal
- Consulte a documentação do whatsapp-web.js
- Abra uma issue no repositório

## 📄 Licença

Este projeto é de uso pessoal e educacional. Respeite os termos de uso do WhatsApp.

---

**Desenvolvido com ❤️ para privacidade e controle total das suas conversas** 
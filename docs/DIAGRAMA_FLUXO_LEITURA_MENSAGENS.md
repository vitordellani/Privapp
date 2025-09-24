# Diagrama de Fluxo: Sistema de Gerenciamento de Status de Leitura de Mensagens

## 1. Diagrama de Componentes e Interações

```
+-------------------+      +----------------------+      +----------------------+
|                   |      |                      |      |                      |
|     AppState      |<---->|  MessageViewTracker  |<---->|  NotificationManager |
|                   |      |                      |      |                      |
+-------------------+      +----------------------+      +----------------------+
        ^                           ^                           ^
        |                           |                           |
        v                           v                           v
+-----------------------------------------------------------------------+
|                                                                       |
|                             script.js                                 |
|                                                                       |
+-----------------------------------------------------------------------+
        ^                           ^                           ^
        |                           |                           |
        v                           v                           v
+-------------------+      +----------------------+      +----------------------+
|                   |      |                      |      |                      |
|  LocalStorage     |      |  BroadcastChannel    |      |  CustomEvents        |
|                   |      |                      |      |                      |
+-------------------+      +----------------------+      +----------------------+
```

## 2. Fluxo de Marcação de Mensagens como Lidas

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
|  Seleção de Chat |     |  Scroll até o   |     |  Visualização    |
|                  |     |  fim da conversa |     |  no Mobile      |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                       |                        |
         v                       v                        v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| appState.mark    |     | marcarMensagens  |     | messageView     |
| ChatAsRead()     |     | ComoLidas()      |     | Tracker.mark    |
|                  |     |                  |     | ChatAsViewed()  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                       |                        |
         v                       v                        v
+------------------------------------------------------------------+
|                                                                  |
|                  Atualização do Estado                           |
|                                                                  |
+--------+-------------------------+------------------------------+
         |                         |                              |
         v                         v                              v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| Atualização      |     | Persistência     |     | Broadcast para   |
| Visual (badges)  |     | (localStorage)   |     | outras abas      |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

## 3. Fluxo de Notificações

```
+------------------+
|                  |
|  Nova Mensagem   |
|  Recebida        |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |     +------------------+
| notificationMgr. |---->|  Chat atual?     |-----> Não notifica
| shouldNotify()   |     |                  |
|                  |     +------------------+
+--------+---------+
         | (deve notificar)
         v
+------------------+
|                  |
| playNotification |     +------------------+
| Sound()          |---->| Configurações    |
|                  |     | específicas      |
+--------+---------+     +------------------+
         |
         v
+------------------+     +------------------+
|                  |     |                  |
| Atualizar        |     | Iniciar notifi-  |
| contador badges  |     | cações contínuas |
|                  |     | (se configurado) |
+------------------+     +------------------+
```

## 4. Fluxo de Sincronização entre Abas

```
+------------------+
|                  |
| Mudança de estado|
| em uma aba       |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |
| appState.        |
| broadcast()      |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |
| BroadcastChannel |
| ('app-state')    |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |
| handleBroadcast()|
| em outras abas   |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |
| Atualização do   |
| estado local     |
|                  |
+------------------+
```

## 5. Fluxo de Detecção de Visualização no Mobile

```
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| Navegação para   |     | Mudança de       |     | Retorno de       |
| chat no mobile   |     | visibilidade     |     | foco da janela   |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                       |                        |
         v                       v                        v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| onMobileChatOpen |     | onPageVisible   |     | onWindowFocus    |
|                  |     |                  |     |                  |
+--------+---------+     +--------+---------+     +--------+---------+
         |                       |                        |
         v                       v                        v
+------------------------------------------------------------------+
|                                                                  |
|                  markChatAsViewed()                              |
|                                                                  |
+--------+-------------------------+------------------------------+
         |                         |                              |
         v                         v                              v
+------------------+     +------------------+     +------------------+
|                  |     |                  |     |                  |
| Emitir evento    |     | Parar            |     | Mostrar feedback |
| markMessagesAsRead|     | notificações     |     | visual (mobile) |
|                  |     |                  |     |                  |
+------------------+     +------------------+     +------------------+
```

## 6. Integração dos Componentes no Ciclo de Vida da Aplicação

```
+------------------+
|                  |
| Inicialização    |
| da aplicação     |
|                  |
+--------+---------+
         |
         v
+------------------+
|                  |
| initialize       |
| ImprovementSys   |
|                  |
+--------+---------+
         |
         v
+-------+--------+--------+--------+--------+-------+
|                |                 |                 |
|                |                 |                 |
 v                v                 v                 v
+------------+  +------------+  +------------+  +------------+
|            |  |            |  |            |  |            |
| AppState   |  | MessageView|  | Notification|  | Outros     |
| new()      |  | Tracker    |  | Manager     |  | sistemas   |
|            |  | new()      |  | new()       |  |            |
+-----+------+  +-----+------+  +-----+------+  +------------+
      |               |               |
      v               v               v
+------------------------------------------+
|                                          |
| Carregamento de mensagens e              |
| restauração do estado                    |
|                                          |
+------------------------------------------+
```

## 7. Legenda

- **AppState**: Gerenciador central de estado da aplicação
- **MessageViewTracker**: Sistema de rastreamento de visualização de mensagens
- **NotificationManager**: Sistema de gerenciamento de notificações
- **LocalStorage**: Armazenamento persistente no navegador
- **BroadcastChannel**: Canal de comunicação entre abas do navegador
- **CustomEvents**: Eventos personalizados para comunicação entre componentes
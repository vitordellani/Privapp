# Diagnostico do mecanismo de badges

## Visao geral
- A badge de nao lidas e montada em `public/js/script.js:1790` pela funcao `renderContatos`, que injeta `<div class="unread-badge">` ao lado do nome na lista.
- A contagem vem de `contarMensagensNaoLidas` (`public/js/script.js:1502`), que prioriza `AppState.getUnreadCount` (`public/js/AppState.js:176`) e faz fallback para o objeto legaco `naoLidas`.
- O estado de leitura depende de `AppState.markChatAsRead` (`public/js/AppState.js:153`), alimentado por `MessageViewTracker.markChatAsViewed` (`public/js/MessageViewTracker.js:166`) e pelos eventos esperados pelo `UnifiedBadgeManager` (`public/js/UnifiedBadgeManager.js:89-205`).
- No backend, `/api/messages` (`app.js:779`) devolve todas as mensagens sem qualquer campo de leitura; `DatabaseOptimizer.getContactsWithUnreadCount` (`database-optimizer.js:184-224`) apenas conta mensagens recebidas, ignorando se ja foram vistas.

## Como o fluxo atual se comporta
### Frontend
- `initializeImprovementSystems` (`public/js/script.js:445`) instancia `AppState`, `MessageViewTracker`, `NotificationManager` e `BadgeManager`, e mais tarde chama `initializeUnifiedBadgeSystem`.
- O clique na conversa chama `selecionarContato` via listeners criados em `renderContatos` (`public/js/script.js:1864-1938`).
- Eventos de novas mensagens chegam por `socket.on('nova-mensagem')` (`public/js/script.js:3191`), que atualiza `todasMensagens`, sincroniza `AppState` e chama `renderContatos` novamente.
- Existe um poll de `/api/messages` a cada segundo (`public/js/script.js:1676`), que recalcula todas as badges usando `contarMensagensNaoLidas`.

### Backend
- A tabela `messages` nao possui coluna de leitura; o servidor nunca recebe sinal de que um chat foi visto.
- O otimizador agrupa mensagens por contato e simplesmente conta quantas foram recebidas (`database-optimizer.js:204`), portanto qualquer relatorio ou cache futuro repetiria o bug de badge eterna.

## Problemas observados
- **Funcao sobrescrita:** existem duas definicoes de `selecionarContato` (`public/js/script.js:3017` e `public/js/script.js:3943`). A versao rica que marca `AppState`, `BadgeManager` e `MessageViewTracker` e declarada primeiro, mas e substituida pela versao legada mais abaixo. O clique real executa apenas a versao antiga, que so zera `naoLidas[contato]`.
- **Estado nao sincronizado:** como `AppState.markChatAsRead` nao e chamado no clique, `getUnreadCount` continua retornando o total anterior e o poll de `/api/messages` reinsere o badge logo apos a selecao.
- **Unificado inativo:** `UnifiedBadgeManager` espera eventos DOM como `contato-selecionado`, `mark-as-read` e `scroll-to-bottom` (`public/js/UnifiedBadgeManager.js:89-114`), mas `script.js` jamais os dispara. Assim, toda a logica de consolidacao fica ociosa.
- **Lookup fragil:** `BadgeManager.getChatElement` (`public/js/BadgeManager.js:27`) procura por `[data-chat-id]`, mas `renderContatos` nao define esse atributo. O manager precisa recorrer a comparacoes de texto, o que falha com nomes semelhantes e deixa o cache instavel.
- **Persistencia ausente:** sem uma coluna `is_read`, qualquer recarga da pagina restaura as badges originais, independente do que foi visto anteriormente.
- **Animacoes ruidosas:** a sequencia `bounce-in`, `reading`, `slide-out`, `glow` definida em `public/styles.css:390-506` gera piscadas e deixa a remocao do badge visivelmente atrasada, sobretudo quando a badge e removida por JavaScript antes do fim da animacao.

## Recomendacoes de funcionamento
1. **Unificar `selecionarContato`:** mantenha a versao completa (`public/js/script.js:3017`) e elimine a definicao legada (`public/js/script.js:3943`). Dentro dela, acione `markChatAsReadImmediate(contato)` e dispare `document.dispatchEvent(new CustomEvent('contato-selecionado', { detail: { chatId: contato } }))` para integrar o `UnifiedBadgeManager`.
2. **Desligar o legaco `atualizarBadgeContato`:** troque as chamadas diretas por `window.badgeManager.updateBadge` (`public/js/BadgeManager.js:71`) e remova a funcao manual (`public/js/script.js:1418`) apos migracao.
3. **Adicionar `data-chat-id`:** ao criar cada item em `renderContatos`, defina `chatItem.dataset.chatId = contato` para que o `BadgeManager` funcione com cache e queries O(1).
4. **Emitir eventos unificados:** em `socket.on('nova-mensagem')` (`public/js/script.js:3191`), propague `document.dispatchEvent(new CustomEvent('nova-mensagem', { detail: { chatId: contato, message: msg } }))`. No fim do scroll (listener na `.messages-container`), dispare `scroll-to-bottom`.
5. **Persistir leitura:** estenda a tabela `messages` com `is_read` e `read_at`, exponha um endpoint `/api/chats/:id/read` que marque mensagens como lidas e devolva `is_read` em `/api/messages`. Atualize `AppState.markChatAsRead` para `fetch` nesse endpoint e sincronize o retorno.
6. **Reduzir o poll:** com a persistencia implementada, substitua o `setInterval` por eventos `socket.io` focados (new-message, chat-read) para evitar corridas que reativam badges.
7. **Sincronizar multiplas abas:** use o `BroadcastChannel` ja presente (`public/js/AppState.js:24`) para encaminhar `chat-marked-as-read`, garantindo remocao instantanea em todas as janelas abertas.

## Recomendacoes esteticas
1. **Replica WhatsApp Web:** ajuste a classe `.unread-badge` (`public/styles.css:390`) para um pill verde (#25d366), altura ~18px, padding 4px x 6px, fonte 12px/600, texto branco, `min-width: 18px`, `text-align: center`.
2. **Transicao enxuta:** substitua as animacoes encadeadas por `transition: opacity 120ms ease, transform 120ms ease` com `transform: scale(0.8 -> 1)` na entrada e `scale(1 -> 0.8)` na saida. Isso imita a aparicao discreta do WhatsApp Web.
3. **Tratamento >99:** adote logica `Math.min(count, 99)` no `BadgeManager.updateBadge` para exibir `99+`, mantendo o componente compacto.
4. **Estados especiais:** quando `NotificationManager.isChatMuted(chatId)` for `true`, troque a cor da badge para cinza (#b3b3b3) e reduza o contraste, alinhando-se ao indicador de conversas silenciadas do WhatsApp.
5. **Mobile responsivo:** apos transicionar `opacity` para 0, altere `display` para `none` para evitar que a badge ocupe espaco residual ao abrir a conversa em telas pequenas.

## Roadmap sugerido
1. Refatorar `selecionarContato`, adicionar `data-chat-id` e conectar os eventos do `UnifiedBadgeManager`.
2. Integrar `BadgeManager` como fonte unica de UI e remover funcoes legadas (`atualizarBadgeContato`, `showReadConfirmation`).
3. Implementar persistencia de leitura e endpoints de confirmacao no backend.
4. Ajustar o design das badges para o visual do WhatsApp Web e revisar animacoes.
5. Encerrar o poll de 1s e confiar em eventos socket + BroadcastChannel para manter badges sincronizadas.

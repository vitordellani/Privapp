# 📋 Especificação Técnica: Sistema de Download Temporário de Mídia

## 🎯 Objetivo e Escopo

### **Objetivo Principal**
Implementar um sistema de downloads temporários para arquivos de mídia (áudios, vídeos e imagens) que substitua o streaming atual por downloads completos na memória do navegador, garantindo reprodução instantânea e melhor experiência do usuário.

### **Escopo do Projeto**
- **Incluído:** Áudios (.mp3, .wav, .ogg, .m4a), Vídeos (.mp4, .webm, .avi), Imagens (.jpg, .png, .gif, .webp)
- **Excluído:** Documentos (.pdf, .doc), Arquivos compactados (.zip, .rar)
- **Compatibilidade:** Navegadores modernos (Chrome 60+, Firefox 55+, Safari 12+, Edge 79+)
- **Fallback:** Sistema atual de streaming para casos de falha

---

## 📊 Requisitos Funcionais

### **RF001 - Download Automático de Mídia**
**Descrição:** O sistema deve iniciar automaticamente o download de arquivos de mídia quando o usuário acessar uma mensagem que contenha mídia.

**Critérios de Aceitação:**
- [ ] Download inicia automaticamente ao visualizar mensagem com mídia
- [ ] Suporte para múltiplos formatos: MP3, WAV, OGG, M4A, MP4, WEBM, JPG, PNG, GIF, WEBP
- [ ] Download ocorre em background sem bloquear interface
- [ ] Máximo de 3 downloads simultâneos por usuário
- [ ] Timeout de 30 segundos para downloads

**Regras de Negócio:**
- Arquivos maiores que 50MB devem usar fallback para streaming
- Downloads são cancelados se usuário sair da conversa
- Prioridade: Imagens > Áudios > Vídeos

---

### **RF002 - Cache Temporário Inteligente**
**Descrição:** O sistema deve manter um cache temporário na memória do navegador para reutilização de arquivos já baixados.

**Critérios de Aceitação:**
- [ ] Cache máximo de 100MB por sessão
- [ ] Arquivos são removidos automaticamente ao recarregar página
- [ ] Limpeza automática quando cache atinge 80% da capacidade
- [ ] Algoritmo LRU (Least Recently Used) para remoção
- [ ] Cache hit rate mínimo de 60%

**Regras de Negócio:**
- Arquivos acessados recentemente têm prioridade de permanência
- Cache é limpo completamente ao fazer logout
- Arquivos corrompidos são removidos imediatamente

---

### **RF003 - Feedback Visual de Progresso**
**Descrição:** O sistema deve exibir progresso visual durante o download com informações claras sobre o status.

**Critérios de Aceitação:**
- [ ] Círculo de progresso com percentual numérico
- [ ] Indicador de tipo de mídia (ícone)
- [ ] Status textual: "Preparando", "Baixando", "Verificando", "Pronto"
- [ ] Estimativa de tempo restante (ETA)
- [ ] Velocidade de download em KB/s ou MB/s
- [ ] Animação suave de transição entre estados

**Regras de Negócio:**
- Progresso deve ser atualizado a cada 200ms
- ETA só é exibido após 2 segundos de download
- Animações devem ser desabilitadas em dispositivos com pouca performance

---

### **RF004 - Verificação de Integridade**
**Descrição:** O sistema deve verificar a integridade dos arquivos baixados usando hash SHA-256.

**Critérios de Aceitação:**
- [ ] Geração de hash SHA-256 no servidor para cada arquivo
- [ ] Verificação automática após download completo
- [ ] Fallback para streaming se integridade falhar
- [ ] Log de erros de integridade para monitoramento
- [ ] Retry automático uma vez em caso de falha

**Regras de Negócio:**
- Arquivos com integridade comprometida não são armazenados em cache
- Falhas de integridade são reportadas para analytics
- Verificação pode ser pulada para arquivos menores que 1MB (configurável)

---

### **RF005 - Sistema de Fallback**
**Descrição:** O sistema deve ter fallback automático para o sistema de streaming atual em caso de falhas.

**Critérios de Aceitação:**
- [ ] Fallback automático após 2 tentativas de download falhadas
- [ ] Indicador visual de que está usando streaming
- [ ] Funcionalidade completa mantida no modo fallback
- [ ] Possibilidade de retry manual para download temporário
- [ ] Logs detalhados de quando fallback é ativado

**Regras de Negócio:**
- Fallback é ativado para conexões muito lentas (< 50 KB/s)
- Usuários podem forçar modo streaming nas configurações
- Fallback não afeta outros downloads em progresso

---

## 🔧 Requisitos Não Funcionais

### **RNF001 - Performance**
**Descrição:** O sistema deve atender aos seguintes critérios de performance.

**Critérios de Aceitação:**
- [ ] Tempo de primeira reprodução < 2 segundos (vs 10-60s atual)
- [ ] Latência de início de download < 500ms
- [ ] Throughput mínimo de 1MB/s em conexões 4G
- [ ] Uso de memória < 100MB por sessão
- [ ] CPU usage < 10% durante downloads

**Métricas de Monitoramento:**
- Time to First Byte (TTFB)
- Time to Interactive (TTI)
- Memory usage over time
- Download success rate
- Cache hit ratio

---

### **RNF002 - Segurança**
**Descrição:** O sistema deve implementar medidas de segurança robustas.

**Critérios de Aceitação:**
- [ ] Autenticação obrigatória para todos os downloads
- [ ] Sanitização de nomes de arquivos
- [ ] Validação de tipos MIME permitidos
- [ ] Headers de segurança (CSP, X-Content-Type-Options)
- [ ] Rate limiting: máximo 10 downloads/minuto por usuário

**Medidas de Segurança:**
- Validação de sessão para cada requisição
- Logs de segurança para downloads suspeitos
- Bloqueio automático após 5 tentativas de acesso negado
- Sanitização contra path traversal attacks

---

### **RNF003 - Compatibilidade**
**Descrição:** O sistema deve ser compatível com navegadores e dispositivos modernos.

**Critérios de Aceitação:**
- [ ] Chrome 60+ (Desktop e Mobile)
- [ ] Firefox 55+ (Desktop e Mobile)
- [ ] Safari 12+ (Desktop e Mobile)
- [ ] Edge 79+ (Desktop)
- [ ] Fallback gracioso para navegadores não suportados

**Funcionalidades por Navegador:**
- Blob URLs: Todos os navegadores suportados
- Fetch API: Todos os navegadores suportados
- Progress Events: Todos os navegadores suportados
- Service Workers: Opcional, para cache avançado

---

### **RNF004 - Usabilidade**
**Descrição:** O sistema deve proporcionar excelente experiência do usuário.

**Critérios de Aceitação:**
- [ ] Interface intuitiva sem necessidade de treinamento
- [ ] Feedback visual claro em todos os estados
- [ ] Tempo de resposta da interface < 100ms
- [ ] Suporte completo para dispositivos móveis
- [ ] Acessibilidade WCAG 2.1 AA

**Elementos de UX:**
- Loading states bem definidos
- Error messages claras e acionáveis
- Animações suaves e não intrusivas
- Controles de mídia familiares
- Indicadores de status sempre visíveis

---

## 🏗️ Arquitetura Técnica

### **Componentes Frontend**

#### **TempMediaManager**
```typescript
interface TempMediaManager {
  // Propriedades
  downloadCache: Map<string, Promise<MediaData>>;
  tempStorage: Map<string, MediaData>;
  downloadQueue: DownloadItem[];
  maxConcurrentDownloads: number;
  maxCacheSize: number;
  
  // Métodos principais
  downloadMedia(url: string, options?: DownloadOptions): Promise<MediaData>;
  performDownload(url: string, options: DownloadOptions): Promise<MediaData>;
  generateCacheKey(url: string): string;
  clearAllTemp(): void;
  cleanupBySize(): void;
  setupAutoCleanup(): void;
  
  // Métodos de monitoramento
  getStats(): CacheStats;
  getCacheSize(): number;
  getDownloadProgress(url: string): number;
}

interface MediaData {
  url: string;          // Object URL para reprodução
  blob: Blob;          // Dados binários
  size: number;        // Tamanho em bytes
  type: string;        // MIME type
  downloadedAt: number; // Timestamp
  lastAccessed: number; // Timestamp do último acesso
  hash?: string;       // Hash SHA-256 para verificação
}

interface DownloadOptions {
  priority: 'high' | 'normal' | 'low';
  timeout: number;
  retries: number;
  validateIntegrity: boolean;
}
```

#### **MediaBubble**
```typescript
interface MediaBubble {
  // Propriedades
  messageData: MessageData;
  mediaManager: TempMediaManager;
  downloadProgress: number;
  isDownloading: boolean;
  element: HTMLElement;
  progressTracker: ProgressTracker;
  
  // Métodos de renderização
  render(): HTMLElement;
  getInitialHTML(mediaType: string): string;
  renderMediaElement(mediaData: MediaData, mediaType: string): void;
  
  // Métodos de download
  startDownload(mediaUrl: string, mediaType: string): Promise<void>;
  updateProgress(percent: number): void;
  updateStatus(status: string): void;
  
  // Métodos de tratamento de erro
  handleDownloadError(error: Error): void;
  showRetryButton(): void;
  activateFallback(): void;
  
  // Utilitários
  getMediaType(mimetype: string): 'audio' | 'video' | 'image';
  getTypeIcon(mediaType: string): string;
  formatFileSize(bytes: number): string;
}
```

### **Componentes Backend**

#### **API de Metadados**
```javascript
// GET /api/media/info/:filename
app.get('/api/media/info/:filename', requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(MEDIA_DIR, filename);
    
    // Verificações de segurança
    if (!isValidFilename(filename)) {
      return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Obter metadados
    const stats = fs.statSync(filePath);
    const hash = await generateFileHash(filePath);
    const mimetype = getMimeType(filePath);
    
    // Verificar se há versão comprimida
    const compressedPath = getCompressedPath(filePath);
    const compressionAvailable = fs.existsSync(compressedPath);
    
    res.json({
      filename,
      size: stats.size,
      lastModified: stats.mtime.toISOString(),
      hash,
      mimetype,
      compressionAvailable,
      compressedSize: compressionAvailable ? fs.statSync(compressedPath).size : null
    });
    
  } catch (error) {
    console.error('Erro ao obter metadados:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

#### **Middleware de Integridade**
```javascript
// Middleware para verificação de integridade
app.use('/media/:filename', async (req, res, next) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join(MEDIA_DIR, filename);
    
    // Verificações básicas
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    // Verificar hash se fornecido
    const expectedHash = req.query.hash;
    if (expectedHash) {
      const actualHash = await generateFileHash(filePath);
      if (actualHash !== expectedHash) {
        console.warn(`Integridade comprometida: ${filename}`, {
          expected: expectedHash,
          actual: actualHash,
          user: req.session?.user?.username
        });
        
        return res.status(400).json({ 
          error: 'Integridade do arquivo comprometida',
          code: 'INTEGRITY_FAILED'
        });
      }
    }
    
    // Headers de segurança
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'self'");
    res.setHeader('X-Frame-Options', 'DENY');
    
    // Rate limiting
    const userId = req.session?.user?.id;
    if (userId && !checkRateLimit(userId)) {
      return res.status(429).json({ 
        error: 'Muitas requisições. Tente novamente em alguns minutos.',
        code: 'RATE_LIMITED'
      });
    }
    
    next();
    
  } catch (error) {
    console.error('Erro no middleware de integridade:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});
```

---

## 🎨 Especificação de Interface

### **Estados Visuais**

#### **Estado: Inicializando**
```html
<div class="media-bubble initializing">
  <div class="media-container">
    <div class="media-placeholder">
      <div class="spinner"></div>
      <span class="status-text">Preparando download...</span>
    </div>
  </div>
</div>
```

#### **Estado: Baixando**
```html
<div class="media-bubble downloading">
  <div class="media-container">
    <div class="download-progress">
      <div class="progress-circle">
        <svg class="progress-ring" width="60" height="60">
          <circle class="progress-ring-circle" cx="30" cy="30" r="25"></circle>
        </svg>
        <span class="progress-text">45%</span>
      </div>
      <div class="download-info">
        <span class="media-type-icon">🎵</span>
        <span class="download-status">Baixando... 1.2 MB/s</span>
        <span class="download-eta">ETA: 3s</span>
      </div>
    </div>
  </div>
</div>
```

#### **Estado: Pronto**
```html
<div class="media-bubble ready">
  <div class="media-container">
    <audio controls class="media-element audio-player">
      <source src="blob:http://localhost:3000/abc123" type="audio/mpeg">
    </audio>
    <div class="media-info">
      <span class="file-size">2.3 MB</span>
      <span class="download-time">Baixado agora</span>
    </div>
  </div>
</div>
```

#### **Estado: Erro**
```html
<div class="media-bubble error">
  <div class="media-container">
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      <span class="error-text">Falha no download</span>
      <button class="retry-button">Tentar novamente</button>
      <button class="fallback-button">Usar streaming</button>
    </div>
  </div>
</div>
```

### **Animações e Transições**

```css
/* Animação do círculo de progresso */
@keyframes progressFill {
  from {
    stroke-dashoffset: 157; /* 2 * π * 25 */
  }
  to {
    stroke-dashoffset: calc(157 - (157 * var(--progress) / 100));
  }
}

/* Transição entre estados */
.media-container {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Animação de entrada da mídia */
@keyframes mediaFadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Animação de erro */
@keyframes errorShake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
```

---

## 🧪 Plano de Testes

### **Testes Unitários**

#### **TempMediaManager Tests**
```javascript
describe('TempMediaManager', () => {
  let manager;
  
  beforeEach(() => {
    manager = new TempMediaManager();
  });
  
  describe('downloadMedia', () => {
    test('deve baixar e cachear mídia corretamente', async () => {
      const mockUrl = '/media/test.mp3';
      const result = await manager.downloadMedia(mockUrl);
      
      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('blob');
      expect(result.blob).toBeInstanceOf(Blob);
      expect(manager.tempStorage.has(manager.generateCacheKey(mockUrl))).toBe(true);
    });
    
    test('deve retornar cache hit para arquivos já baixados', async () => {
      const mockUrl = '/media/test.mp3';
      
      // Primeiro download
      const result1 = await manager.downloadMedia(mockUrl);
      
      // Segundo download (deve usar cache)
      const result2 = await manager.downloadMedia(mockUrl);
      
      expect(result1.url).toBe(result2.url);
      expect(manager.getStats().cacheHits).toBe(1);
    });
    
    test('deve limpar cache quando exceder limite', async () => {
      manager.maxCacheSize = 1000; // 1KB para teste
      
      // Simular múltiplos downloads
      const urls = ['/media/test1.mp3', '/media/test2.mp3', '/media/test3.mp3'];
      
      for (const url of urls) {
        await manager.downloadMedia(url);
      }
      
      expect(manager.getCacheSize()).toBeLessThanOrEqual(manager.maxCacheSize);
    });
  });
  
  describe('cache management', () => {
    test('deve implementar LRU corretamente', () => {
      // Adicionar itens ao cache
      manager.tempStorage.set('key1', { lastAccessed: 1000, size: 100 });
      manager.tempStorage.set('key2', { lastAccessed: 2000, size: 100 });
      manager.tempStorage.set('key3', { lastAccessed: 1500, size: 100 });
      
      manager.maxCacheSize = 150; // Força limpeza
      manager.cleanupBySize();
      
      // key1 deve ser removido (mais antigo)
      expect(manager.tempStorage.has('key1')).toBe(false);
      expect(manager.tempStorage.has('key2')).toBe(true);
    });
  });
});
```

#### **MediaBubble Tests**
```javascript
describe('MediaBubble', () => {
  let bubble;
  let mockMediaManager;
  
  beforeEach(() => {
    mockMediaManager = {
      downloadMedia: jest.fn(),
      getStats: jest.fn()
    };
    
    bubble = new MediaBubble({
      mediaFilename: 'test.mp3',
      mimetype: 'audio/mpeg'
    }, mockMediaManager);
  });
  
  test('deve renderizar estado inicial corretamente', () => {
    const element = bubble.render();
    
    expect(element.classList.contains('media-bubble')).toBe(true);
    expect(element.querySelector('.download-progress')).toBeTruthy();
    expect(element.querySelector('.progress-text').textContent).toBe('0%');
  });
  
  test('deve atualizar progresso corretamente', () => {
    const element = bubble.render();
    
    bubble.updateProgress(50);
    
    expect(element.querySelector('.progress-text').textContent).toBe('50%');
    expect(bubble.downloadProgress).toBe(50);
  });
  
  test('deve renderizar elemento de mídia após download', async () => {
    const mockMediaData = {
      url: 'blob:http://localhost/test',
      blob: new Blob(['test'], { type: 'audio/mpeg' }),
      size: 1024,
      type: 'audio/mpeg'
    };
    
    mockMediaManager.downloadMedia.mockResolvedValue(mockMediaData);
    
    const element = bubble.render();
    await bubble.startDownload('/media/test.mp3', 'audio');
    
    expect(element.querySelector('audio')).toBeTruthy();
    expect(element.querySelector('audio source').src).toBe(mockMediaData.url);
  });
});
```

### **Testes de Integração**

#### **Fluxo Completo de Download**
```javascript
describe('Download Flow Integration', () => {
  test('deve completar fluxo de download end-to-end', async () => {
    // Setup
    const manager = new TempMediaManager();
    const bubble = new MediaBubble({
      mediaFilename: 'test.mp3',
      mimetype: 'audio/mpeg'
    }, manager);
    
    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob(['test audio'], { type: 'audio/mpeg' }))
    });
    
    // Renderizar e iniciar download
    const element = bubble.render();
    document.body.appendChild(element);
    
    await bubble.startDownload('/media/test.mp3', 'audio');
    
    // Verificações
    expect(element.querySelector('audio')).toBeTruthy();
    expect(manager.tempStorage.size).toBe(1);
    expect(bubble.downloadProgress).toBe(100);
    
    // Cleanup
    document.body.removeChild(element);
  });
});
```

### **Testes de Performance**

#### **Benchmark de Download**
```javascript
describe('Performance Tests', () => {
  test('deve baixar arquivo de 1MB em menos de 5 segundos', async () => {
    const manager = new TempMediaManager();
    const startTime = performance.now();
    
    // Mock de arquivo grande
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob([new ArrayBuffer(1024 * 1024)], { type: 'audio/mpeg' }))
    });
    
    await manager.downloadMedia('/media/large-file.mp3');
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    expect(duration).toBeLessThan(5000); // 5 segundos
  });
  
  test('deve manter uso de memória abaixo de 100MB', async () => {
    const manager = new TempMediaManager();
    
    // Simular múltiplos downloads
    const downloads = [];
    for (let i = 0; i < 50; i++) {
      downloads.push(manager.downloadMedia(`/media/file${i}.mp3`));
    }
    
    await Promise.all(downloads);
    
    expect(manager.getCacheSize()).toBeLessThan(100 * 1024 * 1024); // 100MB
  });
});
```

---

## 📊 Critérios de Aceitação Final

### **Funcionalidade**
- [ ] **Download automático** funciona para todos os tipos de mídia suportados
- [ ] **Cache temporário** mantém arquivos durante a sessão e limpa ao recarregar
- [ ] **Progresso visual** é exibido corretamente com percentual e ETA
- [ ] **Verificação de integridade** detecta arquivos corrompidos
- [ ] **Sistema de fallback** ativa automaticamente quando necessário
- [ ] **Tratamento de erros** exibe mensagens claras e opções de retry

### **Performance**
- [ ] **Tempo de primeira reprodução** < 2 segundos para arquivos até 5MB
- [ ] **Uso de memória** < 100MB por sessão
- [ ] **Taxa de sucesso** > 95% em condições normais de rede
- [ ] **Cache hit rate** > 60% após período de uso
- [ ] **Throughput** > 1MB/s em conexões 4G

### **Segurança**
- [ ] **Autenticação** obrigatória para todos os downloads
- [ ] **Validação de arquivos** impede download de tipos não permitidos
- [ ] **Rate limiting** previne abuso do sistema
- [ ] **Sanitização** protege contra ataques de path traversal
- [ ] **Headers de segurança** implementados corretamente

### **Compatibilidade**
- [ ] **Navegadores modernos** funcionam completamente
- [ ] **Dispositivos móveis** têm experiência otimizada
- [ ] **Navegadores antigos** usam fallback gracioso
- [ ] **Conexões lentas** são tratadas adequadamente
- [ ] **Offline/reconexão** é gerenciada corretamente

### **Usabilidade**
- [ ] **Interface intuitiva** não requer explicações
- [ ] **Feedback visual** é claro em todos os estados
- [ ] **Animações** são suaves e não intrusivas
- [ ] **Acessibilidade** atende padrões WCAG 2.1 AA
- [ ] **Responsividade** funciona em todas as resoluções

---

## 📋 Entregáveis

### **Código**
1. **TempMediaManager.js** - Gerenciador de downloads e cache
2. **MediaBubble.js** - Componente de interface para mídia
3. **ProgressTracker.js** - Controle de progresso visual
4. **IntegrityValidator.js** - Validação de integridade
5. **media-styles.css** - Estilos específicos para mídia
6. **Backend API** - Endpoints de metadados e middleware

### **Documentação**
1. **README.md** - Guia de instalação e uso
2. **API.md** - Documentação das APIs
3. **DEPLOYMENT.md** - Guia de deploy
4. **TROUBLESHOOTING.md** - Guia de resolução de problemas

### **Testes**
1. **Unit Tests** - Cobertura > 90%
2. **Integration Tests** - Fluxos principais
3. **Performance Tests** - Benchmarks de performance
4. **E2E Tests** - Testes de interface completos

### **Monitoramento**
1. **Métricas de Performance** - Dashboard de analytics
2. **Logs Estruturados** - Sistema de logging
3. **Alertas** - Monitoramento proativo
4. **Health Checks** - Verificações de saúde do sistema

---

**Documento gerado em:** " + new Date().toLocaleDateString('pt-BR') + "
**Versão:** 1.0
**Status:** Especificação Técnica Final
**Autor:** Analista de Sistemas Sênior
**Aprovação:** Pendente
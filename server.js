const express = require('express');
const compression = require('compression');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const session = require('express-session');
const Keycloak = require('keycloak-connect');
const AudioCompressor = require('./AudioCompressor');
const PerformanceMonitor = require('./PerformanceMonitor');

const MEDIA_DIR = path.join(__dirname, 'media');

// Inicializar compressor de áudios
const audioCompressor = new AudioCompressor({
  inputDir: MEDIA_DIR,
  outputDir: path.join(MEDIA_DIR, 'compressed'),
  compressionQuality: 'medium',
  maxConcurrentJobs: 2,
  enableNormalization: true,
  enableNoiseReduction: true
});

console.log('[SERVER] Sistema de compressão de áudios inicializado');

// Inicializar monitor de performance
const performanceMonitor = new PerformanceMonitor({
  metricsInterval: 30000, // 30 segundos
  healthCheckInterval: 60000, // 1 minuto
  logDir: './logs',
  alertThresholds: {
    responseTime: 5000, // 5s para alta latência
    memoryUsage: 80,
    cpuUsage: 85,
    errorRate: 5
  },
  trackLatencyOptimizations: true,
  enableRealTimeAlerts: true
});

console.log('[SERVER] Sistema de monitoramento de performance inicializado');
const MESSAGES_FILE = path.join(__dirname, 'messages.json');

const app = express();
const server = http.createServer(app);

// Configurar compressão gzip otimizada
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  }
}));

// Configurar Socket.IO otimizado para alta latência
const io = new Server(server, {
  pingTimeout: 60000,    // 60s (padrão: 5s)
  pingInterval: 25000,   // 25s (padrão: 25s)
  upgradeTimeout: 30000, // 30s (padrão: 10s)
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  cors: {
    origin: true,
    credentials: true
  }
});

// Configurar referências do monitor
performanceMonitor.setReferences({
  server,
  io,
  database: null,
  audioCompressor,
  parallelRequestManager: null, // Será configurado no frontend
  intelligentPreloader: null    // Será configurado no frontend
});

// Middleware para rastrear requisições
app.use((req, res, next) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    const success = res.statusCode < 400;
    performanceMonitor.recordRequest(responseTime, success);
  });
  
  next();
});

const memoryStore = new session.MemoryStore();
app.use(session({
  secret: 'sua-chave-secreta',
  resave: false,
  saveUninitialized: true,
  store: memoryStore
}));

const keycloak = new Keycloak({ store: memoryStore });
app.use(keycloak.middleware());

app.use(keycloak.protect());

// Middleware para servir arquivos de mídia com cache otimizado
app.use('/media', async (req, res, next) => {
  const filePath = path.join(MEDIA_DIR, req.path);
  const compressedPath = path.join(MEDIA_DIR, 'compressed', req.path.replace(/\.(wav|ogg|m4a|aac)$/, '_compressed.mp3'));
  
  // Se é áudio e existe versão comprimida, servir a comprimida
  if (/\.(mp3|wav|ogg|m4a|aac)$/i.test(req.path)) {
    if (fs.existsSync(compressedPath)) {
      console.log(`[SERVER] 📦 Servindo áudio comprimido: ${path.basename(compressedPath)}`);
      req.url = req.url.replace(/\.(wav|ogg|m4a|aac)$/, '_compressed.mp3');
      req.path = '/compressed' + req.path.replace(/\.(wav|ogg|m4a|aac)$/, '_compressed.mp3');
    } else if (fs.existsSync(filePath)) {
      // Comprimir automaticamente em background
      audioCompressor.autoCompress(filePath).then(result => {
        if (result.success) {
          console.log(`[SERVER] ✅ Áudio comprimido automaticamente: ${path.basename(filePath)}`);
        }
      }).catch(err => {
        console.warn(`[SERVER] ⚠️ Falha na compressão automática: ${err.message}`);
      });
    }
  }
  
  next();
}, express.static(MEDIA_DIR, {
  maxAge: '7d', // 7 dias de cache
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.mp3') || path.endsWith('.ogg') || path.endsWith('.wav')) {
      res.setHeader('Cache-Control', 'public, max-age=604800'); // 7 dias
    } else if (path.endsWith('.jpg') || path.endsWith('.png') || path.endsWith('.jpeg')) {
      res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 dias
    }
    res.setHeader('X-Content-Type-Options', 'nosniff');
  }
}));

// Servir arquivos estáticos com cache
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1d', // 1 dia para arquivos estáticos
  etag: true,
  lastModified: true
}));
app.use(express.json());

// Protege todas as rotas

// API para buscar mensagens
app.get('/api/messages', (req, res) => {
  let messages = [];
  if (fs.existsSync(MESSAGES_FILE)) {
    try {
      messages = JSON.parse(fs.readFileSync(MESSAGES_FILE, 'utf8'));
    } catch {
      messages = [];
    }
  }
  res.json(messages);
});

// Rotas para compressão de áudios
app.get('/api/audio-compression/stats', (req, res) => {
  try {
    const stats = audioCompressor.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/audio-compression/compress', async (req, res) => {
  try {
    const { filePath, quality } = req.body;
    
    if (!filePath) {
      return res.status(400).json({
        success: false,
        error: 'Caminho do arquivo é obrigatório'
      });
    }
    
    const fullPath = path.join(MEDIA_DIR, filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: 'Arquivo não encontrado'
      });
    }
    
    const result = await audioCompressor.compressAudio(fullPath, null, { quality });
    
    res.json(result);
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.post('/api/audio-compression/batch', async (req, res) => {
  try {
    const { filePaths, quality, concurrency } = req.body;
    
    if (!Array.isArray(filePaths) || filePaths.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Lista de arquivos é obrigatória'
      });
    }
    
    const fullPaths = filePaths.map(fp => path.join(MEDIA_DIR, fp));
    
    // Verificar se todos os arquivos existem
    const missingFiles = fullPaths.filter(fp => !fs.existsSync(fp));
    if (missingFiles.length > 0) {
      return res.status(404).json({
        success: false,
        error: `Arquivos não encontrados: ${missingFiles.map(f => path.basename(f)).join(', ')}`
      });
    }
    
    const results = await audioCompressor.compressBatch(fullPaths, { quality, concurrency });
    
    res.json({
      success: true,
      results
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.delete('/api/audio-compression/cache', async (req, res) => {
  try {
    const { maxAge } = req.query;
    const cleaned = await audioCompressor.cleanCache(maxAge ? parseInt(maxAge) : undefined);
    
    res.json({
      success: true,
      cleaned
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Rotas para monitoramento de performance
app.get('/api/monitoring/metrics', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    res.json({
      success: true,
      metrics
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/monitoring/health', async (req, res) => {
  try {
    const healthCheck = await performanceMonitor.performHealthChecks();
    const healthScore = performanceMonitor.calculateHealthScore(healthCheck);
    
    res.json({
      success: true,
      health: healthCheck,
      score: healthScore,
      status: performanceMonitor.getHealthStatus(healthScore)
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/monitoring/report', (req, res) => {
  try {
    const report = performanceMonitor.getPerformanceReport();
    res.json({
      success: true,
      report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/monitoring/history', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = performanceMonitor.getMetricsHistory(hours);
    
    res.json({
      success: true,
      history,
      period: `${hours} hours`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.get('/api/monitoring/alerts', (req, res) => {
  try {
    const metrics = performanceMonitor.getMetrics();
    const activeAlerts = metrics.alerts.filter(alert => {
      const alertTime = new Date(alert.timestamp).getTime();
      const now = Date.now();
      return (now - alertTime) < 3600000; // Últimas 1 hora
    });
    
    res.json({
      success: true,
      alerts: activeAlerts,
      total: metrics.alerts.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Limpar mensagens
app.post('/api/clear', (req, res) => {
  fs.writeFileSync(MESSAGES_FILE, '[]');
  res.json({ ok: true });
});

// Enviar mensagem via WhatsApp
app.post('/api/send', async (req, res) => {
  const { to, message } = req.body;
  console.log('Tentando enviar mensagem para:', to, '| Conteúdo:', message); // <-- Adicione esta linha
  if (!whatsappClient) {
    return res.status(500).json({ error: 'WhatsApp não conectado' });
  }
  try {
    await whatsappClient.sendMessage(to, message);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// WebSocket para atualização em tempo real
io.on('connection', socket => {
  console.log('Frontend conectado via socket.io');
  // Quando uma nova mensagem chegar, emitiremos via io.emit('nova-mensagem', msg)
});

// Módulo para receber comandos do frontend e repassar ao bot
let whatsappClient = null;
function setWhatsappClient(client) {
  whatsappClient = client;
}
module.exports = { io, setWhatsappClient };

// Função para encontrar uma porta disponível
function findAvailablePort(startPort) {
  return new Promise((resolve, reject) => {
    const net = require('net');
    const server = net.createServer();
    
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => {
        resolve(port);
      });
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        // Tenta a próxima porta
        findAvailablePort(startPort + 1).then(resolve).catch(reject);
      } else {
        reject(err);
      }
    });
  });
}

// Inicia o servidor na primeira porta disponível
findAvailablePort(3000).then(port => {
  server.listen(port, () => {
    console.log(`Servidor iniciado na porta ${port}`);
    console.log(`Acesse http://localhost:${port}`);
  });
}).catch(err => {
  console.error('Erro ao iniciar servidor:', err);
  process.exit(1);
});
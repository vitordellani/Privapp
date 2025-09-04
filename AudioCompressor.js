/**
 * Sistema de Compressão Automática de Áudios
 * Comprime áudios automaticamente usando FFmpeg para reduzir tamanho
 * Otimizado para conexões de alta latência Brasil-Finlândia
 */
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');

class AudioCompressor {
  constructor(options = {}) {
    this.options = {
      // Configurações de compressão
      audioBitrate: options.audioBitrate || '64k', // 64kbps para voz
      audioFrequency: options.audioFrequency || 22050, // 22kHz adequado para voz
      audioCodec: options.audioCodec || 'libmp3lame', // MP3 para compatibilidade
      audioChannels: options.audioChannels || 1, // Mono para voz
      
      // Configurações de diretórios
      inputDir: options.inputDir || './media',
      outputDir: options.outputDir || './media/compressed',
      tempDir: options.tempDir || './media/temp',
      
      // Configurações de processamento
      maxConcurrentJobs: options.maxConcurrentJobs || 2,
      compressionQuality: options.compressionQuality || 'medium', // low, medium, high
      enableNormalization: options.enableNormalization !== false,
      enableNoiseReduction: options.enableNoiseReduction !== false,
      
      // Configurações de cache
      cacheCompressed: options.cacheCompressed !== false,
      maxCacheSize: options.maxCacheSize || 500 * 1024 * 1024, // 500MB
      
      ...options
    };
    
    this.activeJobs = 0;
    this.jobQueue = [];
    this.compressionCache = new Map();
    this.stats = {
      totalProcessed: 0,
      totalSaved: 0,
      averageCompressionRatio: 0,
      processingTime: 0
    };
    
    this.init();
    
    console.log('[AUDIO-COMPRESSOR] Sistema de compressão de áudios inicializado');
  }

  /**
   * Inicializar sistema
   */
  async init() {
    try {
      // Criar diretórios necessários
      await this.ensureDirectories();
      
      // Verificar se FFmpeg está disponível
      await this.checkFFmpegAvailability();
      
      // Carregar cache de compressões anteriores
      await this.loadCompressionCache();
      
      console.log('[AUDIO-COMPRESSOR] Inicialização concluída');
      
    } catch (error) {
      console.error('[AUDIO-COMPRESSOR] Erro na inicialização:', error);
      throw error;
    }
  }

  /**
   * Garantir que diretórios existem
   */
  async ensureDirectories() {
    const dirs = [this.options.outputDir, this.options.tempDir];
    
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`[AUDIO-COMPRESSOR] Diretório criado: ${dir}`);
      }
    }
  }

  /**
   * Verificar disponibilidade do FFmpeg
   */
  async checkFFmpegAvailability() {
    return new Promise((resolve, reject) => {
      ffmpeg.getAvailableFormats((err, formats) => {
        if (err) {
          console.error('[AUDIO-COMPRESSOR] FFmpeg não disponível:', err.message);
          reject(new Error('FFmpeg não está instalado ou não está no PATH'));
        } else {
          console.log('[AUDIO-COMPRESSOR] FFmpeg disponível');
          resolve(true);
        }
      });
    });
  }

  /**
   * Carregar cache de compressões
   */
  async loadCompressionCache() {
    const cacheFile = path.join(this.options.outputDir, '.compression-cache.json');
    
    try {
      if (fs.existsSync(cacheFile)) {
        const cacheData = JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
        this.compressionCache = new Map(cacheData.entries || []);
        this.stats = { ...this.stats, ...cacheData.stats };
        
        console.log(`[AUDIO-COMPRESSOR] Cache carregado: ${this.compressionCache.size} entradas`);
      }
    } catch (error) {
      console.warn('[AUDIO-COMPRESSOR] Erro ao carregar cache:', error.message);
    }
  }

  /**
   * Salvar cache de compressões
   */
  async saveCompressionCache() {
    const cacheFile = path.join(this.options.outputDir, '.compression-cache.json');
    
    try {
      const cacheData = {
        entries: Array.from(this.compressionCache.entries()),
        stats: this.stats,
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(cacheFile, JSON.stringify(cacheData, null, 2));
    } catch (error) {
      console.warn('[AUDIO-COMPRESSOR] Erro ao salvar cache:', error.message);
    }
  }

  /**
   * Comprimir arquivo de áudio
   */
  async compressAudio(inputPath, outputPath = null, options = {}) {
    const startTime = Date.now();
    
    try {
      // Gerar caminho de saída se não fornecido
      if (!outputPath) {
        const filename = path.basename(inputPath, path.extname(inputPath));
        outputPath = path.join(this.options.outputDir, `${filename}_compressed.mp3`);
      }
      
      // Verificar se já foi comprimido
      const cacheKey = this.getCacheKey(inputPath);
      if (this.compressionCache.has(cacheKey) && fs.existsSync(outputPath)) {
        console.log(`[AUDIO-COMPRESSOR] 📋 Cache hit: ${path.basename(inputPath)}`);
        return {
          success: true,
          inputPath,
          outputPath,
          fromCache: true,
          ...this.compressionCache.get(cacheKey)
        };
      }
      
      // Obter informações do arquivo original
      const inputStats = fs.statSync(inputPath);
      const inputSize = inputStats.size;
      
      // Configurar compressão baseada na qualidade
      const compressionSettings = this.getCompressionSettings(options.quality || this.options.compressionQuality);
      
      console.log(`[AUDIO-COMPRESSOR] 🎵 Comprimindo: ${path.basename(inputPath)} (${this.formatBytes(inputSize)})`);
      
      // Executar compressão
      await this.executeCompression(inputPath, outputPath, compressionSettings);
      
      // Verificar resultado
      if (!fs.existsSync(outputPath)) {
        throw new Error('Arquivo comprimido não foi gerado');
      }
      
      const outputStats = fs.statSync(outputPath);
      const outputSize = outputStats.size;
      const compressionRatio = ((inputSize - outputSize) / inputSize) * 100;
      const processingTime = Date.now() - startTime;
      
      // Atualizar estatísticas
      this.updateStats(inputSize, outputSize, processingTime);
      
      // Salvar no cache
      const result = {
        success: true,
        inputPath,
        outputPath,
        inputSize,
        outputSize,
        compressionRatio,
        processingTime,
        timestamp: new Date().toISOString()
      };
      
      this.compressionCache.set(cacheKey, result);
      await this.saveCompressionCache();
      
      console.log(`[AUDIO-COMPRESSOR] ✅ Comprimido: ${path.basename(inputPath)} - ${compressionRatio.toFixed(1)}% menor (${this.formatBytes(outputSize)})`);
      
      return result;
      
    } catch (error) {
      console.error(`[AUDIO-COMPRESSOR] ❌ Erro ao comprimir ${path.basename(inputPath)}:`, error.message);
      
      return {
        success: false,
        inputPath,
        outputPath,
        error: error.message,
        processingTime: Date.now() - startTime
      };
    }
  }

  /**
   * Executar compressão com FFmpeg
   */
  async executeCompression(inputPath, outputPath, settings) {
    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .audioCodec(settings.codec)
        .audioBitrate(settings.bitrate)
        .audioFrequency(settings.frequency)
        .audioChannels(settings.channels)
        .format('mp3');
      
      // Aplicar filtros de áudio se habilitados
      if (this.options.enableNormalization) {
        command = command.audioFilters('loudnorm=I=-16:TP=-1.5:LRA=11');
      }
      
      if (this.options.enableNoiseReduction) {
        command = command.audioFilters('highpass=f=80,lowpass=f=8000');
      }
      
      command
        .on('start', (commandLine) => {
          console.log(`[AUDIO-COMPRESSOR] 🔄 Executando: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`[AUDIO-COMPRESSOR] 📊 Progresso: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`[AUDIO-COMPRESSOR] 🎯 Compressão concluída: ${path.basename(outputPath)}`);
          resolve();
        })
        .on('error', (err) => {
          console.error(`[AUDIO-COMPRESSOR] ❌ Erro FFmpeg:`, err.message);
          reject(err);
        })
        .save(outputPath);
    });
  }

  /**
   * Obter configurações de compressão baseadas na qualidade
   */
  getCompressionSettings(quality) {
    const settings = {
      low: {
        codec: 'libmp3lame',
        bitrate: '32k',
        frequency: 16000,
        channels: 1
      },
      medium: {
        codec: 'libmp3lame',
        bitrate: '64k',
        frequency: 22050,
        channels: 1
      },
      high: {
        codec: 'libmp3lame',
        bitrate: '96k',
        frequency: 44100,
        channels: 1
      }
    };
    
    return settings[quality] || settings.medium;
  }

  /**
   * Comprimir múltiplos arquivos em lote
   */
  async compressBatch(inputPaths, options = {}) {
    console.log(`[AUDIO-COMPRESSOR] 🚀 Iniciando compressão em lote: ${inputPaths.length} arquivos`);
    
    const results = [];
    const concurrency = options.concurrency || this.options.maxConcurrentJobs;
    
    // Processar em grupos para controlar concorrência
    for (let i = 0; i < inputPaths.length; i += concurrency) {
      const batch = inputPaths.slice(i, i + concurrency);
      
      const batchPromises = batch.map(inputPath => 
        this.compressAudio(inputPath, null, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            inputPath: batch[index],
            error: result.reason.message
          });
        }
      });
    }
    
    const successful = results.filter(r => r.success).length;
    const failed = results.length - successful;
    
    console.log(`[AUDIO-COMPRESSOR] 📊 Lote concluído: ${successful} sucessos, ${failed} falhas`);
    
    return results;
  }

  /**
   * Comprimir áudio automaticamente quando detectado
   */
  async autoCompress(filePath, options = {}) {
    try {
      // Verificar se é arquivo de áudio
      if (!this.isAudioFile(filePath)) {
        return { success: false, reason: 'Não é arquivo de áudio' };
      }
      
      // Verificar tamanho mínimo para compressão
      const stats = fs.statSync(filePath);
      const minSize = options.minSize || 50 * 1024; // 50KB mínimo
      
      if (stats.size < minSize) {
        return { success: false, reason: 'Arquivo muito pequeno para compressão' };
      }
      
      // Adicionar à fila se necessário
      if (this.activeJobs >= this.options.maxConcurrentJobs) {
        return new Promise((resolve) => {
          this.jobQueue.push({ filePath, options, resolve });
        });
      }
      
      this.activeJobs++;
      
      try {
        const result = await this.compressAudio(filePath, null, options);
        return result;
      } finally {
        this.activeJobs--;
        this.processQueue();
      }
      
    } catch (error) {
      console.error('[AUDIO-COMPRESSOR] Erro na compressão automática:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Processar fila de trabalhos
   */
  async processQueue() {
    if (this.jobQueue.length === 0 || this.activeJobs >= this.options.maxConcurrentJobs) {
      return;
    }
    
    const job = this.jobQueue.shift();
    if (job) {
      const result = await this.autoCompress(job.filePath, job.options);
      job.resolve(result);
    }
  }

  /**
   * Verificar se é arquivo de áudio
   */
  isAudioFile(filePath) {
    const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac', '.wma'];
    const ext = path.extname(filePath).toLowerCase();
    return audioExtensions.includes(ext);
  }

  /**
   * Gerar chave de cache
   */
  getCacheKey(filePath) {
    const stats = fs.statSync(filePath);
    return `${filePath}:${stats.size}:${stats.mtime.getTime()}`;
  }

  /**
   * Atualizar estatísticas
   */
  updateStats(inputSize, outputSize, processingTime) {
    this.stats.totalProcessed++;
    this.stats.totalSaved += (inputSize - outputSize);
    this.stats.processingTime += processingTime;
    
    // Calcular média de compressão
    const compressionRatio = ((inputSize - outputSize) / inputSize) * 100;
    this.stats.averageCompressionRatio = (
      (this.stats.averageCompressionRatio * (this.stats.totalProcessed - 1) + compressionRatio) / 
      this.stats.totalProcessed
    );
  }

  /**
   * Formatar bytes para leitura humana
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Obter estatísticas
   */
  getStats() {
    return {
      ...this.stats,
      activeJobs: this.activeJobs,
      queueLength: this.jobQueue.length,
      cacheSize: this.compressionCache.size,
      totalSavedFormatted: this.formatBytes(this.stats.totalSaved),
      averageProcessingTime: this.stats.totalProcessed > 0 ? 
        Math.round(this.stats.processingTime / this.stats.totalProcessed) : 0
    };
  }

  /**
   * Limpar cache antigo
   */
  async cleanCache(maxAge = 7 * 24 * 60 * 60 * 1000) { // 7 dias
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, value] of this.compressionCache.entries()) {
      const age = now - new Date(value.timestamp).getTime();
      
      if (age > maxAge) {
        // Remover arquivo comprimido se existir
        if (fs.existsSync(value.outputPath)) {
          fs.unlinkSync(value.outputPath);
        }
        
        this.compressionCache.delete(key);
        cleaned++;
      }
    }
    
    if (cleaned > 0) {
      await this.saveCompressionCache();
      console.log(`[AUDIO-COMPRESSOR] 🗑️ Cache limpo: ${cleaned} entradas removidas`);
    }
    
    return cleaned;
  }

  /**
   * Destruir instância
   */
  async destroy() {
    // Aguardar jobs ativos terminarem
    while (this.activeJobs > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Salvar cache final
    await this.saveCompressionCache();
    
    // Limpar fila
    this.jobQueue = [];
    
    console.log('[AUDIO-COMPRESSOR] Sistema destruído');
  }
}

module.exports = AudioCompressor;
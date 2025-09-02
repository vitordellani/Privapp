/**
 * Script para testar a comunicação do status do WhatsApp via Socket.IO
 * 
 * Este script simula a emissão de eventos de status do WhatsApp
 * para verificar se o problema está na comunicação via Socket.IO
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');

// Criar servidor Express
const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Servir página de teste
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'socket-test.html'));
});

// Status inicial do WhatsApp
let whatsappStatus = {
  status: 'disconnected',
  lastQRCode: null,
  lastError: null,
  connectedAt: null
};

// Conexão Socket.IO
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);
  
  // Enviar status atual para o cliente que acabou de conectar
  socket.emit('whatsapp-status', whatsappStatus);
  
  // Receber solicitações de mudança de status
  socket.on('change-status', (newStatus) => {
    console.log('Solicitação de mudança de status:', newStatus);
    whatsappStatus = { ...whatsappStatus, ...newStatus };
    io.emit('whatsapp-status', whatsappStatus);
  });
  
  // Desconexão do cliente
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Iniciar servidor
const PORT = 3030;
server.listen(PORT, () => {
  console.log(`Servidor de teste Socket.IO rodando em http://localhost:${PORT}`);
  console.log('Acesse esta URL no navegador para testar a comunicação do status');
});

// Simular mudanças de status a cada 10 segundos
let statusIndex = 0;
const statusSequence = [
  { status: 'initializing', lastError: null },
  { status: 'qr_received', lastQRCode: 'qr-code-simulado' },
  { status: 'loading', lastError: null },
  { status: 'authenticated', lastError: null },
  { status: 'connected', connectedAt: new Date().toISOString(), lastError: null },
  { status: 'disconnected', lastError: 'Simulação de desconexão' },
];

const statusInterval = setInterval(() => {
  const newStatus = statusSequence[statusIndex];
  console.log('Alterando status para:', newStatus.status);
  whatsappStatus = { ...whatsappStatus, ...newStatus };
  io.emit('whatsapp-status', whatsappStatus);
  
  statusIndex = (statusIndex + 1) % statusSequence.length;
}, 10000);

// Manipular encerramento do processo
process.on('SIGINT', () => {
  clearInterval(statusInterval);
  server.close(() => {
    console.log('Servidor encerrado');
    process.exit(0);
  });
});
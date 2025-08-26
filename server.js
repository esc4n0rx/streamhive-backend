const app = require('./src/app');
const socketServer = require('./src/infrastructure/websocket/socket-server');
const http = require('http');

const PORT = process.env.PORT || 3000;

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    process.exit(1);
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    socketServer.destroy();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received. Shutting down gracefully...');
    socketServer.destroy();
    process.exit(0);
});

// Criar servidor HTTP
const server = http.createServer(app);

// Inicializar WebSocket
socketServer.initialize(server);

server.listen(PORT, () => {
    console.log(`🚀 Streamhive API running on port ${PORT}`);
    console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}/streaming`);
});

module.exports = server;
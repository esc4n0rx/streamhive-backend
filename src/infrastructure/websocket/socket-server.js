const { Server } = require('socket.io');
const socketAuth = require('./middlewares/socket-auth');
const RoomHandler = require('./handlers/room-handler');

class SocketServer {
    constructor() {
        this.io = null;
        this.roomHandler = null;
    }

    initialize(server) {
        this.io = new Server(server, {
            cors: {
                origin: process.env.NODE_ENV === 'production' 
                    ? process.env.FRONTEND_URL 
                    : ['http://localhost:3000', 'http://localhost:3001'],
                methods: ['GET', 'POST'],
                credentials: true
            },
            transports: ['websocket', 'polling'],
            pingTimeout: 60000,
            pingInterval: 25000
        });

        this.roomHandler = new RoomHandler();

        // Middleware de autenticação
        this.io.use(socketAuth);

        // Namespace para streaming
        const streamingNamespace = this.io.of('/streaming');
        
        streamingNamespace.use(socketAuth);
        
        streamingNamespace.on('connection', (socket) => {
            this.roomHandler.handleConnection(socket, streamingNamespace);
        });

        // Logs de conexão
        this.io.on('connection', (socket) => {
            console.log(`Socket connected: ${socket.id} (User: ${socket.user?.username})`);
            
            socket.on('disconnect', (reason) => {
                console.log(`Socket disconnected: ${socket.id} (Reason: ${reason})`);
            });
        });

        // Error handling
        this.io.engine.on('connection_error', (err) => {
            console.error('Socket connection error:', err);
        });

        console.log('✅ Socket.IO server initialized');
        return this.io;
    }

    getIO() {
        if (!this.io) {
            throw new Error('Socket server not initialized');
        }
        return this.io;
    }

    // Método para enviar eventos para uma sala específica
    emitToRoom(roomId, event, data) {
        if (this.io) {
            this.io.of('/streaming').to(roomId).emit(event, data);
        }
    }

    // Método para obter participantes conectados de uma sala
    async getRoomParticipants(roomId) {
        if (!this.io) return [];
        
        const sockets = await this.io.of('/streaming').in(roomId).fetchSockets();
        return sockets.map(socket => ({
            id: socket.userId,
            username: socket.user.username,
            name: socket.user.name,
            socketId: socket.id
        }));
    }

    destroy() {
        if (this.roomHandler) {
            this.roomHandler.destroy();
        }
        
        if (this.io) {
            this.io.close();
            this.io = null;
        }
    }
}

module.exports = new SocketServer(); // Singleton
const StreamingService = require('../../../application/services/streaming-service');
const SupabaseRoomStateRepository = require('../../../domain/repositories/supabase-room-state-repository');
const SupabaseRoomRepository = require('../../repositories/supabase-room-repository');

class RoomHandler {
    constructor() {
        this.roomStateRepository = new SupabaseRoomStateRepository();
        this.roomRepository = new SupabaseRoomRepository();
        this.streamingService = new StreamingService(this.roomStateRepository, this.roomRepository);
        
        // Cache para controle de rate limiting por usuário
        this.userEventCounts = new Map();
        this.resetInterval = setInterval(() => {
            this.userEventCounts.clear();
        }, 60000); // Reset a cada minuto
    }

    handleConnection(socket, io) {
        console.log(`User ${socket.user.username} connected to streaming`);

        // Rate limiting por usuário
        socket.use((packet, next) => {
            const userId = socket.userId;
            const currentCount = this.userEventCounts.get(userId) || 0;
            
            if (currentCount > 100) { // Máximo 100 eventos por minuto
                return next(new Error('Rate limit exceeded'));
            }
            
            this.userEventCounts.set(userId, currentCount + 1);
            next();
        });

        // Entrar em uma sala
        socket.on('join-room', async (data) => {
            try {
                const { roomId } = data;
                
                if (!roomId) {
                    return socket.emit('error', { message: 'Room ID is required' });
                }

                // Verifica acesso à sala
                await this.streamingService._ensureRoomAccess(roomId, socket.userId);
                
                // Sai de outras salas primeiro
                socket.rooms.forEach(room => {
                    if (room !== socket.id) {
                        socket.leave(room);
                    }
                });

                // Entra na sala
                socket.join(roomId);
                socket.currentRoomId = roomId;

                // Sincroniza o estado atual
                const syncData = await this.streamingService.syncNewParticipant(roomId, socket.userId);
                
                // Envia estado atual para o usuário que acabou de entrar
                socket.emit('room-state', syncData);

                // Notifica outros participantes
                socket.to(roomId).emit('user-joined', {
                    user: socket.user,
                    timestamp: Date.now()
                });

                console.log(`User ${socket.user.username} joined room ${roomId}`);

            } catch (error) {
                console.error('Error joining room:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Sair de uma sala
        socket.on('leave-room', async (data) => {
            try {
                const { roomId } = data;
                
                if (socket.currentRoomId && socket.currentRoomId === roomId) {
                    socket.leave(roomId);
                    socket.currentRoomId = null;

                    // Log do evento
                    await this.roomStateRepository.logEvent({
                        roomId,
                        userId: socket.userId,
                        eventType: 'leave',
                        eventData: { timestamp: Date.now() }
                    });

                    // Notifica outros participantes
                    socket.to(roomId).emit('user-left', {
                        user: socket.user,
                        timestamp: Date.now()
                    });

                    console.log(`User ${socket.user.username} left room ${roomId}`);
                }

            } catch (error) {
                console.error('Error leaving room:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Eventos de controle de vídeo
        socket.on('video-play', async (data) => {
            await this._handleVideoEvent(socket, io, 'play', data);
        });

        socket.on('video-pause', async (data) => {
            await this._handleVideoEvent(socket, io, 'pause', data);
        });

        socket.on('video-seek', async (data) => {
            await this._handleVideoEvent(socket, io, 'seek', data);
        });

        // Sincronização manual
        socket.on('request-sync', async (data) => {
            try {
                const { roomId } = data;
                
                if (!roomId || socket.currentRoomId !== roomId) {
                    return socket.emit('error', { message: 'Not in the specified room' });
                }

                const syncData = await this.streamingService.syncNewParticipant(roomId, socket.userId);
                socket.emit('sync-response', syncData);

            } catch (error) {
                console.error('Error handling sync request:', error);
                socket.emit('error', { message: error.message });
            }
        });

        // Heartbeat para manter conexão ativa
        socket.on('heartbeat', () => {
            socket.emit('heartbeat-response', { timestamp: Date.now() });
        });

        // Desconexão
        socket.on('disconnect', async (reason) => {
            try {
                if (socket.currentRoomId) {
                    // Log do evento de saída
                    await this.roomStateRepository.logEvent({
                        roomId: socket.currentRoomId,
                        userId: socket.userId,
                        eventType: 'leave',
                        eventData: { 
                            reason,
                            timestamp: Date.now()
                        }
                    });

                    // Notifica outros participantes
                    socket.to(socket.currentRoomId).emit('user-left', {
                        user: socket.user,
                        reason,
                        timestamp: Date.now()
                    });
                }

                console.log(`User ${socket.user.username} disconnected: ${reason}`);

            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        });
    }

    async _handleVideoEvent(socket, io, eventType, data) {
        try {
            const { roomId, videoPosition, isPlaying, videoDuration, eventData } = data;

            if (!roomId || socket.currentRoomId !== roomId) {
                return socket.emit('error', { message: 'Not in the specified room' });
            }

            // Atualiza o estado da sala
            const updatedState = await this.streamingService.updateRoomState(
                roomId,
                socket.userId,
                {
                    eventType,
                    videoPosition: videoPosition || 0,
                    isPlaying: isPlaying || false,
                    videoDuration,
                    eventData
                }
            );

            // Emite o evento para todos os participantes da sala (exceto o remetente)
            socket.to(roomId).emit(`video-${eventType}`, {
                videoPosition: updatedState.videoPosition,
                isPlaying: updatedState.isPlaying,
                videoDuration: updatedState.videoDuration,
                user: socket.user,
                timestamp: Date.now(),
                ...eventData
            });

            // Confirma para o remetente
            socket.emit('event-confirmed', {
                eventType,
                timestamp: Date.now(),
                state: updatedState
            });

        } catch (error) {
            console.error(`Error handling ${eventType} event:`, error);
            socket.emit('error', { message: error.message });
        }
    }

    destroy() {
        if (this.resetInterval) {
            clearInterval(this.resetInterval);
        }
    }
}

module.exports = RoomHandler;
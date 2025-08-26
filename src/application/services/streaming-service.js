const axios = require('axios');

class StreamingService {
    constructor(roomStateRepository, roomRepository) {
        this.roomStateRepository = roomStateRepository;
        this.roomRepository = roomRepository;
        this.syncTimeouts = new Map(); // Para debouncing
    }

    async getRoomState(roomId, userId) {
        // Verifica se o usuário tem acesso à sala
        await this._ensureRoomAccess(roomId, userId);
        
        let state = await this.roomStateRepository.findByRoomId(roomId);
        
        // Se não existe estado, cria um inicial
        if (!state) {
            state = await this.roomStateRepository.upsert({
                roomId,
                videoPosition: 0,
                isPlaying: false,
                updatedBy: userId
            });
        }

        return state;
    }

    async updateRoomState(roomId, userId, stateUpdate) {
        // Verifica acesso
        await this._ensureRoomAccess(roomId, userId);

        // Aplica debouncing para seeks frequentes
        if (stateUpdate.eventType === 'seek') {
            return this._debouncedSeek(roomId, userId, stateUpdate);
        }

        const updatedState = await this.roomStateRepository.upsert({
            roomId,
            videoPosition: stateUpdate.videoPosition,
            isPlaying: stateUpdate.isPlaying,
            videoDuration: stateUpdate.videoDuration,
            updatedBy: userId
        });

        // Log do evento
        await this.roomStateRepository.logEvent({
            roomId,
            userId,
            eventType: stateUpdate.eventType,
            eventData: {
                position: stateUpdate.videoPosition,
                isPlaying: stateUpdate.isPlaying,
                ...stateUpdate.eventData
            }
        });

        return updatedState;
    }

    async syncNewParticipant(roomId, userId) {
        const state = await this.getRoomState(roomId, userId);
        
        // Calcula posição atual baseada no tempo decorrido
        let currentPosition = state.videoPosition;
        if (state.isPlaying && state.lastUpdated) {
            const timeDiff = (Date.now() - new Date(state.lastUpdated)) / 1000;
            currentPosition = Math.max(0, state.videoPosition + timeDiff);
        }

        // Log do evento de entrada
        await this.roomStateRepository.logEvent({
            roomId,
            userId,
            eventType: 'join',
            eventData: { syncPosition: currentPosition }
        });

        return {
            ...state,
            videoPosition: currentPosition,
            syncTimestamp: Date.now()
        };
    }

    async validateStreamUrl(url, type) {
        if (type === 'YOUTUBE_LINK') {
            return this._validateYouTubeUrl(url);
        } else {
            return this._validateExternalUrl(url);
        }
    }

    async getVideoMetadata(url, type) {
        if (type === 'YOUTUBE_LINK') {
            return this._getYouTubeMetadata(url);
        } else {
            return this._getExternalMetadata(url);
        }
    }

    async _debouncedSeek(roomId, userId, stateUpdate) {
        // Cancela timeout anterior se existir
        if (this.syncTimeouts.has(roomId)) {
            clearTimeout(this.syncTimeouts.get(roomId));
        }

        return new Promise((resolve) => {
            const timeout = setTimeout(async () => {
                const updatedState = await this.roomStateRepository.upsert({
                    roomId,
                    videoPosition: stateUpdate.videoPosition,
                    isPlaying: stateUpdate.isPlaying,
                    videoDuration: stateUpdate.videoDuration,
                    updatedBy: userId
                });

                await this.roomStateRepository.logEvent({
                    roomId,
                    userId,
                    eventType: 'seek',
                    eventData: {
                        fromPosition: stateUpdate.eventData?.fromPosition,
                        toPosition: stateUpdate.videoPosition
                    }
                });

                this.syncTimeouts.delete(roomId);
                resolve(updatedState);
            }, 500); // 500ms de debounce

            this.syncTimeouts.set(roomId, timeout);
        });
    }

    async _ensureRoomAccess(roomId, userId) {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Host sempre tem acesso
        if (room.hostId === userId) {
            return true;
        }

        // Para salas públicas, qualquer usuário autenticado pode acessar
        if (!room.isPrivate) {
            return true;
        }

        // Para salas privadas, verifica se é participante
        const participation = await this.roomRepository.findUserParticipation(roomId, userId);
        if (!participation || !participation.isActive) {
            throw new Error('Access denied to room');
        }

        return true;
    }

    _validateYouTubeUrl(url) {
        const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/;
        const match = url.match(youtubeRegex);
        
        if (!match) {
            throw new Error('Invalid YouTube URL format');
        }

        return {
            isValid: true,
            videoId: match[4],
            embedUrl: `https://www.youtube.com/embed/${match[4]}`,
            originalUrl: url
        };
    }

    async _validateExternalUrl(url) {
        try {
            const response = await axios.head(url, {
                timeout: 5000,
                maxRedirects: 3
            });

            const contentType = response.headers['content-type'] || '';
            const isVideo = contentType.startsWith('video/') || 
                          url.match(/\.(mp4|webm|ogg|avi|mov)(\?.*)?$/i);

            return {
                isValid: true,
                contentType,
                isVideo,
                needsProxy: url.startsWith('http://'),
                originalUrl: url
            };
        } catch (error) {
            throw new Error(`Unable to validate external URL: ${error.message}`);
        }
    }

    async _getYouTubeMetadata(url) {
        const validation = this._validateYouTubeUrl(url);
        
        return {
            type: 'YOUTUBE_LINK',
            videoId: validation.videoId,
            embedUrl: validation.embedUrl,
            title: `YouTube Video ${validation.videoId}`,
            duration: null
        };
    }

    async _getExternalMetadata(url) {
        const validation = await this._validateExternalUrl(url);
        
        return {
            type: 'EXTERNAL_LINK',
            originalUrl: url,
            contentType: validation.contentType,
            needsProxy: validation.needsProxy,
            isVideo: validation.isVideo,
            title: url.split('/').pop() || 'External Content'
        };
    }
}

module.exports = StreamingService;
const StreamingService = require('../../application/services/streaming-service');
const ProxyService = require('../../application/services/proxy-service');
const SupabaseRoomStateRepository = require('../../domain/repositories/supabase-room-state-repository');
const SupabaseRoomRepository = require('../../infrastructure/repositories/supabase-room-repository');
const ResponseUtils = require('../../shared/utils/response-utils');

class StreamingController {
    constructor() {
        this.roomStateRepository = new SupabaseRoomStateRepository();
        this.roomRepository = new SupabaseRoomRepository();
        this.streamingService = new StreamingService(this.roomStateRepository, this.roomRepository);
        this.proxyService = new ProxyService();
    }

    async getRoomState(req, res) {
        try {
            const { roomId } = req.params;
            const state = await this.streamingService.getRoomState(roomId, req.user.id);
            
            return ResponseUtils.success(
                res,
                state,
                'Room state retrieved successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }
            
            if (error.message === 'Access denied to room') {
                return ResponseUtils.forbidden(res, 'Access denied to room');
            }

            return ResponseUtils.error(res, 'Failed to retrieve room state');
        }
    }

    async updateRoomState(req, res) {
        try {
            const { roomId } = req.params;
            const stateUpdate = req.body;
            
            const updatedState = await this.streamingService.updateRoomState(
                roomId, 
                req.user.id, 
                stateUpdate
            );
            
            return ResponseUtils.success(
                res,
                updatedState,
                'Room state updated successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }
            
            if (error.message === 'Access denied to room') {
                return ResponseUtils.forbidden(res, 'Access denied to room');
            }

            return ResponseUtils.error(res, 'Failed to update room state');
        }
    }

    async syncParticipant(req, res) {
        try {
            const { roomId } = req.params;
            const syncData = await this.streamingService.syncNewParticipant(roomId, req.user.id);
            
            return ResponseUtils.success(
                res,
                syncData,
                'Participant synchronized successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }
            
            if (error.message === 'Access denied to room') {
                return ResponseUtils.forbidden(res, 'Access denied to room');
            }

            return ResponseUtils.error(res, 'Failed to sync participant');
        }
    }

    async validateStreamUrl(req, res) {
        try {
            const { url, type } = req.body;
            const validation = await this.streamingService.validateStreamUrl(url, type);
            
            return ResponseUtils.success(
                res,
                validation,
                'Stream URL validated successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, error.message, 400);
        }
    }

    async getVideoMetadata(req, res) {
        try {
            const { url, type } = req.query;
            const metadata = await this.streamingService.getVideoMetadata(url, type);
            
            return ResponseUtils.success(
                res,
                metadata,
                'Video metadata retrieved successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, error.message, 400);
        }
    }

    async proxyStream(req, res) {
        try {
            const { url } = req.query;
            
            if (!url) {
                return ResponseUtils.error(res, 'Missing URL parameter', 400);
            }

            // Valida URL para proxy
            await this.proxyService.validateProxyUrl(url);
            
            // Cria e executa o proxy
            const proxyMiddleware = this.proxyService.createHttpProxy();
            proxyMiddleware(req, res);
            
        } catch (error) {
            return ResponseUtils.error(res, error.message, 400);
        }
    }

    async getStreamingEvents(req, res) {
        try {
            const { roomId } = req.params;
            const { limit = 50 } = req.query;
            
            // Verifica acesso à sala
            await this.streamingService._ensureRoomAccess(roomId, req.user.id);
            
            const events = await this.roomStateRepository.getRecentEvents(roomId, limit);
            
            return ResponseUtils.success(
                res,
                { events },
                'Streaming events retrieved successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }
            
            if (error.message === 'Access denied to room') {
                return ResponseUtils.forbidden(res, 'Access denied to room');
            }

            return ResponseUtils.error(res, 'Failed to retrieve streaming events');
        }
    }
}

module.exports = StreamingController;
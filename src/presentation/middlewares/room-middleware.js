const ResponseUtils = require('../../shared/utils/response-utils');
const SupabaseRoomRepository = require('../../infrastructure/repositories/supabase-room-repository');

const roomRepository = new SupabaseRoomRepository();

const ensureRoomHost = async (req, res, next) => {
    try {
        const { id: roomId } = req.params;
        const userId = req.user.id;

        const room = await roomRepository.findById(roomId);
        if (!room) {
            return ResponseUtils.notFound(res, 'Room not found');
        }

        if (room.hostId !== userId) {
            return ResponseUtils.forbidden(res, 'Only room host can perform this action');
        }

        req.room = room;
        next();
    } catch (error) {
        return ResponseUtils.error(res, 'Error validating room host');
    }
};

const ensureRoomExists = async (req, res, next) => {
    try {
        const { id: roomId } = req.params;

        const room = await roomRepository.findById(roomId);
        if (!room) {
            return ResponseUtils.notFound(res, 'Room not found');
        }

        req.room = room;
        next();
    } catch (error) {
        return ResponseUtils.error(res, 'Error validating room existence');
    }
};

const ensureRoomAccess = async (req, res, next) => {
    try {
        const { id: roomId } = req.params;
        const userId = req.user.id;

        const room = await roomRepository.findById(roomId);
        if (!room) {
            return ResponseUtils.notFound(res, 'Room not found');
        }

        // Host sempre tem acesso
        if (room.hostId === userId) {
            req.room = room;
            return next();
        }

        // Salas públicas são acessíveis
        if (!room.isPrivate) {
            req.room = room;
            return next();
        }

        // Para salas privadas, verifica se é participante
        const participation = await roomRepository.findUserParticipation(roomId, userId);
        if (!participation || !participation.isActive) {
            return ResponseUtils.forbidden(res, 'Access denied to private room');
        }

        req.room = room;
        next();
    } catch (error) {
        return ResponseUtils.error(res, 'Error validating room access');
    }
};

module.exports = {
    ensureRoomHost,
    ensureRoomExists,
    ensureRoomAccess
};
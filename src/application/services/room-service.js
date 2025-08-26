const PasswordUtils = require('../../shared/utils/password-utils');

class RoomService {
    constructor(roomRepository) {
        this.roomRepository = roomRepository;
    }

    async createRoom(roomData, hostId) {
        // Valida URL baseada no tipo
        this._validateStreamUrl(roomData.streamUrl, roomData.type);

        // Hash da senha se a sala for privada
        let passwordHash = null;
        if (roomData.isPrivate && roomData.password) {
            passwordHash = await PasswordUtils.hash(roomData.password);
        }

        const room = await this.roomRepository.create({
            name: roomData.name,
            description: roomData.description,
            type: roomData.type,
            streamUrl: roomData.streamUrl,
            maxParticipants: roomData.maxParticipants,
            isPrivate: roomData.isPrivate,
            passwordHash,
            hostId
        });

        // Remove dados sensíveis da resposta
        const { passwordHash: _, ...safeRoom } = room;
        return safeRoom;
    }

    async getRoomById(roomId, userId = null) {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Se a sala é privada, verifica se o usuário tem acesso
        if (room.isPrivate && userId) {
            const hasAccess = await this._userHasRoomAccess(roomId, userId);
            if (!hasAccess) {
                throw new Error('Access denied to private room');
            }
        }

        // Remove dados sensíveis
        const { passwordHash: _, ...safeRoom } = room;
        return safeRoom;
    }

    async getPublicRooms(limit = 20, offset = 0) {
        return await this.roomRepository.findPublicRooms(limit, offset);
    }

    async getUserRooms(userId, limit = 20, offset = 0) {
        return await this.roomRepository.getUserRooms(userId, limit, offset);
    }

    async getHostRooms(hostId, includeInactive = false) {
        return await this.roomRepository.findByHostId(hostId, includeInactive);
    }

    async updateRoom(roomId, updateData, hostId) {
        // Verifica se o usuário é o host
        await this._ensureUserIsHost(roomId, hostId);

        // Valida nova URL se fornecida
        if (updateData.streamUrl) {
            const room = await this.roomRepository.findById(roomId);
            this._validateStreamUrl(updateData.streamUrl, room.type);
        }

        // Hash da nova senha se fornecida
        if (updateData.isPrivate !== undefined) {
            if (updateData.isPrivate && updateData.password) {
                updateData.passwordHash = await PasswordUtils.hash(updateData.password);
            } else if (!updateData.isPrivate) {
                updateData.passwordHash = null;
            }
        }

        const updatedRoom = await this.roomRepository.update(roomId, updateData);
        if (!updatedRoom) {
            throw new Error('Room not found');
        }

        // Remove dados sensíveis
        const { passwordHash: _, ...safeRoom } = updatedRoom;
        return safeRoom;
    }

    async deleteRoom(roomId, hostId) {
        await this._ensureUserIsHost(roomId, hostId);
        return await this.roomRepository.delete(roomId);
    }

    async joinRoom(roomId, userId, password = null) {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        // Verifica senha se a sala for privada
        if (room.isPrivate) {
            if (!password) {
                throw new Error('Password required for private room');
            }

            if (room.passwordHash) {
                const isValidPassword = await PasswordUtils.compare(password, room.passwordHash);
                if (!isValidPassword) {
                    throw new Error('Invalid room password');
                }
            }
        }

        return await this.roomRepository.addParticipant(roomId, userId);
    }

    async leaveRoom(roomId, userId) {
        return await this.roomRepository.removeParticipant(roomId, userId);
    }

    async removeParticipant(roomId, participantId, hostId) {
        // Verifica se o usuário é o host
        await this._ensureUserIsHost(roomId, hostId);

        // Host não pode remover a si mesmo
        if (participantId === hostId) {
            throw new Error('Host cannot remove themselves from room');
        }

        return await this.roomRepository.removeParticipant(roomId, participantId);
    }

    async getRoomParticipants(roomId, userId) {
        // Verifica se o usuário tem acesso à sala
        const hasAccess = await this._userHasRoomAccess(roomId, userId);
        if (!hasAccess) {
            throw new Error('Access denied');
        }

        return await this.roomRepository.findParticipants(roomId);
    }

    async _ensureUserIsHost(roomId, userId) {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            throw new Error('Room not found');
        }

        if (room.hostId !== userId) {
            throw new Error('Only room host can perform this action');
        }
    }

    async _userHasRoomAccess(roomId, userId) {
        const room = await this.roomRepository.findById(roomId);
        if (!room) {
            return false;
        }

        // Host sempre tem acesso
        if (room.hostId === userId) {
            return true;
        }

        // Salas públicas são acessíveis a todos
        if (!room.isPrivate) {
            return true;
        }

        // Para salas privadas, verifica se é participante
        const participation = await this.roomRepository.findUserParticipation(roomId, userId);
        return participation && participation.isActive;
    }

    _validateStreamUrl(url, type) {
        if (type === 'YOUTUBE_LINK') {
            const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)/;
            if (!youtubeRegex.test(url)) {
                throw new Error('Invalid YouTube URL format');
            }
        } else if (type === 'EXTERNAL_LINK') {
            try {
                new URL(url);
            } catch {
                throw new Error('Invalid URL format');
            }
        }
    }
}

module.exports = RoomService;
/**
 * Interface do repositório de salas
 * Define os contratos que devem ser implementados pela camada de infraestrutura
 */
class RoomRepository {
    // CRUD básico de salas
    async create(roomData) {
        throw new Error('Method not implemented');
    }

    async findById(id) {
        throw new Error('Method not implemented');
    }

    async findByHostId(hostId, includeInactive = false) {
        throw new Error('Method not implemented');
    }

    async findPublicRooms(limit = 20, offset = 0) {
        throw new Error('Method not implemented');
    }

    async update(id, roomData) {
        throw new Error('Method not implemented');
    }

    async delete(id) {
        throw new Error('Method not implemented');
    }

    // Gerenciamento de participantes
    async addParticipant(roomId, userId) {
        throw new Error('Method not implemented');
    }

    async removeParticipant(roomId, userId) {
        throw new Error('Method not implemented');
    }

    async findParticipants(roomId) {
        throw new Error('Method not implemented');
    }

    async findUserParticipation(roomId, userId) {
        throw new Error('Method not implemented');
    }

    async getUserRooms(userId, limit = 20, offset = 0) {
        throw new Error('Method not implemented');
    }
}

module.exports = RoomRepository;
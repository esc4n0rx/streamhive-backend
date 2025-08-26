const RoomService = require('../../application/services/room-service');
const SupabaseRoomRepository = require('../../infrastructure/repositories/supabase-room-repository');
const ResponseUtils = require('../../shared/utils/response-utils');

class RoomController {
    constructor() {
        this.roomRepository = new SupabaseRoomRepository();
        this.roomService = new RoomService(this.roomRepository);
    }

    async createRoom(req, res) {
        try {
            const room = await this.roomService.createRoom(req.body, req.user.id);
            
            return ResponseUtils.success(
                res,
                room,
                'Room created successfully',
                201
            );
        } catch (error) {
            if (error.message.includes('Invalid') || error.message.includes('URL')) {
                return ResponseUtils.error(res, error.message, 400);
            }

            return ResponseUtils.error(res, 'Failed to create room');
        }
    }

    async getRooms(req, res) {
        try {
            const { limit, offset } = req.query;
            const rooms = await this.roomService.getPublicRooms(limit, offset);
            
            return ResponseUtils.success(
                res,
                { 
                    rooms,
                    pagination: {
                        limit,
                        offset,
                        total: rooms.length
                    }
                },
                'Rooms retrieved successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, 'Failed to retrieve rooms');
        }
    }

    async getRoomById(req, res) {
        try {
            const { id } = req.params;
            const room = await this.roomService.getRoomById(id, req.user.id);
            
            return ResponseUtils.success(
                res,
                room,
                'Room retrieved successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }

            if (error.message === 'Access denied to private room') {
                return ResponseUtils.forbidden(res, 'Access denied to private room');
            }

            return ResponseUtils.error(res, 'Failed to retrieve room');
        }
    }

    async getMyRooms(req, res) {
        try {
            const { limit, offset } = req.query;
            const rooms = await this.roomService.getHostRooms(req.user.id);
            
            return ResponseUtils.success(
                res,
                { 
                    rooms,
                    pagination: {
                        limit,
                        offset,
                        total: rooms.length
                    }
                },
                'My rooms retrieved successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, 'Failed to retrieve your rooms');
        }
    }

    async getJoinedRooms(req, res) {
        try {
            const { limit, offset } = req.query;
            const rooms = await this.roomService.getUserRooms(req.user.id, limit, offset);
            
            return ResponseUtils.success(
                res,
                { 
                    rooms,
                    pagination: {
                        limit,
                        offset,
                        total: rooms.length
                    }
                },
                'Joined rooms retrieved successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, 'Failed to retrieve joined rooms');
        }
    }

    async updateRoom(req, res) {
        try {
            const { id } = req.params;
            const updatedRoom = await this.roomService.updateRoom(id, req.body, req.user.id);
            
            return ResponseUtils.success(
                res,
                updatedRoom,
                'Room updated successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }

            if (error.message === 'Only room host can perform this action') {
                return ResponseUtils.forbidden(res, 'Only room host can update room');
            }

            if (error.message.includes('Invalid') || error.message.includes('URL')) {
                return ResponseUtils.error(res, error.message, 400);
            }

            return ResponseUtils.error(res, 'Failed to update room');
        }
    }

    async deleteRoom(req, res) {
        try {
            const { id } = req.params;
            await this.roomService.deleteRoom(id, req.user.id);
            
            return ResponseUtils.success(
                res,
                null,
                'Room deleted successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }

            if (error.message === 'Only room host can perform this action') {
                return ResponseUtils.forbidden(res, 'Only room host can delete room');
            }

            return ResponseUtils.error(res, 'Failed to delete room');
        }
    }

    async joinRoom(req, res) {
        try {
            const { id } = req.params;
            const { password } = req.body;
            
            const participant = await this.roomService.joinRoom(id, req.user.id, password);
            
            return ResponseUtils.success(
                res,
                participant,
                'Successfully joined room'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }

            if (error.message.includes('Password') || error.message.includes('password')) {
                return ResponseUtils.error(res, error.message, 400);
            }

            if (error.message === 'Room is full') {
                return ResponseUtils.error(res, 'Room is full', 400);
            }

            if (error.message === 'User already in room') {
                return ResponseUtils.conflict(res, 'You are already in this room');
            }

            return ResponseUtils.error(res, 'Failed to join room');
        }
    }

    async leaveRoom(req, res) {
        try {
            const { id } = req.params;
            await this.roomService.leaveRoom(id, req.user.id);
            
            return ResponseUtils.success(
                res,
                null,
                'Successfully left room'
            );
        } catch (error) {
            return ResponseUtils.error(res, 'Failed to leave room');
        }
    }

    async getRoomParticipants(req, res) {
        try {
            const { id } = req.params;
            const participants = await this.roomService.getRoomParticipants(id, req.user.id);
            
            return ResponseUtils.success(
                res,
                { participants },
                'Room participants retrieved successfully'
            );
        } catch (error) {
            if (error.message === 'Access denied') {
                return ResponseUtils.forbidden(res, 'Access denied');
            }

            return ResponseUtils.error(res, 'Failed to retrieve room participants');
        }
    }

    async removeParticipant(req, res) {
        try {
            const { id, participantId } = req.params;
            await this.roomService.removeParticipant(id, participantId, req.user.id);
            
            return ResponseUtils.success(
                res,
                null,
                'Participant removed successfully'
            );
        } catch (error) {
            if (error.message === 'Room not found') {
                return ResponseUtils.notFound(res, 'Room not found');
            }

            if (error.message === 'Only room host can perform this action') {
                return ResponseUtils.forbidden(res, 'Only room host can remove participants');
            }

            if (error.message === 'Host cannot remove themselves from room') {
                return ResponseUtils.error(res, 'Host cannot remove themselves from room', 400);
            }

            return ResponseUtils.error(res, 'Failed to remove participant');
        }
    }
}

module.exports = RoomController;
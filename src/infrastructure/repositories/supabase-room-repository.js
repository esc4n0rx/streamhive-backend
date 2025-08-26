const RoomRepository = require('../../domain/repositories/room-repository');
const supabase = require('../../config/database');

class SupabaseRoomRepository extends RoomRepository {
    async create(roomData) {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .insert([{
                    name: roomData.name,
                    description: roomData.description,
                    type: roomData.type,
                    stream_url: roomData.streamUrl,
                    max_participants: roomData.maxParticipants,
                    is_private: roomData.isPrivate,
                    password_hash: roomData.passwordHash,
                    host_id: roomData.hostId
                }])
                .select(`
                    id, name, description, type, stream_url, max_participants,
                    is_private, host_id, current_participants, created_at,
                    host:users!host_id(id, name, username)
                `)
                .single();

            if (error) {
                throw error;
            }

            return this._mapRoomFromDB(data);
        } catch (error) {
            throw new Error(`Error creating room: ${error.message}`);
        }
    }

    async findById(id) {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    id, name, description, type, stream_url, max_participants,
                    is_private, host_id, current_participants, created_at, updated_at,
                    host:users!host_id(id, name, username, avatar_url)
                `)
                .eq('id', id)
                .eq('is_active', true)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data ? this._mapRoomFromDB(data) : null;
        } catch (error) {
            throw new Error(`Error finding room by ID: ${error.message}`);
        }
    }

    async findByHostId(hostId, includeInactive = false) {
        try {
            let query = supabase
                .from('rooms')
                .select(`
                    id, name, description, type, stream_url, max_participants,
                    is_private, host_id, current_participants, created_at, updated_at
                `)
                .eq('host_id', hostId)
                .order('created_at', { ascending: false });

            if (!includeInactive) {
                query = query.eq('is_active', true);
            }

            const { data, error } = await query;

            if (error) {
                throw error;
            }

            return data.map(room => this._mapRoomFromDB(room));
        } catch (error) {
            throw new Error(`Error finding rooms by host: ${error.message}`);
        }
    }

    async findPublicRooms(limit = 20, offset = 0) {
        try {
            const { data, error } = await supabase
                .from('rooms')
                .select(`
                    id, name, description, type, max_participants, current_participants,
                    created_at, host:users!host_id(id, name, username, avatar_url)
                `)
                .eq('is_active', true)
                .eq('is_private', false)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return data.map(room => this._mapRoomFromDB(room));
        } catch (error) {
            throw new Error(`Error finding public rooms: ${error.message}`);
        }
    }

    async update(id, roomData) {
        try {
            const updateData = {};
            
            if (roomData.name) updateData.name = roomData.name;
            if (roomData.description !== undefined) updateData.description = roomData.description;
            if (roomData.streamUrl) updateData.stream_url = roomData.streamUrl;
            if (roomData.maxParticipants) updateData.max_participants = roomData.maxParticipants;
            if (roomData.isPrivate !== undefined) updateData.is_private = roomData.isPrivate;
            if (roomData.passwordHash !== undefined) updateData.password_hash = roomData.passwordHash;

            const { data, error } = await supabase
                .from('rooms')
                .update(updateData)
                .eq('id', id)
                .eq('is_active', true)
                .select(`
                    id, name, description, type, stream_url, max_participants,
                    is_private, host_id, current_participants, updated_at,
                    host:users!host_id(id, name, username, avatar_url)
                `)
                .single();

            if (error) {
                throw error;
            }

            return this._mapRoomFromDB(data);
        } catch (error) {
            throw new Error(`Error updating room: ${error.message}`);
        }
    }

    async delete(id) {
        try {
            const { error } = await supabase
                .from('rooms')
                .update({ is_active: false })
                .eq('id', id);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            throw new Error(`Error deleting room: ${error.message}`);
        }
    }

    async addParticipant(roomId, userId) {
        try {
            // Verifica se a sala existe e tem espaço
            const room = await this.findById(roomId);
            if (!room) {
                throw new Error('Room not found');
            }

            if (room.currentParticipants >= room.maxParticipants) {
                throw new Error('Room is full');
            }

            // Verifica se o usuário já está na sala
            const existingParticipation = await this.findUserParticipation(roomId, userId);
            if (existingParticipation && existingParticipation.isActive) {
                throw new Error('User already in room');
            }

            let result;
            if (existingParticipation) {
                // Reativa participação existente
                const { data, error } = await supabase
                    .from('room_participants')
                    .update({ is_active: true })
                    .eq('room_id', roomId)
                    .eq('user_id', userId)
                    .select(`
                        id, room_id, user_id, joined_at, is_active,
                        user:users!user_id(id, name, username, avatar_url)
                    `)
                    .single();

                if (error) throw error;
                result = data;
            } else {
                // Cria nova participação
                const { data, error } = await supabase
                    .from('room_participants')
                    .insert([{
                        room_id: roomId,
                        user_id: userId
                    }])
                    .select(`
                        id, room_id, user_id, joined_at, is_active,
                        user:users!user_id(id, name, username, avatar_url)
                    `)
                    .single();

                if (error) throw error;
                result = data;
            }

            return this._mapParticipantFromDB(result);
        } catch (error) {
            throw new Error(`Error adding participant: ${error.message}`);
        }
    }

    async removeParticipant(roomId, userId) {
        try {
            const { error } = await supabase
                .from('room_participants')
                .update({ is_active: false })
                .eq('room_id', roomId)
                .eq('user_id', userId);

            if (error) {
                throw error;
            }

            return true;
        } catch (error) {
            throw new Error(`Error removing participant: ${error.message}`);
        }
    }

    async findParticipants(roomId) {
        try {
            const { data, error } = await supabase
                .from('room_participants')
                .select(`
                    id, room_id, user_id, joined_at, is_active,
                    user:users!user_id(id, name, username, avatar_url)
                `)
                .eq('room_id', roomId)
                .eq('is_active', true)
                .order('joined_at', { ascending: true });

            if (error) {
                throw error;
            }

            return data.map(participant => this._mapParticipantFromDB(participant));
        } catch (error) {
            throw new Error(`Error finding participants: ${error.message}`);
        }
    }

    async findUserParticipation(roomId, userId) {
        try {
            const { data, error } = await supabase
                .from('room_participants')
                .select('id, room_id, user_id, joined_at, is_active')
                .eq('room_id', roomId)
                .eq('user_id', userId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data ? {
                id: data.id,
                roomId: data.room_id,
                userId: data.user_id,
                joinedAt: data.joined_at,
                isActive: data.is_active
            } : null;
        } catch (error) {
            throw new Error(`Error finding user participation: ${error.message}`);
        }
    }

    async getUserRooms(userId, limit = 20, offset = 0) {
        try {
            const { data, error } = await supabase
                .from('room_participants')
                .select(`
                    room:rooms!room_id(
                        id, name, description, type, max_participants, current_participants,
                        created_at, host:users!host_id(id, name, username, avatar_url)
                    )
                `)
                .eq('user_id', userId)
                .eq('is_active', true)
                .order('joined_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw error;
            }

            return data
                .filter(item => item.room && item.room.id)
                .map(item => this._mapRoomFromDB(item.room));
        } catch (error) {
            throw new Error(`Error finding user rooms: ${error.message}`);
        }
    }

    _mapRoomFromDB(roomData) {
        return {
            id: roomData.id,
            name: roomData.name,
            description: roomData.description,
            type: roomData.type,
            streamUrl: roomData.stream_url,
            maxParticipants: roomData.max_participants,
            isPrivate: roomData.is_private,
            hostId: roomData.host_id,
            currentParticipants: roomData.current_participants,
            createdAt: roomData.created_at,
            updatedAt: roomData.updated_at,
            host: roomData.host ? {
                id: roomData.host.id,
                name: roomData.host.name,
                username: roomData.host.username,
                avatarUrl: roomData.host.avatar_url
            } : undefined
        };
    }

    _mapParticipantFromDB(participantData) {
        return {
            id: participantData.id,
            roomId: participantData.room_id,
            userId: participantData.user_id,
            joinedAt: participantData.joined_at,
            isActive: participantData.is_active,
            user: participantData.user ? {
                id: participantData.user.id,
                name: participantData.user.name,
                username: participantData.user.username,
                avatarUrl: participantData.user.avatar_url
            } : undefined
        };
    }
}

module.exports = SupabaseRoomRepository;
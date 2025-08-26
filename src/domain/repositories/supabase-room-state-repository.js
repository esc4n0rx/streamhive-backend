const supabase = require('../../config/database');

class SupabaseRoomStateRepository {
    async findByRoomId(roomId) {
        try {
            const { data, error } = await supabase
                .from('room_streaming_state')
                .select('*')
                .eq('room_id', roomId)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data ? this._mapFromDB(data) : null;
        } catch (error) {
            throw new Error(`Error finding room state: ${error.message}`);
        }
    }

    async upsert(stateData) {
        try {
            const { data, error } = await supabase
                .from('room_streaming_state')
                .upsert({
                    room_id: stateData.roomId,
                    video_position: stateData.videoPosition,
                    is_playing: stateData.isPlaying,
                    video_duration: stateData.videoDuration,
                    updated_by: stateData.updatedBy
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return this._mapFromDB(data);
        } catch (error) {
            throw new Error(`Error upserting room state: ${error.message}`);
        }
    }

    async logEvent(eventData) {
        try {
            const { data, error } = await supabase
                .from('streaming_events')
                .insert({
                    room_id: eventData.roomId,
                    user_id: eventData.userId,
                    event_type: eventData.eventType,
                    event_data: eventData.eventData
                })
                .select()
                .single();

            if (error) {
                throw error;
            }

            return {
                id: data.id,
                roomId: data.room_id,
                userId: data.user_id,
                eventType: data.event_type,
                eventData: data.event_data,
                timestamp: data.timestamp
            };
        } catch (error) {
            throw new Error(`Error logging streaming event: ${error.message}`);
        }
    }

    async getRecentEvents(roomId, limit = 50) {
        try {
            const { data, error } = await supabase
                .from('streaming_events')
                .select(`
                    id, room_id, user_id, event_type, event_data, timestamp,
                    user:users!user_id(id, name, username)
                `)
                .eq('room_id', roomId)
                .order('timestamp', { ascending: false })
                .limit(limit);

            if (error) {
                throw error;
            }

            return data.map(event => ({
                id: event.id,
                roomId: event.room_id,
                userId: event.user_id,
                eventType: event.event_type,
                eventData: event.event_data,
                timestamp: event.timestamp,
                user: event.user
            }));
        } catch (error) {
            throw new Error(`Error getting recent events: ${error.message}`);
        }
    }

    _mapFromDB(data) {
        return {
            id: data.id,
            roomId: data.room_id,
            videoPosition: parseFloat(data.video_position),
            isPlaying: data.is_playing,
            videoDuration: data.video_duration ? parseFloat(data.video_duration) : null,
            lastUpdated: data.last_updated,
            updatedBy: data.updated_by
        };
    }
}

module.exports = SupabaseRoomStateRepository;
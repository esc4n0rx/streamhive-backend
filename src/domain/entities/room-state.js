const { z } = require('zod');

const RoomStreamingStateEntity = z.object({
    id: z.string().uuid().optional(),
    roomId: z.string().uuid(),
    videoPosition: z.number().min(0).default(0),
    isPlaying: z.boolean().default(false),
    videoDuration: z.number().min(0).optional(),
    lastUpdated: z.date().optional(),
    updatedBy: z.string().uuid().optional()
});

const StreamingEventEntity = z.object({
    id: z.string().uuid().optional(),
    roomId: z.string().uuid(),
    userId: z.string().uuid(),
    eventType: z.enum(['play', 'pause', 'seek', 'join', 'leave', 'sync']),
    eventData: z.record(z.any()).optional(),
    timestamp: z.date().optional()
});

module.exports = {
    RoomStreamingStateEntity,
    StreamingEventEntity
};
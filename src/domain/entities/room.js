const { z } = require('zod');

const RoomEntity = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(1).max(100),
    description: z.string().max(1000).optional(),
    type: z.enum(['YOUTUBE_LINK', 'EXTERNAL_LINK']),
    streamUrl: z.string().url(),
    maxParticipants: z.number().int().min(1).max(50),
    isPrivate: z.boolean().default(false),
    passwordHash: z.string().optional(),
    hostId: z.string().uuid(),
    currentParticipants: z.number().int().min(0).default(0),
    isActive: z.boolean().default(true),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

const RoomParticipantEntity = z.object({
    id: z.string().uuid().optional(),
    roomId: z.string().uuid(),
    userId: z.string().uuid(),
    joinedAt: z.date().optional(),
    isActive: z.boolean().default(true)
});

module.exports = {
    RoomEntity,
    RoomParticipantEntity
};
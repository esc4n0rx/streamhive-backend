const { z } = require('zod');

const createRoomSchema = z.object({
    body: z.object({
        name: z.string()
            .min(1, 'Room name is required')
            .max(100, 'Room name must not exceed 100 characters')
            .trim(),
        description: z.string()
            .max(1000, 'Description must not exceed 1000 characters')
            .trim()
            .optional(),
        type: z.enum(['YOUTUBE_LINK', 'EXTERNAL_LINK'], {
            errorMap: () => ({ message: 'Type must be either YOUTUBE_LINK or EXTERNAL_LINK' })
        }),
        streamUrl: z.string()
            .url('Invalid stream URL format')
            .max(2000, 'Stream URL too long'),
        maxParticipants: z.number()
            .int('Max participants must be an integer')
            .min(1, 'Max participants must be at least 1')
            .max(50, 'Max participants cannot exceed 50')
            .default(10),
        isPrivate: z.boolean().default(false),
        password: z.string()
            .min(4, 'Room password must be at least 4 characters')
            .max(50, 'Room password must not exceed 50 characters')
            .optional()
    }).refine((data) => {
       // Se não é privada, não deve ter senha
       if (!data.isPrivate && data.password) {
        return false;
    }
    return true;
}, {
    message: 'Private rooms require a password, public rooms cannot have a password',
    path: ['password']
})
});

const updateRoomSchema = z.object({
body: z.object({
    name: z.string()
        .min(1, 'Room name is required')
        .max(100, 'Room name must not exceed 100 characters')
        .trim()
        .optional(),
    description: z.string()
        .max(1000, 'Description must not exceed 1000 characters')
        .trim()
        .optional()
        .or(z.literal('')),
    streamUrl: z.string()
        .url('Invalid stream URL format')
        .max(2000, 'Stream URL too long')
        .optional(),
    maxParticipants: z.number()
        .int('Max participants must be an integer')
        .min(1, 'Max participants must be at least 1')
        .max(50, 'Max participants cannot exceed 50')
        .optional(),
    isPrivate: z.boolean().optional(),
    password: z.string()
        .min(4, 'Room password must be at least 4 characters')
        .max(50, 'Room password must not exceed 50 characters')
        .optional()
}).refine((data) => {
    // Se está definindo como privada, deve ter senha
    if (data.isPrivate === true && !data.password) {
        return false;
    }
    return true;
}, {
    message: 'Private rooms require a password',
    path: ['password']
})
});

const joinRoomSchema = z.object({
body: z.object({
    password: z.string()
        .max(50, 'Password too long')
        .optional()
})
});

const roomIdSchema = z.object({
params: z.object({
    id: z.string().uuid('Invalid room ID format')
})
});

const participantIdSchema = z.object({
params: z.object({
    id: z.string().uuid('Invalid room ID format'),
    participantId: z.string().uuid('Invalid participant ID format')
})
});

const paginationSchema = z.object({
query: z.object({
    limit: z.coerce.number()
        .int()
        .min(1)
        .max(100)
        .default(20),
    offset: z.coerce.number()
        .int()
        .min(0)
        .default(0)
})
});

module.exports = {
createRoomSchema,
updateRoomSchema,
joinRoomSchema,
roomIdSchema,
participantIdSchema,
paginationSchema
};
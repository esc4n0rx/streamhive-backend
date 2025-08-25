const { z } = require('zod');

const UserEntity = z.object({
    id: z.string().uuid().optional(),
    name: z.string().min(2).max(100),
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_]+$/),
    email: z.string().email(),
    passwordHash: z.string().optional(),
    birthDate: z.date(),
    avatarUrl: z.string().url().optional(),
    bio: z.string().max(500).optional(),
    isActive: z.boolean().default(true),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional()
});

module.exports = {
    UserEntity
};
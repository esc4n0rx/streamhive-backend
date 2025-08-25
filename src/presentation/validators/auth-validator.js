const { z } = require('zod');

const registerSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name must not exceed 100 characters')
            .trim(),
        username: z.string()
            .min(3, 'Username must be at least 3 characters')
            .max(50, 'Username must not exceed 50 characters')
            .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers and underscores')
            .trim()
            .toLowerCase(),
        email: z.string()
            .email('Invalid email format')
            .max(255, 'Email must not exceed 255 characters')
            .trim()
            .toLowerCase(),
        password: z.string()
            .min(8, 'Password must be at least 8 characters')
            .max(128, 'Password must not exceed 128 characters'),
        birthDate: z.string()
            .refine((date) => {
                const parsedDate = new Date(date);
                const today = new Date();
                const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
                const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
                
                return parsedDate <= minAge && parsedDate >= maxAge;
            }, 'You must be at least 13 years old and not older than 120 years'),
        bio: z.string()
            .max(500, 'Bio must not exceed 500 characters')
            .trim()
            .optional()
    })
});

const loginSchema = z.object({
    body: z.object({
        username: z.string()
            .min(1, 'Username is required')
            .trim()
            .toLowerCase(),
        password: z.string()
            .min(1, 'Password is required')
    })
});

const updateProfileSchema = z.object({
    body: z.object({
        name: z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name must not exceed 100 characters')
            .trim()
            .optional(),
        email: z.string()
            .email('Invalid email format')
            .max(255, 'Email must not exceed 255 characters')
            .trim()
            .toLowerCase()
            .optional(),
        birthDate: z.string()
            .refine((date) => {
                const parsedDate = new Date(date);
                const today = new Date();
                const minAge = new Date(today.getFullYear() - 13, today.getMonth(), today.getDate());
                const maxAge = new Date(today.getFullYear() - 120, today.getMonth(), today.getDate());
                
                return parsedDate <= minAge && parsedDate >= maxAge;
            }, 'You must be at least 13 years old and not older than 120 years')
            .optional(),
        avatarUrl: z.string()
            .url('Invalid avatar URL format')
            .optional()
            .or(z.literal('')),
        bio: z.string()
            .max(500, 'Bio must not exceed 500 characters')
            .trim()
            .optional()
            .or(z.literal(''))
    })
});

const changePasswordSchema = z.object({
    body: z.object({
        currentPassword: z.string()
            .min(1, 'Current password is required'),
        newPassword: z.string()
            .min(8, 'New password must be at least 8 characters')
            .max(128, 'New password must not exceed 128 characters')
    })
});

module.exports = {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema
};
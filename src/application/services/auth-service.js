const jwt = require('jsonwebtoken');
const PasswordUtils = require('../../shared/utils/password-utils');
const jwtConfig = require('../../config/jwt');

class AuthService {
    constructor(userRepository) {
        this.userRepository = userRepository;
    }

    async register(userData) {
        // Verifica se email já existe
        const existingEmail = await this.userRepository.findByEmail(userData.email);
        if (existingEmail) {
            throw new Error('Email already registered');
        }

        // Verifica se username já existe
        const existingUsername = await this.userRepository.findByUsername(userData.username);
        if (existingUsername) {
            throw new Error('Username already taken');
        }

        // Valida força da senha
        const passwordValidation = PasswordUtils.validateStrength(userData.password);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }

        // Hash da senha
        const passwordHash = await PasswordUtils.hash(userData.password);

        // Cria o usuário
        const user = await this.userRepository.create({
            name: userData.name,
            username: userData.username,
            email: userData.email,
            passwordHash,
            birthDate: new Date(userData.birthDate),
            bio: userData.bio || null
        });

        // Gera token JWT
        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                birthDate: user.birth_date,
                avatarUrl: user.avatar_url,
                bio: user.bio,
                createdAt: user.created_at
            },
            token
        };
    }

    async login(username, password) {
        // Busca usuário por username
        const user = await this.userRepository.findByUsername(username);
        if (!user) {
            throw new Error('Invalid credentials');
        }

        // Verifica senha
        const isValidPassword = await PasswordUtils.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Invalid credentials');
        }

        // Gera token JWT
        const token = this.generateToken(user.id);

        return {
            user: {
                id: user.id,
                name: user.name,
                username: user.username,
                email: user.email,
                birthDate: user.birth_date,
                avatarUrl: user.avatar_url,
                bio: user.bio
            },
            token
        };
    }

    async getProfile(userId) {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }

        return {
            id: user.id,
            name: user.name,
            username: user.username,
            email: user.email,
            birthDate: user.birth_date,
            avatarUrl: user.avatar_url,
            bio: user.bio,
            createdAt: user.created_at,
            updatedAt: user.updated_at
        };
    }

    async updateProfile(userId, updateData) {
        // Se email está sendo alterado, verifica se não existe
        if (updateData.email) {
            const existingEmail = await this.userRepository.findByEmail(updateData.email);
            if (existingEmail && existingEmail.id !== userId) {
                throw new Error('Email already in use');
            }
        }

        const updatedUser = await this.userRepository.update(userId, {
            name: updateData.name,
            email: updateData.email,
            birthDate: updateData.birthDate ? new Date(updateData.birthDate) : undefined,
            avatarUrl: updateData.avatarUrl,
            bio: updateData.bio
        });

        if (!updatedUser) {
            throw new Error('User not found');
        }

        return {
            id: updatedUser.id,
            name: updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            birthDate: updatedUser.birth_date,
            avatarUrl: updatedUser.avatar_url,
            bio: updatedUser.bio,
            updatedAt: updatedUser.updated_at
        };
    }

    async changePassword(userId, currentPassword, newPassword) {
        // Busca usuário atual
        const user = await this.userRepository.findByEmail((await this.userRepository.findById(userId)).email);
        if (!user) {
            throw new Error('User not found');
        }

        // Verifica senha atual
        const isValidPassword = await PasswordUtils.compare(currentPassword, user.password_hash);
        if (!isValidPassword) {
            throw new Error('Current password is incorrect');
        }

        // Valida nova senha
        const passwordValidation = PasswordUtils.validateStrength(newPassword);
        if (!passwordValidation.valid) {
            throw new Error(passwordValidation.message);
        }

        // Hash da nova senha
        const newPasswordHash = await PasswordUtils.hash(newPassword);

        // Atualiza senha
        await this.userRepository.update(userId, {
            passwordHash: newPasswordHash
        });

        return true;
    }

    generateToken(userId) {
        return jwt.sign(
            { userId },
            jwtConfig.secret,
            { expiresIn: jwtConfig.expiresIn }
        );
    }
}

module.exports = AuthService;
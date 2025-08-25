const AuthService = require('../../application/services/auth-service');
const SupabaseUserRepository = require('../../infrastructure/repositories/supabase-user-repository');
const ResponseUtils = require('../../shared/utils/response-utils');

class AuthController {
    constructor() {
        this.userRepository = new SupabaseUserRepository();
        this.authService = new AuthService(this.userRepository);
    }

    async register(req, res) {
        try {
            const result = await this.authService.register(req.body);
            
            return ResponseUtils.success(
                res, 
                result, 
                'User registered successfully', 
                201
            );
        } catch (error) {
            if (error.message.includes('already')) {
                return ResponseUtils.conflict(res, error.message);
            }
            
            if (error.message.includes('Password') || error.message.includes('password')) {
                return ResponseUtils.error(res, error.message, 400);
            }

            return ResponseUtils.error(res, 'Registration failed');
        }
    }

    async login(req, res) {
        try {
            const { username, password } = req.body;
            const result = await this.authService.login(username, password);
            
            return ResponseUtils.success(
                res, 
                result, 
                'Login successful'
            );
        } catch (error) {
            if (error.message === 'Invalid credentials') {
                return ResponseUtils.unauthorized(res, 'Invalid username or password');
            }

            return ResponseUtils.error(res, 'Login failed');
        }
    }

    async getProfile(req, res) {
        try {
            const profile = await this.authService.getProfile(req.user.id);
            
            return ResponseUtils.success(
                res, 
                profile, 
                'Profile retrieved successfully'
            );
        } catch (error) {
            if (error.message === 'User not found') {
                return ResponseUtils.notFound(res, 'User profile not found');
            }

            return ResponseUtils.error(res, 'Failed to retrieve profile');
        }
    }

    async updateProfile(req, res) {
        try {
            const updatedProfile = await this.authService.updateProfile(req.user.id, req.body);
            
            return ResponseUtils.success(
                res, 
                updatedProfile, 
                'Profile updated successfully'
            );
        } catch (error) {
            if (error.message === 'User not found') {
                return ResponseUtils.notFound(res, 'User not found');
            }
            
            if (error.message === 'Email already in use') {
                return ResponseUtils.conflict(res, error.message);
            }

            return ResponseUtils.error(res, 'Failed to update profile');
        }
    }

    async changePassword(req, res) {
        try {
            const { currentPassword, newPassword } = req.body;
            await this.authService.changePassword(req.user.id, currentPassword, newPassword);
            
            return ResponseUtils.success(
                res, 
                null, 
                'Password changed successfully'
            );
        } catch (error) {
            if (error.message === 'User not found') {
                return ResponseUtils.notFound(res, 'User not found');
            }
            
            if (error.message === 'Current password is incorrect') {
                return ResponseUtils.error(res, error.message, 400);
            }
            
            if (error.message.includes('Password') || error.message.includes('password')) {
                return ResponseUtils.error(res, error.message, 400);
            }

            return ResponseUtils.error(res, 'Failed to change password');
        }
    }

    async deleteAccount(req, res) {
        try {
            await this.userRepository.delete(req.user.id);
            
            return ResponseUtils.success(
                res, 
                null, 
                'Account deleted successfully'
            );
        } catch (error) {
            return ResponseUtils.error(res, 'Failed to delete account');
        }
    }
}

module.exports = AuthController;
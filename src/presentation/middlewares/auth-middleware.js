const jwt = require('jsonwebtoken');
const ResponseUtils = require('../../shared/utils/response-utils');
const jwtConfig = require('../../config/jwt');
const SupabaseUserRepository = require('../../infrastructure/repositories/supabase-user-repository');

const userRepository = new SupabaseUserRepository();

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return ResponseUtils.unauthorized(res, 'Access token is required');
        }

        const decoded = jwt.verify(token, jwtConfig.secret);
        
        // Verifica se o usuário ainda existe e está ativo
        const user = await userRepository.findById(decoded.userId);
        
        if (!user) {
            return ResponseUtils.unauthorized(res, 'Invalid token: user not found');
        }

        req.user = {
            id: user.id,
            username: user.username,
            email: user.email
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return ResponseUtils.unauthorized(res, 'Invalid token');
        }
        
        if (error.name === 'TokenExpiredError') {
            return ResponseUtils.unauthorized(res, 'Token expired');
        }

        return ResponseUtils.error(res, 'Authentication error occurred');
    }
};

module.exports = {
    authenticateToken
};
const jwt = require('jsonwebtoken');
const jwtConfig = require('../../../config/jwt');
const SupabaseUserRepository = require('../../repositories/supabase-user-repository');

const userRepository = new SupabaseUserRepository();

const socketAuth = async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || 
                      socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
            return next(new Error('Authentication token required'));
        }

        const decoded = jwt.verify(token, jwtConfig.secret);
        
        // Verifica se o usuário ainda existe e está ativo
        const user = await userRepository.findById(decoded.userId);
        
        if (!user) {
            return next(new Error('Invalid token: user not found'));
        }

        socket.userId = user.id;
        socket.user = {
            id: user.id,
            username: user.username,
            name: user.name
        };

        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return next(new Error('Invalid token'));
        }
        
        if (error.name === 'TokenExpiredError') {
            return next(new Error('Token expired'));
        }

        return next(new Error('Authentication failed'));
    }
};

module.exports = socketAuth;
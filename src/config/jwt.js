require('dotenv').config();

const jwtConfig = {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
};

if (!jwtConfig.secret) {
    throw new Error('JWT_SECRET is required in environment variables');
}

module.exports = jwtConfig;
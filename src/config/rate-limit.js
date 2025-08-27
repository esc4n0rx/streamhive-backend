const rateLimit = require('express-rate-limit');

// Configuração baseada no ambiente
const isProduction = process.env.NODE_ENV === 'production';

// Rate limiting geral
const createGeneralLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests por IP por janela
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Configurações específicas para produção com proxies
    ...(isProduction && {
        trustProxy: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
    })
});

// Rate limiting específico para auth
const createAuthLimiter = () => rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 tentativas de auth por IP por janela
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Configurações específicas para produção
    ...(isProduction && {
        trustProxy: true,
        skipSuccessfulRequests: true, // Não conta sucessos para auth
        skipFailedRequests: false,
    })
});

// Rate limiting específico para streaming
const createStreamingLimiter = () => rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 500, // máximo 500 requests de streaming por IP por janela
    message: {
        success: false,
        message: 'Too many streaming requests, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Configurações específicas para produção
    ...(isProduction && {
        trustProxy: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
    })
});

// Rate limiting específico para criação de salas (já existe no room-routes)
const createRoomCreationLimiter = () => rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: process.env.NODE_ENV === 'development' ? 50 : 10, // 50 em dev, 10 em prod
    message: {
        success: false,
        message: 'Too many rooms created, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    ...(isProduction && {
        trustProxy: true,
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
    })
});

module.exports = {
    generalLimiter: createGeneralLimiter(),
    authLimiter: createAuthLimiter(),
    streamingLimiter: createStreamingLimiter(),
    roomCreationLimiter: createRoomCreationLimiter()
};
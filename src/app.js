const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

// Middlewares
const { errorHandler, notFoundHandler } = require('./presentation/middlewares/error-middleware');

// Rate limiting configurado
const { generalLimiter, authLimiter, streamingLimiter } = require('./config/rate-limit');

// Routes
const authRoutes = require('./presentation/routes/auth-routes');
const roomRoutes = require('./presentation/routes/room-routes');
const streamingRoutes = require('./presentation/routes/streaming-routes');

const app = express();

// Configuração de trust proxy ANTES de qualquer middleware de rate limiting
// Isso é crucial para ambientes de produção com proxies/load balancers
if (process.env.NODE_ENV === 'production') {
    // Confia em todos os proxies - ajuste conforme sua infraestrutura
    app.set('trust proxy', true);
    
    // Alternativas mais específicas (descomente conforme necessário):
    // app.set('trust proxy', 1); // Confia apenas no primeiro proxy
    // app.set('trust proxy', ['127.0.0.1', '::1']); // IPs específicos
    // app.set('trust proxy', 'loopback'); // Apenas loopback
} else {
    // Em desenvolvimento, normalmente não há proxies
    app.set('trust proxy', false);
}

// Configurações de segurança
app.use(helmet({
    // Configurações específicas para produção
    ...(process.env.NODE_ENV === 'production' && {
        hsts: {
            maxAge: 31536000,
            includeSubDomains: true,
            preload: true
        },
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                styleSrc: ["'self'", "'unsafe-inline'"],
                scriptSrc: ["'self'"],
                imgSrc: ["'self'", "data:", "https:"],
                connectSrc: ["'self'", "wss:", "ws:"],
            },
        },
    })
}));

// Rate limiting geral - aplicado APÓS a configuração de trust proxy
app.use(generalLimiter);

// CORS
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging em desenvolvimento
if (process.env.NODE_ENV === 'development') {
    app.use((req, res, next) => {
        const forwarded = req.get('X-Forwarded-For');
        const ip = req.ip;
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url} - IP: ${ip}${forwarded ? ` (Forwarded: ${forwarded})` : ''}`);
        next();
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Streamhive API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        // Informações úteis para debug em desenvolvimento
        ...(process.env.NODE_ENV === 'development' && {
            ip: req.ip,
            forwarded: req.get('X-Forwarded-For'),
            trustProxy: app.get('trust proxy')
        })
    });
});

// API Routes com rate limiting específico
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/streaming', streamingLimiter, streamingRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
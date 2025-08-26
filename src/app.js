const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Middlewares
const { errorHandler, notFoundHandler } = require('./presentation/middlewares/error-middleware');

// Routes
const authRoutes = require('./presentation/routes/auth-routes');
const roomRoutes = require('./presentation/routes/room-routes');
const streamingRoutes = require('./presentation/routes/streaming-routes');

const app = express();

// Configurações de segurança
app.use(helmet());

// Rate limiting geral
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200, // máximo 200 requests por IP por janela
    message: {
        success: false,
        message: 'Too many requests from this IP, please try again later.',
        timestamp: new Date().toISOString()
    }
});

app.use(limiter);

// Rate limiting específico para auth
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 20, // máximo 20 tentativas de auth por IP por janela
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
        timestamp: new Date().toISOString()
    }
});

// Rate limiting específico para streaming
const streamingLimiter = rateLimit({
    windowMs: 5 * 60 * 1000, // 5 minutos
    max: 500, // máximo 500 requests de streaming por IP por janela
    message: {
        success: false,
        message: 'Too many streaming requests, please try again later.',
        timestamp: new Date().toISOString()
    }
});

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
        console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
        next();
    });
}

// Health check
app.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Streamhive API is running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// API Routes
app.use('/api/v1/auth', authLimiter, authRoutes);
app.use('/api/v1/rooms', roomRoutes);
app.use('/api/v1/streaming', streamingLimiter, streamingRoutes);

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
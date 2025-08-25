const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Middlewares
const { errorHandler, notFoundHandler } = require('./presentation/middlewares/error-middleware');

// Routes
const authRoutes = require('./presentation/routes/auth-routes');

const app = express();

// Configurações de segurança
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP por janela
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
    max: 10, // máximo 10 tentativas de auth por IP por janela
    message: {
        success: false,
        message: 'Too many authentication attempts, please try again later.',
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

// Error handlers
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
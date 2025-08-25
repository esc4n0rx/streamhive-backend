const ResponseUtils = require('../../shared/utils/response-utils');

const errorHandler = (err, req, res, next) => {
    console.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        url: req.url,
        method: req.method,
        timestamp: new Date().toISOString()
    });

    // Erro de validação do Zod
    if (err.name === 'ZodError') {
        const errors = err.errors.map(error => ({
            field: error.path.join('.'),
            message: error.message
        }));
        return ResponseUtils.validationError(res, errors);
    }

    // Erro de JWT
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return ResponseUtils.unauthorized(res, 'Authentication failed');
    }

    // Erros do Supabase/PostgreSQL
    if (err.code) {
        switch (err.code) {
            case '23505': // unique_violation
                return ResponseUtils.conflict(res, 'Resource already exists');
            case '23503': // foreign_key_violation
                return ResponseUtils.error(res, 'Referenced resource not found', 400);
            case '23514': // check_violation
                return ResponseUtils.error(res, 'Data validation failed', 400);
            default:
                return ResponseUtils.error(res, 'Database error occurred');
        }
    }

    // Erro padrão
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'production' 
        ? 'Internal Server Error' 
        : err.message;

    return ResponseUtils.error(res, message, statusCode);
};

const notFoundHandler = (req, res) => {
    return ResponseUtils.notFound(res, `Route ${req.method} ${req.url} not found`);
};

module.exports = {
    errorHandler,
    notFoundHandler
};
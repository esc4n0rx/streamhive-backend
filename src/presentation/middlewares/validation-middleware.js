const ResponseUtils = require('../../shared/utils/response-utils');

const validateSchema = (schema) => {
    return (req, res, next) => {
        try {
            const result = schema.safeParse({
                body: req.body,
                query: req.query,
                params: req.params
            });

            if (!result.success) {
                const errors = result.error.errors.map(err => ({
                    field: err.path.slice(1).join('.'),
                    message: err.message
                }));

                return ResponseUtils.validationError(res, errors);
            }

            // Atualiza req com dados validados e sanitizados
            if (result.data.body) req.body = result.data.body;
            if (result.data.query) req.query = result.data.query;
            if (result.data.params) req.params = result.data.params;

            next();
        } catch (error) {
            return ResponseUtils.error(res, 'Validation error occurred');
        }
    };
};

module.exports = {
    validateSchema
};
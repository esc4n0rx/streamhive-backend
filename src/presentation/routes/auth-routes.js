const express = require('express');
const AuthController = require('../controllers/auth-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { validateSchema } = require('../middlewares/validation-middleware');
const {
    registerSchema,
    loginSchema,
    updateProfileSchema,
    changePasswordSchema
} = require('../validators/auth-validator');

const router = express.Router();
const authController = new AuthController();

// Rotas públicas
router.post('/register', 
    validateSchema(registerSchema),
    authController.register.bind(authController)
);

router.post('/login',
    validateSchema(loginSchema),
    authController.login.bind(authController)
);

// Rotas protegidas (requerem autenticação)
router.use(authenticateToken);

router.get('/profile',
    authController.getProfile.bind(authController)
);

router.put('/profile',
    validateSchema(updateProfileSchema),
    authController.updateProfile.bind(authController)
);

router.put('/change-password',
    validateSchema(changePasswordSchema),
    authController.changePassword.bind(authController)
);

router.delete('/account',
    authController.deleteAccount.bind(authController)
);

module.exports = router;
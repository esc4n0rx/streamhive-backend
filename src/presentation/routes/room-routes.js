const express = require('express');
const rateLimit = require('express-rate-limit');
const RoomController = require('../controllers/room-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { ensureRoomHost, ensureRoomExists, ensureRoomAccess } = require('../middlewares/room-middleware');
const { validateSchema } = require('../middlewares/validation-middleware');
const {
    createRoomSchema,
    updateRoomSchema,
    joinRoomSchema,
    roomIdSchema,
    participantIdSchema,
    paginationSchema
} = require('../validators/room-validator');

const router = express.Router();
const roomController = new RoomController();

// Rate limiting específico apenas para criação de salas
const roomCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: process.env.NODE_ENV === 'development' ? 50 : 10, // 50 em dev, 10 em prod
    message: {
        success: false,
        message: 'Too many rooms created, please try again later.',
        timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de salas
router.post('/',
    roomCreationLimiter, // Rate limiting apenas na criação
    validateSchema(createRoomSchema),
    roomController.createRoom.bind(roomController)
);

router.get('/',
    validateSchema(paginationSchema),
    roomController.getRooms.bind(roomController)
);

router.get('/my-rooms',
    validateSchema(paginationSchema),
    roomController.getMyRooms.bind(roomController)
);

router.get('/joined',
    validateSchema(paginationSchema),
    roomController.getJoinedRooms.bind(roomController)
);

router.get('/:id',
    validateSchema(roomIdSchema),
    roomController.getRoomById.bind(roomController)
);

router.put('/:id',
    validateSchema(roomIdSchema),
    validateSchema(updateRoomSchema),
    ensureRoomHost,
    roomController.updateRoom.bind(roomController)
);

router.delete('/:id',
    validateSchema(roomIdSchema),
    ensureRoomHost,
    roomController.deleteRoom.bind(roomController)
);

// Rotas de participação
router.post('/:id/join',
    validateSchema(roomIdSchema),
    validateSchema(joinRoomSchema),
    ensureRoomExists,
    roomController.joinRoom.bind(roomController)
);

router.post('/:id/leave',
    validateSchema(roomIdSchema),
    roomController.leaveRoom.bind(roomController)
);

router.get('/:id/participants',
    validateSchema(roomIdSchema),
    ensureRoomAccess,
    roomController.getRoomParticipants.bind(roomController)
);

router.delete('/:id/participants/:participantId',
    validateSchema(participantIdSchema),
    ensureRoomHost,
    roomController.removeParticipant.bind(roomController)
);

module.exports = router;
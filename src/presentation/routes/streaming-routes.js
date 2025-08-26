const express = require('express');
const StreamingController = require('../controllers/streaming-controller');
const { authenticateToken } = require('../middlewares/auth-middleware');
const { validateSchema } = require('../middlewares/validation-middleware');
const { z } = require('zod');

const router = express.Router();
const streamingController = new StreamingController();

// Schemas de validação
const roomIdSchema = z.object({
    params: z.object({
        roomId: z.string().uuid('Invalid room ID format')
    })
});

const updateStateSchema = z.object({
    body: z.object({
        eventType: z.enum(['play', 'pause', 'seek', 'sync']),
        videoPosition: z.number().min(0),
        isPlaying: z.boolean(),
        videoDuration: z.number().min(0).optional(),
        eventData: z.record(z.any()).optional()
    })
});

const validateUrlSchema = z.object({
    body: z.object({
        url: z.string().url('Invalid URL format'),
        type: z.enum(['YOUTUBE_LINK', 'EXTERNAL_LINK'])
    })
});

const metadataSchema = z.object({
    query: z.object({
        url: z.string().url('Invalid URL format'),
        type: z.enum(['YOUTUBE_LINK', 'EXTERNAL_LINK'])
    })
});

const eventsSchema = z.object({
    query: z.object({
        limit: z.coerce.number().int().min(1).max(100).default(50)
    })
});

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Estado da sala
router.get('/rooms/:roomId/state',
    validateSchema(roomIdSchema),
    streamingController.getRoomState.bind(streamingController)
);

router.put('/rooms/:roomId/state',
    validateSchema(roomIdSchema),
    validateSchema(updateStateSchema),
    streamingController.updateRoomState.bind(streamingController)
);

router.post('/rooms/:roomId/sync',
    validateSchema(roomIdSchema),
    streamingController.syncParticipant.bind(streamingController)
);

// Eventos de streaming
router.get('/rooms/:roomId/events',
    validateSchema(roomIdSchema),
    validateSchema(eventsSchema),
    streamingController.getStreamingEvents.bind(streamingController)
);

// Validação e metadados
router.post('/validate-url',
    validateSchema(validateUrlSchema),
    streamingController.validateStreamUrl.bind(streamingController)
);

router.get('/metadata',
    validateSchema(metadataSchema),
    streamingController.getVideoMetadata.bind(streamingController)
);

// Proxy para conteúdo HTTP
router.get('/proxy',
    streamingController.proxyStream.bind(streamingController)
);

module.exports = router;
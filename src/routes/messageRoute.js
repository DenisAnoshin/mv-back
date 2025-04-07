import express from 'express';
import { createMessage, likeMessage } from '../controller/messageController.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.use(verifyToken);

router.post('/create/:id', createMessage);
router.post('/like', likeMessage);

export default router;
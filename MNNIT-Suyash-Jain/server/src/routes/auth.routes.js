import express from 'express';
import { login, getMe } from '../controllers/auth.controller.js';
import { authenticateToken } from '../middleware/auth.middleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/me', authenticateToken, getMe);

export default router;

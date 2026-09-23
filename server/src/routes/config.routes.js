import express from 'express';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import { getRuleConfig, updateRuleConfig, rollbackRuleConfig } from '../controllers/config.controller.js';

const router = express.Router();

router.use(apiRateLimiter);
router.use(authenticateToken);

router.get('/rules', getRuleConfig);
router.put('/rules', requireRole('Supervisor', 'Admin'), updateRuleConfig);
router.post('/rules/rollback', requireRole('Supervisor', 'Admin'), rollbackRuleConfig);

export default router;

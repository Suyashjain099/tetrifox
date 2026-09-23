import express from 'express';
import multer from 'multer';
import { apiRateLimiter } from '../middleware/rateLimiter.middleware.js';
import { authenticateToken, requireRole } from '../middleware/auth.middleware.js';
import {
  routeSingleParcel,
  routeBatchParcels,
  getPendingApprovals,
  approveParcel,
  getRecentApprovals,
  getAnalyticsMetrics,
  resetAnalyticsMetrics,
} from '../controllers/routing.controller.js';

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.use(apiRateLimiter);
router.use(authenticateToken);

router.get('/route/analytics', getAnalyticsMetrics);
router.post('/route/analytics/reset', resetAnalyticsMetrics);
router.get('/route/recent-approvals', getRecentApprovals);
router.post('/route', routeSingleParcel);
router.post('/route/batch', upload.single('file'), routeBatchParcels);

// RBAC Supervisor Restricted Endpoints
router.get('/route/pending-approvals', requireRole('Supervisor', 'Admin'), getPendingApprovals);
router.post('/route/approve/:id', requireRole('Supervisor', 'Admin'), approveParcel);

export default router;

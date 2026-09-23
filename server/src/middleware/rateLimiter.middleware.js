import rateLimit from 'express-rate-limit';

export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3000, // Enterprise threshold accommodating real-time floor telemetry
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too Many Requests',
    message: 'Too many requests from this IP, please try again after 15 minutes',
  },
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') return true;
    const path = req.originalUrl || req.url || '';
    // Exempt background read-only polling requests from rate limit bucket
    if (
      path.includes('/recent-approvals') ||
      path.includes('/pending-approvals') ||
      path.includes('/analytics')
    ) {
      return true;
    }
    return false;
  },
});


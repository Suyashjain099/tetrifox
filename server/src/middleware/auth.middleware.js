import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-jwt-key';

export const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  const apiKeyHeader = req.header('X-API-Key') || req.header('x-api-key');
  const validApiKey = process.env.API_KEY || 'secret-api-key';

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(403).json({ error: 'Forbidden', message: 'Invalid or expired JWT token' });
      }
      req.user = user;
      next();
    });
  } else if (apiKeyHeader && apiKeyHeader === validApiKey) {
    req.user = { id: 'api-key-user', name: 'API Key System', role: 'Operator' };
    next();
  } else {
    return res.status(401).json({ error: 'Unauthorized', message: 'Missing Authorization Bearer token or X-API-Key' });
  }
};

export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role) && req.user.role !== 'Admin') {
      return res.status(403).json({
        error: 'Forbidden',
        message: `Role '${req.user.role}' is not authorized to perform this action. Required role: ${allowedRoles.join(' or ')}`,
      });
    }

    next();
  };
};

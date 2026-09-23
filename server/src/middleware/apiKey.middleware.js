export const apiKeyAuth = (req, res, next) => {
  const apiKeyHeader = req.header('X-API-Key') || req.header('x-api-key');
  const validApiKey = process.env.API_KEY || 'secret-api-key';

  if (!apiKeyHeader || apiKeyHeader !== validApiKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or missing X-API-Key header',
    });
  }

  next();
};

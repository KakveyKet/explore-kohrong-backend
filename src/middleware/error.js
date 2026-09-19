export function notFound(req, _res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
}

export function errorHandler(err, _req, res, _next) {
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Duplicate value', fields: err.keyValue });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }
  const status = err.statusCode || 500;
  console.error(err);
  res.status(status).json({
    message: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' ? { stack: err.stack } : {}),
  });
}

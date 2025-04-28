const logger = require('../config/logger');

// Custom error class with status code
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handling middleware for Express
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log the error
  logger.error(`${err.statusCode} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  logger.error(err.stack);

  // Handle specific types of errors
  if (err.code === 'ER_DUP_ENTRY') {
    // MySQL duplicate entry error
    return res.status(400).json({
      success: false,
      error: 'A record with this information already exists.'
    });
  }
  
  // Send response based on environment
  if (process.env.NODE_ENV === 'development') {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      stack: err.stack,
      status: err.status
    });
  } else {
    // Production: don't leak error details
    return res.status(err.statusCode).json({
      success: false,
      error: err.isOperational ? err.message : 'Something went wrong. Please try again later.'
    });
  }
};

// Not found middleware
const notFound = (req, res, next) => {
  const error = new AppError(`Not found - ${req.originalUrl}`, 404);
  next(error);
};

module.exports = {
  AppError,
  errorHandler,
  notFound
};


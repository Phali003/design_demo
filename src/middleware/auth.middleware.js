const jwt = require('jsonwebtoken');
const logger = require('../config/logger');

/**
 * Authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN format
  
  if (!token) {
    return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    logger.error(`Authentication error: ${error.message}`);
    return res.status(403).json({ success: false, error: 'Invalid token.' });
  }
};

/**
 * Role-based access control middleware
 * @param {Array} roles - Array of roles allowed to access the route
 */
const authorizeRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Access denied. Not authenticated.' });
    }
    
    if (roles.length && !roles.includes(req.user.role)) {
      logger.warn(`Unauthorized access attempt by ${req.user.email} (${req.user.role}) to ${req.originalUrl}`);
      return res.status(403).json({ success: false, error: 'Access denied. Not authorized.' });
    }
    
    next();
  };
};

module.exports = {
  authenticateToken,
  authorizeRoles
};


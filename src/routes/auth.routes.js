const express = require('express');
const {
  register,
  login,
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} = require('../controllers/auth.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes for all authenticated users
router.get('/me', authenticateToken, getMe);
router.put('/me', authenticateToken, updateMe);

// Admin only routes
router.get('/users', authenticateToken, authorizeRoles(['admin']), getAllUsers);
router.get('/users/:id', authenticateToken, authorizeRoles(['admin']), getUserById);
router.put('/users/:id', authenticateToken, authorizeRoles(['admin']), updateUser);
router.delete('/users/:id', authenticateToken, authorizeRoles(['admin']), deleteUser);

module.exports = router;


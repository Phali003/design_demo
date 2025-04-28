const express = require('express');
const {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksByAccount,
  getTasksByManager,
  updateTaskStatus,
  updateTaskProgress,
  assignTaskManager
} = require('../controllers/task.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get tasks by account
// NOTE: This route must be defined before /:id route to avoid path conflicts
router.get('/account/:accountId', getTasksByAccount);

// Get tasks for current manager
router.get('/manager', getTasksByManager);

// Get tasks for specific manager (admin only)
router.get('/manager/:managerId', authorizeRoles(['admin']), getTasksByManager);

// Create a new task
router.post('/', createTask);

// Get task by ID
router.get('/:id', getTaskById);

// Update task
router.put('/:id', updateTask);

// Delete task
router.delete('/:id', deleteTask);

// Update task status
router.put('/:id/status', updateTaskStatus);

// Update task progress
router.put('/:id/progress', updateTaskProgress);

// Assign task to manager
router.post('/:id/assign', assignTaskManager);

module.exports = router;


const Task = require('../models/task.model');
const ManagedAccount = require('../models/managed-account.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { AppError } = require('../middleware/error.middleware');

/**
 * Create a new task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const createTask = async (req, res, next) => {
  try {
    const { account_id, title, description, priority, due_date, assigned_to } = req.body;
    const created_by = req.user.id;
    
    // Validate required fields
    if (!account_id) {
      return next(new AppError('Account ID is required', 400));
    }
    
    if (!title || title.trim() === '') {
      return next(new AppError('Task title is required', 400));
    }
    
    // Check if account exists
    const account = await ManagedAccount.findById(account_id);
    if (!account) {
      return next(new AppError('Account not found', 404));
    }
    
    // Authorization check - only account owner, assigned manager, or admin can create tasks
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id
    ) {
      logger.warn(`Unauthorized task creation attempt by user ${req.user.id} for account ${account_id}`);
      return next(new AppError('You are not authorized to create tasks for this account', 403));
    }
    
    // If assigned_to is provided, verify it's a valid manager
    if (assigned_to) {
      const manager = await User.findById(assigned_to);
      if (!manager) {
        return next(new AppError('Assigned manager not found', 404));
      }
      
      if (manager.role !== 'manager' && manager.role !== 'admin') {
        return next(new AppError('Tasks can only be assigned to managers or admins', 400));
      }
    }
    
    // Create the task
    const taskData = {
      account_id,
      title,
      description,
      priority: priority || 'medium',
      due_date,
      created_by,
      assigned_to: assigned_to || account.manager_id, // Use account manager if not specified
      status: 'pending'
    };
    
    const task = await Task.create(taskData);
    logger.info(`Task created: ${task.id} for account ${account_id} by user ${created_by}`);
    
    res.status(200).json({
      success: true,
      counts,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error fetching account tasks: ${error.message}`);
    next(error);
  }
};

/**
 * Get tasks assigned to manager
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTasksByManager = async (req, res, next) => {
  try {
    const managerId = req.params.managerId || req.user.id;
    const { status, priority, sort_by, sort_dir, limit, offset } = req.query;
    
    // Authorization check - managers can only view their own tasks unless admin
    if (managerId !== req.user.id && req.user.role !== 'admin') {
      logger.warn(`Unauthorized access attempt to manager tasks by user ${req.user.id}`);
      return next(new AppError('You can only view your own tasks', 403));
    }
    
    // Format options
    const options = {};
    if (status) options.status = status;
    if (priority) options.priority = priority;
    if (sort_by) options.sort_by = sort_by;
    if (sort_dir) options.sort_dir = sort_dir;
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    
    // Get tasks
    const tasks = await Task.findByManagerId(managerId, options);
    
    // Get counts
    const counts = await Task.countByManagerId(managerId);
    
    res.status(200).json({
      success: true,
      counts,
      data: tasks
    });
  } catch (error) {
    logger.error(`Error fetching manager tasks: ${error.message}`);
    next(error);
  }
};

/**
 * Update task status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { status } = req.body;
    
    // Validate status
    if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
      return next(new AppError('Invalid status value', 400));
    }
    
    // Get task and check authorization (reuse existing authorization logic)
    const task = await Task.findById(taskId);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get associated account
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id &&
      task.created_by !== req.user.id &&
      task.assigned_to !== req.user.id
    ) {
      return next(new AppError('Not authorized to update task status', 403));
    }
    
    // Update status
    const updatedTask = await Task.updateStatus(taskId, status);
    logger.info(`Task ${taskId} status updated to ${status} by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    logger.error(`Error updating task status: ${error.message}`);
    next(error);
  }
};

/**
 * Update task progress
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateTaskProgress = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { progress } = req.body;
    
    // Validate progress
    if (progress === undefined || progress < 0 || progress > 100) {
      return next(new AppError('Progress must be a number between 0 and 100', 400));
    }
    
    // Get task and check authorization
    const task = await Task.findById(taskId);
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get associated account
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id &&
      task.assigned_to !== req.user.id
    ) {
      return next(new AppError('Not authorized to update task progress', 403));
    }
    
    // Update progress
    const updatedTask = await Task.updateProgress(taskId, progress);
    logger.info(`Task ${taskId} progress updated to ${progress}% by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    logger.error(`Error updating task progress: ${error.message}`);
    next(error);
  }
};

/**
};

/**
 * Get task by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTaskById = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    
    // Validate ID
    if (isNaN(taskId) || taskId <= 0) {
      return next(new AppError('Invalid task ID', 400));
    }
    
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get the account associated with this task
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check - only account owner, assigned manager, task creator, or admin can view task
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id &&
      task.created_by !== req.user.id &&
      task.assigned_to !== req.user.id
    ) {
      logger.warn(`Unauthorized task access attempt by user ${req.user.id} for task ${taskId}`);
      return next(new AppError('You are not authorized to access this task', 403));
    }
    
    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    logger.error(`Error fetching task: ${error.message}`);
    next(error);
  }
};

/**
 * Update task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { title, description, priority, status, due_date, assigned_to, completion_status } = req.body;
    
    // Validate ID
    if (isNaN(taskId) || taskId <= 0) {
      return next(new AppError('Invalid task ID', 400));
    }
    
    // Find task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get the account associated with this task
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check - only account owner, assigned manager, task creator, or admin can update task
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id &&
      task.created_by !== req.user.id &&
      task.assigned_to !== req.user.id
    ) {
      logger.warn(`Unauthorized task update attempt by user ${req.user.id} for task ${taskId}`);
      return next(new AppError('You are not authorized to update this task', 403));
    }
    
    // If changing assigned_to, verify it's a valid manager
    if (assigned_to && assigned_to !== task.assigned_to) {
      const manager = await User.findById(assigned_to);
      if (!manager) {
        return next(new AppError('Assigned manager not found', 404));
      }
      
      if (manager.role !== 'manager' && manager.role !== 'admin') {
        return next(new AppError('Tasks can only be assigned to managers or admins', 400));
      }
    }
    
    // Create update data
    const updateData = {};
    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority) updateData.priority = priority;
    if (status) updateData.status = status;
    if (due_date) updateData.due_date = due_date;
    if (assigned_to) updateData.assigned_to = assigned_to;
    if (completion_status !== undefined) updateData.completion_status = completion_status;
    
    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No data to update', 400));
    }
    
    // Update task
    const updatedTask = await Task.update(taskId, updateData);
    logger.info(`Task ${taskId} updated by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    logger.error(`Error updating task: ${error.message}`);
    next(error);
  }
};

/**
 * Delete task
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    
    // Validate ID
    if (isNaN(taskId) || taskId <= 0) {
      return next(new AppError('Invalid task ID', 400));
    }
    
    // Find task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get the account associated with this task
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check - only account owner, task creator, or admin can delete task
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      task.created_by !== req.user.id
    ) {
      logger.warn(`Unauthorized task deletion attempt by user ${req.user.id} for task ${taskId}`);
      return next(new AppError('You are not authorized to delete this task', 403));
    }
    
    // Delete task
    const success = await Task.delete(taskId);
    
    if (!success) {
      return next(new AppError('Failed to delete task', 500));
    }
    
    logger.info(`Task ${taskId} deleted by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: null,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting task: ${error.message}`);
    next(error);
  }
};

/**
 * Get tasks by account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getTasksByAccount = async (req, res, next) => {
  try {
    const accountId = req.params.accountId;
    const { status, priority, sort_by, sort_dir, limit, offset } = req.query;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }
    
    // Check if account exists
    const account = await ManagedAccount.findById(accountId);
    if (!account) {
      return next(new AppError('Account not found', 404));
    }
    
    // Authorization check - only account owner, assigned manager, or admin can view tasks
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id
    ) {
      logger.warn(`Unauthorized account tasks access attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to view tasks for this account', 403));
    }
    
    // Format options
    const options = {};
    if (status) options.status = status;
    if (priority) options.priority = priority;
    if (sort_by) options.sort_by = sort_by;
    if (sort_dir) options.sort_dir = sort_dir;
    if (limit) options.limit = parseInt(limit);
    if (offset) options.offset = parseInt(offset);
    
    // Get tasks
    const tasks = await Task.findByAccountId(accountId, options);
    
    // Get counts
    const counts = await Task.countByAccountId(accountId);
    
    res.status(200).json({
      success: true,
      counts,
      data: tasks
    });
  

/**
 * Assign task to manager
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const assignTaskManager = async (req, res, next) => {
  try {
    const taskId = req.params.id;
    const { manager_id } = req.body;
    
    // Validate ID
    if (isNaN(taskId) || taskId <= 0) {
      return next(new AppError('Invalid task ID', 400));
    }
    
    // Validate manager ID
    if (!manager_id) {
      return next(new AppError('Manager ID is required', 400));
    }
    
    if (isNaN(manager_id) || manager_id <= 0) {
      return next(new AppError('Invalid manager ID format', 400));
    }
    
    // Find task
    const task = await Task.findById(taskId);
    
    if (!task) {
      return next(new AppError('Task not found', 404));
    }
    
    // Get the account associated with this task
    const account = await ManagedAccount.findById(task.account_id);
    
    // Authorization check - only account owner, account manager, or admin can assign a task
    if (
      req.user.role !== 'admin' &&
      account.owner_id !== req.user.id &&
      account.manager_id !== req.user.id
    ) {
      logger.warn(`Unauthorized task assignment attempt by user ${req.user.id} for task ${taskId}`);
      return next(new AppError('You are not authorized to assign this task', 403));
    }
    
    // Verify the manager exists and has the right role
    const manager = await User.findById(manager_id);
    if (!manager) {
      return next(new AppError('Manager not found', 404));
    }
    
    if (manager.role !== 'manager' && manager.role !== 'admin') {
      return next(new AppError('Tasks can only be assigned to managers or admins', 400));
    }
    
    // Assign manager
    const updatedTask = await Task.assignManager(taskId, manager_id);
    logger.info(`Task ${taskId} assigned to manager ${manager_id} by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedTask
    });
  } catch (error) {
    logger.error(`Error assigning task manager: ${error.message}`);
    next(error);
  }
};

module.exports = {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  getTasksByAccount,
  getTasksByManager,
  updateTaskStatus,
  updateTaskProgress,
  assignTaskManager
};

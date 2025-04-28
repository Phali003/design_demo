const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { AppError } = require('../middleware/error.middleware');

/**
 * Register a new user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const register = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return next(new AppError('Please provide a valid email address', 400));
    }

    // Password strength validation
    if (password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }
    
    // Check if user already exists
    const existingUser = await User.findByEmail(email);
    if (existingUser) {
      return next(new AppError('User with this email already exists', 400));
    }
    
    // Create new user
    const user = await User.create({
      email,
      password,
      role: role || 'owner',
      status: 'pending' // New users are pending until activated
    });
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    logger.info(`New user registered: ${user.email} with role ${user.role}`);
    
    res.status(201).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error(`Registration error: ${error.message}`);
    next(error);
  }
};

/**
 * Login user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    
    // Basic validation
    if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
    }
    
    // Check if user exists
    const user = await User.findByEmail(email);
    if (!user) {
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Verify password
    const isMatch = await User.verifyPassword(password, user.password);
    if (!isMatch) {
      logger.warn(`Failed login attempt for user: ${email}`);
      return next(new AppError('Invalid email or password', 401));
    }
    
    // Check if user is active
    if (user.status !== 'active') {
      logger.warn(`Inactive user attempted to login: ${email}`);
      return next(new AppError('Your account is not active. Please contact an administrator.', 403));
    }
    
    // Generate token
    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
    
    logger.info(`User logged in: ${user.email}`);
    
    // Remove password from response
    delete user.password;
    
    res.status(200).json({
      success: true,
      data: {
        user,
        token
      }
    });
  } catch (error) {
    logger.error(`Login error: ${error.message}`);
    next(error);
  }
};

/**
 * Get current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error fetching user profile: ${error.message}`);
    next(error);
  }
};

/**
 * Update current user profile
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateMe = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email, password } = req.body;
    
    // Prevent role updates - role changes should be admin-only
    if (req.body.role) {
      return next(new AppError('You cannot update your role', 400));
    }
    
    // Prevent status updates - status changes should be admin-only
    if (req.body.status) {
      return next(new AppError('You cannot update your status', 400));
    }
    
    // Basic validation for email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Please provide a valid email address', 400));
      }
      
      // Check if email is already in use by another user
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== userId) {
        return next(new AppError('Email is already in use', 400));
      }
    }
    
    // Password strength validation if provided
    if (password && password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }
    
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    
    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No data to update', 400));
    }
    
    const user = await User.update(userId, updateData);
    
    logger.info(`User updated their profile: ${user.email}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error updating user profile: ${error.message}`);
    next(error);
  }
};

/**
 * Admin function to get all users
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { role, status, limit, offset } = req.query;
    
    const filters = {};
    if (role) filters.role = role;
    if (status) filters.status = status;
    if (limit) filters.limit = parseInt(limit);
    if (offset) filters.offset = parseInt(offset);
    
    const users = await User.findAll(filters);
    
    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    logger.error(`Error fetching all users: ${error.message}`);
    next(error);
  }
};

/**
 * Admin function to get a single user by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate ID format
    if (isNaN(userId) || userId <= 0) {
      return next(new AppError('Invalid user ID format', 400));
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return next(new AppError('User not found', 404));
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error fetching user by ID: ${error.message}`);
    next(error);
  }
};

/**
 * Admin function to update a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    const { email, password, role, status } = req.body;
    
    // Validate ID format
    if (isNaN(userId) || userId <= 0) {
      return next(new AppError('Invalid user ID format', 400));
    }
    
    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return next(new AppError('User not found', 404));
    }
    
    // Validate input data
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return next(new AppError('Please provide a valid email address', 400));
      }
      
      // Check if email is already in use by another user
      const existingUser = await User.findByEmail(email);
      if (existingUser && existingUser.id !== parseInt(userId)) {
        return next(new AppError('Email is already in use', 400));
      }
    }
    
    // Password strength validation if provided
    if (password && password.length < 8) {
      return next(new AppError('Password must be at least 8 characters long', 400));
    }
    
    // Role validation if provided
    if (role && !['owner', 'manager', 'admin'].includes(role)) {
      return next(new AppError('Invalid role. Must be owner, manager, or admin', 400));
    }
    
    // Status validation if provided
    if (status && !['active', 'pending', 'suspended'].includes(status)) {
      return next(new AppError('Invalid status. Must be active, pending, or suspended', 400));
    }
    
    const updateData = {};
    if (email) updateData.email = email;
    if (password) updateData.password = password;
    if (role) updateData.role = role;
    if (status) updateData.status = status;
    
    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No data to update', 400));
    }
    
    const user = await User.update(userId, updateData);
    
    logger.info(`Admin updated user: ${user.email}`);
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    logger.error(`Error updating user: ${error.message}`);
    next(error);
  }
};

/**
 * Admin function to delete a user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const deleteUser = async (req, res, next) => {
  try {
    const userId = req.params.id;
    
    // Validate ID format
    if (isNaN(userId) || userId <= 0) {
      return next(new AppError('Invalid user ID format', 400));
    }
    
    // Verify user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
      return next(new AppError('User not found', 404));
    }
    
    // Prevent deleting yourself
    if (userExists.id === req.user.id) {
      return next(new AppError('You cannot delete your own account', 400));
    }
    
    const success = await User.delete(userId);
    
    if (!success) {
      return next(new AppError('Failed to delete user', 500));
    }
    
    logger.info(`Admin deleted user: ${userExists.email}`);
    
    res.status(200).json({
      success: true,
      data: null,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error(`Error deleting user: ${error.message}`);
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateMe,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};


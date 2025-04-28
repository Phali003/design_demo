const ManagedAccount = require('../models/managed-account.model');
const User = require('../models/user.model');
const logger = require('../config/logger');
const { AppError } = require('../middleware/error.middleware');

/**
 * Submit a new account to be managed
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const submitAccount = async (req, res, next) => {
  try {
    const { account_type, credentials, management_instructions } = req.body;
    const owner_id = req.user.id;

    // Basic validation
    if (!account_type) {
      return next(new AppError('Please provide account type', 400));
    }

    // Create account
    const accountData = {
      owner_id,
      account_type,
      credentials: credentials || {},
      management_instructions: management_instructions || '',
      status: 'pending' // New accounts always start as pending
    };

    const account = await ManagedAccount.create(accountData);
    logger.info(`New account submitted by user ${owner_id}: ${account.id} (${account_type})`);

    res.status(201).json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error(`Error submitting account: ${error.message}`);
    next(error);
  }
};

/**
 * Get account by ID
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getAccountById = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }

    const account = await ManagedAccount.findById(accountId);
    
    if (!account) {
      return next(new AppError('Account not found', 404));
    }

    // Authorization check - only owner, assigned manager, or admin can access
    if (
      req.user.role !== 'admin' && 
      account.owner_id !== req.user.id && 
      account.manager_id !== req.user.id
    ) {
      logger.warn(`Unauthorized account access attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to access this account', 403));
    }

    res.status(200).json({
      success: true,
      data: account
    });
  } catch (error) {
    logger.error(`Error fetching account: ${error.message}`);
    next(error);
  }
};

/**
 * Update account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateAccount = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { account_type, credentials, management_instructions } = req.body;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }

    // Find account
    const account = await ManagedAccount.findById(accountId);
    
    if (!account) {
      return next(new AppError('Account not found', 404));
    }

    // Authorization check - only owner or admin can update the account
    if (req.user.role !== 'admin' && account.owner_id !== req.user.id) {
      logger.warn(`Unauthorized account update attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to update this account', 403));
    }

    // Create update data
    const updateData = {};
    if (account_type) updateData.account_type = account_type;
    if (credentials) updateData.credentials = credentials;
    if (management_instructions) updateData.management_instructions = management_instructions;

    // If no data to update
    if (Object.keys(updateData).length === 0) {
      return next(new AppError('No data to update', 400));
    }

    // Update account
    const updatedAccount = await ManagedAccount.update(accountId, updateData);
    logger.info(`Account ${accountId} updated by user ${req.user.id}`);

    res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    logger.error(`Error updating account: ${error.message}`);
    next(error);
  }
};

/**
 * Get all accounts owned by the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getOwnerAccounts = async (req, res, next) => {
  try {
    const ownerId = req.user.id;
    
    const accounts = await ManagedAccount.findByOwnerId(ownerId);
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    logger.error(`Error fetching owner accounts: ${error.message}`);
    next(error);
  }
};

/**
 * Get all accounts managed by the current user
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const getManagerAccounts = async (req, res, next) => {
  try {
    const managerId = req.user.id;
    
    // Only managers and admins can access this endpoint
    if (req.user.role !== 'manager' && req.user.role !== 'admin') {
      return next(new AppError('You are not authorized to access this resource', 403));
    }
    
    const accounts = await ManagedAccount.findByManagerId(managerId);
    
    res.status(200).json({
      success: true,
      count: accounts.length,
      data: accounts
    });
  } catch (error) {
    logger.error(`Error fetching manager accounts: ${error.message}`);
    next(error);
  }
};

/**
 * Update account status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateAccountStatus = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { status } = req.body;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }
    
    // Validate status
    if (!status) {
      return next(new AppError('Please provide a status', 400));
    }
    
    const validStatuses = ['pending', 'active', 'suspended', 'completed'];
    if (!validStatuses.includes(status)) {
      return next(new AppError(`Invalid status. Must be one of: ${validStatuses.join(', ')}`, 400));
    }
    
    // Find account
    const account = await ManagedAccount.findById(accountId);
    
    if (!account) {
      return next(new AppError('Account not found', 404));
    }
    
    // Authorization check - only admin, owner, or assigned manager can update status
    if (
      req.user.role !== 'admin' && 
      account.owner_id !== req.user.id && 
      account.manager_id !== req.user.id
    ) {
      logger.warn(`Unauthorized status update attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to update this account status', 403));
    }
    
    // Additional rule: Only admins can activate accounts
    if (status === 'active' && req.user.role !== 'admin') {
      return next(new AppError('Only administrators can activate accounts', 403));
    }
    
    // Update status
    const updatedAccount = await ManagedAccount.updateStatus(accountId, status);
    logger.info(`Account ${accountId} status updated to ${status} by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    logger.error(`Error updating account status: ${error.message}`);
    next(error);
  }
};

/**
 * Assign a manager to an account
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const assignManager = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { manager_id } = req.body;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }
    
    // Validate manager ID
    if (!manager_id) {
      return next(new AppError('Please provide a manager ID', 400));
    }
    
    if (isNaN(manager_id) || manager_id <= 0) {
      return next(new AppError('Invalid manager ID', 400));
    }
    
    // Find account
    const account = await ManagedAccount.findById(accountId);
    
    if (!account) {
      return next(new AppError('Account not found', 404));
    }
    
    // Authorization check - only admin or owner can assign a manager
    if (req.user.role !== 'admin' && account.owner_id !== req.user.id) {
      logger.warn(`Unauthorized manager assignment attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to assign a manager to this account', 403));
    }
    
    // Verify the manager exists and has the manager role
    const manager = await User.findById(manager_id);
    
    if (!manager) {
      return next(new AppError('Manager not found', 404));
    }
    
    if (manager.role !== 'manager' && manager.role !== 'admin') {
      return next(new AppError('The user you are trying to assign is not a manager', 400));
    }
    
    // Assign manager
    const updatedAccount = await ManagedAccount.assignManager(accountId, manager_id);
    logger.info(`Manager ${manager_id} assigned to account ${accountId} by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    logger.error(`Error assigning manager: ${error.message}`);
    next(error);
  }
};

/**
 * Update account management instructions
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next middleware function
 */
const updateInstructions = async (req, res, next) => {
  try {
    const accountId = req.params.id;
    const { instructions } = req.body;
    
    // Validate ID
    if (isNaN(accountId) || accountId <= 0) {
      return next(new AppError('Invalid account ID', 400));
    }
    
    // Validate instructions
    if (!instructions || instructions.trim() === '') {
      return next(new AppError('Please provide valid instructions', 400));
    }
    
    // Find account
    const account = await ManagedAccount.findById(accountId);
    
    if (!account) {
      return next(new AppError('Account not found', 404));
    }
    
    // Authorization check - only owner or admin can update instructions
    if (req.user.role !== 'admin' && account.owner_id !== req.user.id) {
      logger.warn(`Unauthorized instructions update attempt by user ${req.user.id} for account ${accountId}`);
      return next(new AppError('You are not authorized to update instructions for this account', 403));
    }
    
    // Update instructions
    const updatedAccount = await ManagedAccount.updateInstructions(accountId, instructions);
    logger.info(`Instructions updated for account ${accountId} by user ${req.user.id}`);
    
    res.status(200).json({
      success: true,
      data: updatedAccount
    });
  } catch (error) {
    logger.error(`Error updating instructions: ${error.message}`);
    next(error);
  }
};

module.exports = {
  submitAccount,
  getAccountById,
  updateAccount,
  getOwnerAccounts,
  getManagerAccounts,
  updateAccountStatus,
  assignManager,
  updateInstructions
};


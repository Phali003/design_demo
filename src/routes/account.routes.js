const express = require('express');
const {
  submitAccount,
  getAccountById,
  updateAccount,
  getOwnerAccounts,
  getManagerAccounts,
  updateAccountStatus,
  assignManager,
  updateInstructions
} = require('../controllers/account.controller');
const { authenticateToken, authorizeRoles } = require('../middleware/auth.middleware');

const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Account creation - only account owners can submit accounts
router.post('/submit', authorizeRoles(['owner', 'admin']), submitAccount);

// Get account by ID - owners, assigned managers, or admins can access
router.get('/:id', getAccountById); // Authorization check is in the controller

// Update account - only owners or admins can update
router.put('/:id', getAccountById, updateAccount); // Authorization check is in the controller

// Get all accounts owned by the current user
router.get('/owner', getOwnerAccounts);

// Get all accounts managed by the current user
router.get('/manager', authorizeRoles(['manager', 'admin']), getManagerAccounts);

// Update account status - owners, assigned managers, or admins
router.put('/:id/status', updateAccountStatus); // Authorization check is in the controller

// Assign a manager to an account - only owners or admins
router.post('/:id/manager', assignManager); // Authorization check is in the controller

// Update account instructions - only owners or admins
router.put('/:id/instructions', updateInstructions); // Authorization check is in the controller

module.exports = router;


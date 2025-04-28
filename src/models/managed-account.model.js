const { pool } = require('../config/database');
const logger = require('../config/logger');
const encryption = require('../utils/encryption');

class ManagedAccount {
  /**
   * Create a new managed account
   * @param {Object} accountData - Account data
   * @returns {Promise<Object>} - Created account
   */
  static async create(accountData) {
    try {
      // Encrypt sensitive credentials if provided
      let credentials = null;
      if (accountData.credentials) {
        credentials = encryption.encrypt(accountData.credentials);
      }

      const [result] = await pool.query(
        `INSERT INTO managed_accounts 
        (owner_id, account_type, credentials, status, management_instructions) 
        VALUES (?, ?, ?, ?, ?)`,
        [
          accountData.owner_id,
          accountData.account_type,
          credentials,
          accountData.status || 'pending',
          accountData.management_instructions || ''
        ]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Failed to create managed account');
      }

      // Fetch the created account
      const account = await this.findById(result.insertId);
      return account;
    } catch (error) {
      logger.error(`Error creating managed account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find account by ID
   * @param {Number} id - Account ID
   * @returns {Promise<Object|null>} - Account object or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT id, owner_id, manager_id, account_type, credentials, 
        status, management_instructions, created_at, updated_at 
        FROM managed_accounts WHERE id = ?`,
        [id]
      );
      
      if (rows.length === 0) {
        return null;
      }
      
      const account = rows[0];
      
      // Decrypt credentials if they exist
      if (account.credentials) {
        try {
          account.credentials = encryption.decrypt(account.credentials);
        } catch (err) {
          logger.error(`Failed to decrypt credentials for account ${id}: ${err.message}`);
          account.credentials = null;
        }
      }
      
      return account;
    } catch (error) {
      logger.error(`Error finding account by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update account by ID
   * @param {Number} id - Account ID
   * @param {Object} accountData - Account data to update
   * @returns {Promise<Object>} - Updated account
   */
  static async update(id, accountData) {
    try {
      const allowedFields = ['account_type', 'credentials', 'status', 'management_instructions', 'manager_id'];
      const updateFields = [];
      const updateValues = [];
      
      // Handle credentials encryption separately
      if (accountData.credentials) {
        updateFields.push('credentials = ?');
        updateValues.push(encryption.encrypt(accountData.credentials));
      }
      
      // Process other allowed fields
      for (const [key, value] of Object.entries(accountData)) {
        if (allowedFields.includes(key) && key !== 'credentials') {
          updateFields.push(`${key} = ?`);
          updateValues.push(value);
        }
      }
      
      if (updateFields.length === 0) {
        throw new Error('No valid fields to update');
      }
      
      // Add ID at the end of values array
      updateValues.push(id);
      
      const [result] = await pool.query(
        `UPDATE managed_accounts SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Account not found or no changes made');
      }
      
      // Update the updated_at timestamp
      await pool.query(
        'UPDATE managed_accounts SET updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      // Fetch the updated account
      const account = await this.findById(id);
      return account;
    } catch (error) {
      logger.error(`Error updating account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete account by ID
   * @param {Number} id - Account ID
   * @returns {Promise<Boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM managed_accounts WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error deleting account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find accounts by owner ID
   * @param {Number} ownerId - Owner user ID
   * @returns {Promise<Array>} - Array of accounts
   */
  static async findByOwnerId(ownerId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, owner_id, manager_id, account_type, 
        status, management_instructions, created_at, updated_at 
        FROM managed_accounts WHERE owner_id = ?`,
        [ownerId]
      );
      
      // Note: We don't return credentials in this list for security reasons
      return rows;
    } catch (error) {
      logger.error(`Error finding accounts by owner: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find accounts by manager ID
   * @param {Number} managerId - Manager user ID
   * @returns {Promise<Array>} - Array of accounts
   */
  static async findByManagerId(managerId) {
    try {
      const [rows] = await pool.query(
        `SELECT id, owner_id, manager_id, account_type, 
        status, management_instructions, created_at, updated_at 
        FROM managed_accounts WHERE manager_id = ?`,
        [managerId]
      );
      
      // Note: We don't return credentials in this list for security reasons
      return rows;
    } catch (error) {
      logger.error(`Error finding accounts by manager: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update account status
   * @param {Number} id - Account ID
   * @param {String} status - New status
   * @returns {Promise<Object>} - Updated account
   */
  static async updateStatus(id, status) {
    try {
      // Validate status
      const validStatuses = ['pending', 'active', 'suspended', 'completed'];
      if (!validStatuses.includes(status)) {
        throw new Error(`Invalid status value. Must be one of: ${validStatuses.join(', ')}`);
      }
      
      const [result] = await pool.query(
        'UPDATE managed_accounts SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Account not found');
      }
      
      // Fetch the updated account
      const account = await this.findById(id);
      return account;
    } catch (error) {
      logger.error(`Error updating account status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign manager to account
   * @param {Number} id - Account ID
   * @param {Number} managerId - Manager user ID
   * @returns {Promise<Object>} - Updated account
   */
  static async assignManager(id, managerId) {
    try {
      const [result] = await pool.query(
        'UPDATE managed_accounts SET manager_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [managerId, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Account not found');
      }
      
      // Fetch the updated account
      const account = await this.findById(id);
      return account;
    } catch (error) {
      logger.error(`Error assigning manager to account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unassign manager from account
   * @param {Number} id - Account ID
   * @returns {Promise<Object>} - Updated account
   */
  static async unassignManager(id) {
    try {
      const [result] = await pool.query(
        'UPDATE managed_accounts SET manager_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Account not found');
      }
      
      // Fetch the updated account
      const account = await this.findById(id);
      return account;
    } catch (error) {
      logger.error(`Error unassigning manager from account: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update management instructions
   * @param {Number} id - Account ID
   * @param {String} instructions - New instructions
   * @returns {Promise<Object>} - Updated account
   */
  static async updateInstructions(id, instructions) {
    try {
      const [result] = await pool.query(
        'UPDATE managed_accounts SET management_instructions = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [instructions, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Account not found');
      }
      
      // Fetch the updated account
      const account = await this.findById(id);
      return account;
    } catch (error) {
      logger.error(`Error updating account instructions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all accounts with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of accounts
   */
  static async findAll(filters = {}) {
    try {
      let query = `SELECT id, owner_id, manager_id, account_type, 
        status, management_instructions, created_at, updated_at 
        FROM managed_accounts`;
      const queryParams = [];
      
      // Add filtering
      if (Object.keys(filters).length > 0) {
        const filterConditions = [];
        
        if (filters.status) {
          filterConditions.push('status = ?');
          queryParams.push(filters.status);
        }
        
        if (filters.account_type) {
          filterConditions.push('account_type = ?');
          queryParams.push(filters.account_type);
        }
        
        if (filterConditions.length > 0) {
          query += ' WHERE ' + filterConditions.join(' AND ');
        }
      }
      
      // Add sorting
      query += ' ORDER BY created_at DESC';
      
      // Add pagination if provided
      if (filters.limit) {
        query += ' LIMIT ?';
        queryParams.push(parseInt(filters.limit));
        
        if (filters.offset) {
          query += ' OFFSET ?';
          queryParams.push(parseInt(filters.offset));
        }
      }
      
      const [rows] = await pool.query(query, queryParams);
      
      // Note: We don't return credentials in this list for security reasons
      return rows;
    } catch (error) {
      logger.error(`Error finding accounts: ${error.message}`);
      throw error;
    }
  }
}

module.exports = ManagedAccount;


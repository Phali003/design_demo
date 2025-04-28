const { pool } = require('../config/database');
const logger = require('../config/logger');
const bcrypt = require('bcrypt');

class User {
  /**
   * Create a new user
   * @param {Object} userData - User data
   * @returns {Promise<Object>} - Created user
   */
  static async create(userData) {
    try {
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);
      
      const [result] = await pool.query(
        'INSERT INTO users (email, password, role, status) VALUES (?, ?, ?, ?)',
        [
          userData.email,
          hashedPassword,
          userData.role || 'owner', // Default role
          userData.status || 'pending' // Default status
        ]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Failed to create user');
      }

      // Fetch the user without the password
      const user = await this.findById(result.insertId);
      return user;
    } catch (error) {
      logger.error(`Error creating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by ID
   * @param {Number} id - User ID
   * @returns {Promise<Object|null>} - User object or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, role, status, created_at, updated_at FROM users WHERE id = ?',
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find user by email
   * @param {String} email - User email
   * @returns {Promise<Object|null>} - User object or null including password for verification
   */
  static async findByEmail(email) {
    try {
      const [rows] = await pool.query(
        'SELECT id, email, password, role, status, created_at, updated_at FROM users WHERE email = ?',
        [email]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error finding user by email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update user by ID
   * @param {Number} id - User ID
   * @param {Object} userData - User data to update
   * @returns {Promise<Object>} - Updated user
   */
  static async update(id, userData) {
    try {
      // If password is being updated, hash it
      if (userData.password) {
        const salt = await bcrypt.genSalt(10);
        userData.password = await bcrypt.hash(userData.password, salt);
      }
      
      const allowedFields = ['email', 'password', 'role', 'status'];
      const updateFields = [];
      const updateValues = [];
      
      // Create dynamic update query
      for (const [key, value] of Object.entries(userData)) {
        if (allowedFields.includes(key)) {
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
        `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        throw new Error('User not found or no changes made');
      }
      
      // Fetch the updated user
      const user = await this.findById(id);
      return user;
    } catch (error) {
      logger.error(`Error updating user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete user by ID
   * @param {Number} id - User ID
   * @returns {Promise<Boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM users WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error deleting user: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find all users with optional filtering
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} - Array of users
   */
  static async findAll(filters = {}) {
    try {
      let query = 'SELECT id, email, role, status, created_at, updated_at FROM users';
      const queryParams = [];
      
      // Add filtering
      if (Object.keys(filters).length > 0) {
        const filterConditions = [];
        
        if (filters.role) {
          filterConditions.push('role = ?');
          queryParams.push(filters.role);
        }
        
        if (filters.status) {
          filterConditions.push('status = ?');
          queryParams.push(filters.status);
        }
        
        if (filterConditions.length > 0) {
          query += ' WHERE ' + filterConditions.join(' AND ');
        }
      }
      
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
      return rows;
    } catch (error) {
      logger.error(`Error finding users: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify user password
   * @param {String} plainPassword - Plain text password
   * @param {String} hashedPassword - Hashed password from database
   * @returns {Promise<Boolean>} - Whether the password matches
   */
  static async verifyPassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  }
}

module.exports = User;


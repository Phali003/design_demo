const { pool } = require('../config/database');
const logger = require('../config/logger');

class Task {
  /**
   * Create a new task
   * @param {Object} taskData - Task data
   * @returns {Promise<Object>} - Created task
   */
  static async create(taskData) {
    try {
      // Validate required fields
      if (!taskData.account_id) {
        throw new Error('Account ID is required');
      }
      
      if (!taskData.title || taskData.title.trim() === '') {
        throw new Error('Task title is required');
      }
      
      if (!taskData.created_by) {
        throw new Error('Creator ID is required');
      }
      
      // Validate priority if provided
      if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
        throw new Error('Priority must be one of: low, medium, high');
      }
      
      // Validate status if provided
      if (taskData.status && !['pending', 'in-progress', 'completed', 'cancelled'].includes(taskData.status)) {
        throw new Error('Status must be one of: pending, in-progress, completed, cancelled');
      }
      
      // Validate completion status if provided
      if (taskData.completion_status !== undefined) {
        const completion = parseFloat(taskData.completion_status);
        if (isNaN(completion) || completion < 0 || completion > 100) {
          throw new Error('Completion status must be a number between 0 and 100');
        }
      }

      const [result] = await pool.query(
        `INSERT INTO tasks (
          account_id, title, description, priority, status, 
          due_date, created_by, assigned_to, completion_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          taskData.account_id,
          taskData.title,
          taskData.description || null,
          taskData.priority || 'medium',
          taskData.status || 'pending',
          taskData.due_date || null,
          taskData.created_by,
          taskData.assigned_to || null,
          taskData.completion_status || 0.00
        ]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Failed to create task');
      }

      // Fetch the created task
      const task = await this.findById(result.insertId);
      return task;
    } catch (error) {
      logger.error(`Error creating task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find task by ID
   * @param {Number} id - Task ID
   * @returns {Promise<Object|null>} - Task object or null
   */
  static async findById(id) {
    try {
      const [rows] = await pool.query(
        `SELECT id, account_id, title, description, priority, status, 
        due_date, created_by, assigned_to, completion_status, created_at, updated_at 
        FROM tasks WHERE id = ?`,
        [id]
      );
      
      return rows[0] || null;
    } catch (error) {
      logger.error(`Error finding task by ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update task by ID
   * @param {Number} id - Task ID
   * @param {Object} taskData - Task data to update
   * @returns {Promise<Object>} - Updated task
   */
  static async update(id, taskData) {
    try {
      // Validate task data if provided
      if (taskData.priority && !['low', 'medium', 'high'].includes(taskData.priority)) {
        throw new Error('Priority must be one of: low, medium, high');
      }
      
      if (taskData.status && !['pending', 'in-progress', 'completed', 'cancelled'].includes(taskData.status)) {
        throw new Error('Status must be one of: pending, in-progress, completed, cancelled');
      }
      
      if (taskData.completion_status !== undefined) {
        const completion = parseFloat(taskData.completion_status);
        if (isNaN(completion) || completion < 0 || completion > 100) {
          throw new Error('Completion status must be a number between 0 and 100');
        }
      }
      
      const allowedFields = [
        'title', 'description', 'priority', 'status', 
        'due_date', 'assigned_to', 'completion_status'
      ];
      const updateFields = [];
      const updateValues = [];
      
      for (const [key, value] of Object.entries(taskData)) {
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
        `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        updateValues
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Task not found or no changes made');
      }
      
      // Fetch the updated task
      const task = await this.findById(id);
      return task;
    } catch (error) {
      logger.error(`Error updating task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Delete task by ID
   * @param {Number} id - Task ID
   * @returns {Promise<Boolean>} - Success status
   */
  static async delete(id) {
    try {
      const [result] = await pool.query(
        'DELETE FROM tasks WHERE id = ?',
        [id]
      );
      
      return result.affectedRows > 0;
    } catch (error) {
      logger.error(`Error deleting task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find tasks by account ID
   * @param {Number} accountId - Account ID
   * @param {Object} options - Optional filters and pagination
   * @returns {Promise<Array>} - Array of tasks
   */
  static async findByAccountId(accountId, options = {}) {
    try {
      let query = `SELECT id, account_id, title, description, priority, status, 
        due_date, created_by, assigned_to, completion_status, created_at, updated_at 
        FROM tasks WHERE account_id = ?`;
      const queryParams = [accountId];
      
      // Add filtering
      if (options.status) {
        query += ' AND status = ?';
        queryParams.push(options.status);
      }
      
      if (options.priority) {
        query += ' AND priority = ?';
        queryParams.push(options.priority);
      }
      
      // Add sorting
      query += ' ORDER BY ';
      if (options.sort_by && ['due_date', 'created_at', 'updated_at', 'priority'].includes(options.sort_by)) {
        query += `${options.sort_by} `;
      } else {
        query += 'due_date ';
      }
      
      query += options.sort_dir === 'desc' ? 'DESC' : 'ASC';
      
      // Add pagination
      if (options.limit) {
        query += ' LIMIT ?';
        queryParams.push(parseInt(options.limit));
        
        if (options.offset) {
          query += ' OFFSET ?';
          queryParams.push(parseInt(options.offset));
        }
      }
      
      const [rows] = await pool.query(query, queryParams);
      return rows;
    } catch (error) {
      logger.error(`Error finding tasks by account ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find tasks by manager ID (assigned_to)
   * @param {Number} managerId - Manager ID
   * @param {Object} options - Optional filters and pagination
   * @returns {Promise<Array>} - Array of tasks
   */
  static async findByManagerId(managerId, options = {}) {
    try {
      let query = `SELECT t.id, t.account_id, t.title, t.description, t.priority, t.status, 
        t.due_date, t.created_by, t.assigned_to, t.completion_status, t.created_at, t.updated_at,
        ma.account_type
        FROM tasks t
        INNER JOIN managed_accounts ma ON t.account_id = ma.id
        WHERE t.assigned_to = ?`;
      const queryParams = [managerId];
      
      // Add filtering
      if (options.status) {
        query += ' AND t.status = ?';
        queryParams.push(options.status);
      }
      
      if (options.priority) {
        query += ' AND t.priority = ?';
        queryParams.push(options.priority);
      }
      
      if (options.account_id) {
        query += ' AND t.account_id = ?';
        queryParams.push(options.account_id);
      }
      
      // Add sorting
      query += ' ORDER BY ';
      if (options.sort_by && ['due_date', 'created_at', 'updated_at', 'priority'].includes(options.sort_by)) {
        query += `t.${options.sort_by} `;
      } else {
        query += 't.due_date ';
      }
      
      query += options.sort_dir === 'desc' ? 'DESC' : 'ASC';
      
      // Add pagination
      if (options.limit) {
        query += ' LIMIT ?';
        queryParams.push(parseInt(options.limit));
        
        if (options.offset) {
          query += ' OFFSET ?';
          queryParams.push(parseInt(options.offset));
        }
      }
      
      const [rows] = await pool.query(query, queryParams);
      return rows;
    } catch (error) {
      logger.error(`Error finding tasks by manager ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update task status
   * @param {Number} id - Task ID
   * @param {String} status - New status
   * @returns {Promise<Object>} - Updated task
   */
  static async updateStatus(id, status) {
    try {
      // Validate status
      if (!status || !['pending', 'in-progress', 'completed', 'cancelled'].includes(status)) {
        throw new Error('Status must be one of: pending, in-progress, completed, cancelled');
      }
      
      const [result] = await pool.query(
        'UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }
      
      // If task is completed, set completion_status to 100
      if (status === 'completed') {
        await pool.query(
          'UPDATE tasks SET completion_status = 100.00 WHERE id = ?',
          [id]
        );
      }
      
      // If task is cancelled, make sure it's reflected in the completion status
      if (status === 'cancelled') {
        await pool.query(
          'UPDATE tasks SET completion_status = 0.00 WHERE id = ?',
          [id]
        );
      }
      
      // Fetch the updated task
      const task = await this.findById(id);
      return task;
    } catch (error) {
      logger.error(`Error updating task status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update task progress (completion_status)
   * @param {Number} id - Task ID
   * @param {Number} progress - New progress percentage (0-100)
   * @returns {Promise<Object>} - Updated task
   */
  static async updateProgress(id, progress) {
    try {
      // Validate progress
      const progressValue = parseFloat(progress);
      if (isNaN(progressValue) || progressValue < 0 || progressValue > 100) {
        throw new Error('Progress must be a number between 0 and 100');
      }
      
      const [result] = await pool.query(
        'UPDATE tasks SET completion_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [progressValue, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }
      
      // If progress is 100%, update status to completed
      if (progressValue === 100) {
        await pool.query(
          'UPDATE tasks SET status = "completed" WHERE id = ?',
          [id]
        );
      }
      
      // If progress is less than 100% and status is completed, update status to in-progress
      if (progressValue < 100) {
        await pool.query(
          'UPDATE tasks SET status = "in-progress" WHERE id = ? AND status = "completed"',
          [id]
        );
      }
      
      // Fetch the updated task
      const task = await this.findById(id);
      return task;
    } catch (error) {
      logger.error(`Error updating task progress: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assign task to a manager
   * @param {Number} id - Task ID
   * @param {Number} managerId - Manager user ID
   * @returns {Promise<Object>} - Updated task
   */
  static async assignManager(id, managerId) {
    try {
      const [result] = await pool.query(
        'UPDATE tasks SET assigned_to = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [managerId, id]
      );
      
      if (result.affectedRows === 0) {
        throw new Error('Task not found');
      }
      
      // Fetch the updated task
      const task = await this.findById(id);
      return task;
    } catch (error) {
      logger.error(`Error assigning manager to task: ${error.message}`);
      throw error;
    }
  }

  /**
   * Count tasks by account ID with optional filters
   * @param {Number} accountId - Account ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Object>} - Task counts by status
   */
  static async countByAccountId(accountId, filters = {}) {
    try {
      const [rows] = await pool.query(
        `SELECT status, COUNT(*) as count
        FROM tasks 
        WHERE account_id = ? 
        GROUP BY status`,
        [accountId]
      );
      
      // Format the results as an object
      const counts = {
        total: 0,
        pending: 0,
        'in-progress': 0,
        completed: 0,
        cancelled: 0
      };
      
      rows.forEach(row => {
        counts[row.status] = row.count;
        counts.total += row.count;
      });
      
      return counts;
    } catch (error) {
      logger.error(`Error counting tasks by account ID: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Task;


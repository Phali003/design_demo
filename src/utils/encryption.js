const crypto = require('crypto');
const logger = require('../config/logger');

/**
 * Encryption utility for sensitive data
 * Uses AES-256-CBC encryption with provided key
 */
class Encryption {
  constructor() {
    this.algorithm = 'aes-256-cbc';
    this.key = Buffer.from(process.env.ENCRYPTION_KEY || '', 'utf-8');
    
    // Check if key length is valid for AES-256
    if (this.key.length !== 32) {
      logger.warn('Encryption key must be 32 characters for AES-256-CBC. Using a padded/truncated key.');
      
      // Pad or truncate key to 32 bytes
      if (this.key.length < 32) {
        // Pad with zeros
        this.key = Buffer.concat([this.key, Buffer.alloc(32 - this.key.length)]);
      } else {
        // Truncate
        this.key = this.key.slice(0, 32);
      }
    }
  }

  /**
   * Encrypt data
   * @param {Object|String} data - Data to encrypt
   * @returns {String} - Encrypted data as base64 string
   */
  encrypt(data) {
    try {
      // Convert object to string if needed
      const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
      
      // Generate random initialization vector
      const iv = crypto.randomBytes(16);
      
      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
      
      // Encrypt data
      let encrypted = cipher.update(dataString, 'utf-8', 'base64');
      encrypted += cipher.final('base64');
      
      // Combine IV and encrypted data
      const combined = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]);
      
      return combined.toString('base64');
    } catch (error) {
      logger.error(`Encryption error: ${error.message}`);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data
   * @param {String} encryptedData - Encrypted data as base64 string
   * @returns {Object|String} - Decrypted data
   */
  decrypt(encryptedData) {
    try {
      // Convert base64 string to buffer
      const buffer = Buffer.from(encryptedData, 'base64');
      
      // Extract IV and encrypted data
      const iv = buffer.slice(0, 16);
      const encryptedText = buffer.slice(16).toString('base64');
      
      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
      
      // Decrypt data
      let decrypted = decipher.update(encryptedText, 'base64', 'utf-8');
      decrypted += decipher.final('utf-8');
      
      // Try to parse as JSON if possible
      try {
        return JSON.parse(decrypted);
      } catch {
        // Return as string if not valid JSON
        return decrypted;
      }
    } catch (error) {
      logger.error(`Decryption error: ${error.message}`);
      throw new Error('Failed to decrypt data');
    }
  }
}

module.exports = new Encryption();


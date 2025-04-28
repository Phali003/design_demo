-- Drop database if it exists and create a new one
DROP DATABASE IF EXISTS account_management_db;
CREATE DATABASE account_management_db;

USE account_management_db;

-- Users Table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL, -- encrypted
  role ENUM('owner', 'manager', 'admin') NOT NULL,
  status ENUM('active', 'pending', 'suspended') NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Manager Profiles Table
CREATE TABLE manager_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  expertise JSON,
  reliability_score DECIMAL(3,2) DEFAULT 0.00,
  verification_status VARCHAR(50) DEFAULT 'pending',
  background_check_date DATE,
  documents JSON,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Managed Accounts Table
CREATE TABLE managed_accounts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  owner_id INT NOT NULL,
  manager_id INT,
  account_type VARCHAR(100) NOT NULL,
  credentials JSON, -- encrypted
  status VARCHAR(50) DEFAULT 'pending',
  management_instructions TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Tasks Table
CREATE TABLE tasks (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_id INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  priority VARCHAR(20) DEFAULT 'medium',
  status VARCHAR(50) DEFAULT 'pending',
  due_date DATETIME,
  created_by INT NOT NULL,
  assigned_to INT,
  completion_status DECIMAL(5,2) DEFAULT 0.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES managed_accounts(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE NO ACTION,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
);

-- Reports Table
CREATE TABLE reports (
  id INT PRIMARY KEY AUTO_INCREMENT,
  account_id INT NOT NULL,
  metrics JSON,
  task_completion_rate DECIMAL(5,2) DEFAULT 0.00,
  engagement_stats JSON,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (account_id) REFERENCES managed_accounts(id) ON DELETE CASCADE
);

-- Messages Table
CREATE TABLE messages (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sender_id INT NOT NULL,
  receiver_id INT NOT NULL,
  account_id INT NOT NULL,
  content TEXT NOT NULL,
  status ENUM('sent', 'delivered', 'read') DEFAULT 'sent',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE NO ACTION,
  FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE NO ACTION,
  FOREIGN KEY (account_id) REFERENCES managed_accounts(id) ON DELETE CASCADE
);

-- Audit Logs Table
CREATE TABLE audit_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT,
  action VARCHAR(255) NOT NULL,
  resource_type VARCHAR(100) NOT NULL,
  resource_id INT,
  details JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Create an admin user for initial setup (password: admin123)
-- Password should be hashed in production
INSERT INTO users (email, password, role, status) 
VALUES ('admin@example.com', 'admin123', 'admin', 'active');

-- Create indexes for better performance
CREATE INDEX idx_managed_accounts_owner ON managed_accounts(owner_id);
CREATE INDEX idx_managed_accounts_manager ON managed_accounts(manager_id);
CREATE INDEX idx_tasks_account ON tasks(account_id);
CREATE INDEX idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX idx_messages_sender ON messages(sender_id);
CREATE INDEX idx_messages_receiver ON messages(receiver_id);
CREATE INDEX idx_messages_account ON messages(account_id);


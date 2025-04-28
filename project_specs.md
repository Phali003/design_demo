# Account Management Platform - Project Specifications

## 1. Project Overview

The Account Management Platform is a full-service account management system designed to connect account owners with our company, where we handle all aspects of account management for them. This includes moderation, content management, engagement, and any other tasks the account owner needs assistance with.

### Key Features:

1. **Account Submission System**

   - Account owners submit their accounts to the platform
   - Accounts are assigned to a team of trusted managers
   - Owners can provide specific instructions for managing the account

2. **Account Manager Dashboard**

   - Secure dashboard for company team to manage accounts
   - Each account has its own dashboard with assigned tasks and progress tracking

3. **Task Assignment and Tracking**

   - Account owners can outline tasks for the team (e.g., daily posts, responding to messages, engagement)
   - Real-time task tracking and progress updates for transparency

4. **Security and Privacy**

   - Protection for account credentials and personal information
   - Secure login processes and data encryption

5. **Team Management**

   - Assignment of account managers based on expertise and reliability
   - System for verifying and vetting managers to ensure trustworthiness

6. **Real-time Chat Communication**

   - Live chat between account owners and managers
   - Message history, read receipts, and typing indicators

7. **Reporting**
   - Regular reports on account status and progress
   - Metrics including engagement stats, task completion, and other relevant metrics

## 2. Database Schema Design

```sql
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
```

## 3. API Endpoints Structure

### A. Authentication

```
POST /api/auth/register       # Register new user
POST /api/auth/login          # User login
GET /api/auth/me              # Get current user profile
PUT /api/auth/me              # Update current user profile
GET /api/auth/users           # Admin: Get all users
GET /api/auth/users/:id       # Admin: Get user by ID
PUT /api/auth/users/:id       # Admin: Update user
DELETE /api/auth/users/:id    # Admin: Delete user
```

### B. Account Management

```
POST /api/accounts/submit               # Submit account for management
GET /api/accounts/:id                   # Get account details
PUT /api/accounts/:id                   # Update account details
GET /api/accounts/owner/:ownerId        # Get all accounts for an owner
GET /api/accounts/manager/:managerId    # Get all accounts assigned to a manager
PUT /api/accounts/:id/status            # Update account status
POST /api/accounts/:id/manager          # Assign manager to account
POST /api/accounts/:id/instructions     # Update account instructions
```

### C. Task Management

```
POST /api/tasks                        # Create new task
GET /api/tasks/:id                     # Get task by ID
PUT /api/tasks/:id                     # Update task
DELETE /api/tasks/:id                  # Delete task
GET /api/tasks/account/:accountId      # Get tasks for an account
GET /api/tasks/manager/:managerId      # Get tasks assigned to a manager
PUT /api/tasks/:id/status              # Update task status
PUT /api/tasks/:id/progress            # Update task progress
POST /api/tasks/:id/assign             # Assign task to a manager
```

### D. Team Management

```
POST /api/managers                     # Create/register a manager
GET /api/managers                      # Get all managers
PUT /api/managers/:id/verify           # Verify a manager
POST /api/managers/:id/assign          # Assign manager to account
GET /api/managers/available            # Get available managers
```

### E. Chat System

```
POST /api/messages                      # Send a message
GET /api/messages/conversation/:accountId  # Get conversation for an account
PUT /api/messages/:id/status            # Update message status
GET /api/messages/unread                # Get unread messages
```

### F. Reporting

```
GET /api/reports/account/:accountId     # Get reports for an account
POST /api/reports/generate              # Generate a new report
GET /api/reports/metrics/:accountId     # Get metrics for an account
```

## 4. Security Implementation

### A. Authentication

- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Session management
- Two-factor authentication (2FA) for sensitive operations

### B. Data Security

- Encryption for stored credentials and sensitive data
- Data masking for sensitive information
- API rate limiting to prevent abuse
- Request validation middleware
- Prevention of SQL injection through parameterized queries
- HTTPS for all communication

### C. Authorization Checks

- Role-based middleware to protect routes
- Resource-level authorization checks
- Audit logging for sensitive operations

## 5. Required Dependencies

```json
{
  "dependencies": {
    "express": "^4.17.1",
    "mysql2": "^2.3.0",
    "jsonwebtoken": "^8.5.1",
    "bcrypt": "^5.0.1",
    "dotenv": "^10.0.0",
    "helmet": "^4.6.0",
    "cors": "^2.8.5",
    "socket.io": "^4.5.0",
    "joi": "^17.4.2",
    "winston": "^3.3.3",
    "nodemailer": "^6.6.3"
  }
}
```

## 6. WebSocket Events for Real-time Features

```
- user:connect                # User connects to the system
- user:disconnect             # User disconnects from the system
- message:send                # User sends a message
- message:received            # User receives a message
- message:read                # User reads a message
- task:updated                # Task is updated
- account:statusChange        # Account status is changed
- user:typing                 # User is typing a message
```

## 7. Implementation Progress Tracking

### Authentication System

- [x] User model
- [x] Authentication controller
- [x] Authentication routes
- [x] Authentication middleware
- [x] Error handling middleware

### Account Management System

- [x] Managed account model
- [x] Account controller
- [x] Account routes

### Task Management System

- [x] Task model
- [x] Task controller
- [x] Task routes

### Team Management System

- [ ] Manager profile model
- [ ] Team management controller
- [ ] Team management routes

### Chat System

- [ ] Message model
- [ ] Chat controller
- [ ] Chat routes
- [ ] Socket.IO integration

### Reporting System

- [ ] Report model
- [ ] Report controller
- [ ] Report routes
- [ ] Report generation logic

### UI Components (For Future)

- [ ] Authentication pages
- [ ] Account submission interface
- [ ] Task management interface
- [ ] Manager dashboard
- [ ] Chat interface
- [ ] Reports and analytics dashboard

## 8. Additional Implementation Notes

The implementation follows RESTful principles, includes proper error handling, logging, and maintains audit trails for all sensitive operations. Each endpoint includes appropriate validation middleware and role-based access controls. The real-time communication features are implemented using Socket.IO for instant updates between account owners and managers.

The code is organized in a modular structure with separate folders for models, controllers, routes, middleware, and utility functions to maintain clear separation of concerns and enhance maintainability.

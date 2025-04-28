require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');

// Import configuration
const logger = require('./config/logger');
const { testConnection } = require('./config/database');

// Import middleware
const { errorHandler, notFound } = require('./middleware/error.middleware');

// Import routes
const authRoutes = require('./routes/auth.routes');
// const accountRoutes = require('./routes/account.routes');
// const taskRoutes = require('./routes/task.routes');
// const managerRoutes = require('./routes/manager.routes');
// const messageRoutes = require('./routes/message.routes');
// const reportRoutes = require('./routes/report.routes');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Account Management Platform API' });
});

// Register route groups
app.use('/api/auth', authRoutes);
// app.use('/api/accounts', accountRoutes);
// app.use('/api/tasks', taskRoutes);
// app.use('/api/managers', managerRoutes);
// app.use('/api/messages', messageRoutes);
// app.use('/api/reports', reportRoutes);

// Socket.IO Connection Handler
io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Handle user connecting to a room (e.g., for a specific account)
  socket.on('join:room', (accountId) => {
    socket.join(`account-${accountId}`);
    logger.info(`Socket ${socket.id} joined room: account-${accountId}`);
  });

  // Handle message sending
  socket.on('message:send', (data) => {
    // Broadcast to the specific room
    io.to(`account-${data.accountId}`).emit('message:received', data);
    logger.info(`Message sent to room: account-${data.accountId}`);
  });

  // Handle typing indicator
  socket.on('user:typing', (data) => {
    socket.to(`account-${data.accountId}`).emit('user:typing', {
      userId: data.userId,
      accountId: data.accountId,
      isTyping: data.isTyping
    });
  });

  // Handle message read status
  socket.on('message:read', (data) => {
    socket.to(`account-${data.accountId}`).emit('message:read', {
      messageId: data.messageId,
      accountId: data.accountId,
      userId: data.userId
    });
  });

  // Handle task updates
  socket.on('task:updated', (data) => {
    io.to(`account-${data.accountId}`).emit('task:updated', data);
  });

  // Handle account status changes
  socket.on('account:statusChange', (data) => {
    io.to(`account-${data.accountId}`).emit('account:statusChange', data);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Use error handling middleware
app.use(notFound);
app.use(errorHandler);

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  console.log(`Server running on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  logger.error('UNHANDLED REJECTION! Shutting down...', err);
  console.error('UNHANDLED REJECTION!', err.message);
  
  server.close(() => {
    process.exit(1);
  });
});

module.exports = { app, server, io };


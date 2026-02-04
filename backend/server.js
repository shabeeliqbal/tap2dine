const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

// Import routes
const authRoutes = require('./routes/auth');
const tableRoutes = require('./routes/tables');
const menuRoutes = require('./routes/menu');
const orderRoutes = require('./routes/orders');
const restaurantRoutes = require('./routes/restaurants');
const reportsRoutes = require('./routes/reports');
const staffRoutes = require('./routes/staff');

// Import database
const db = require('./config/database');

const app = express();
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL === '*' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
  }
});

// Make io accessible to routes
app.set('io', io);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL === '*' ? true : (process.env.FRONTEND_URL || 'http://localhost:3000'),
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files for uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/tables', tableRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/staff', staffRoutes);

// Root route for cPanel health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'tap2dine API is running',
    timestamp: new Date().toISOString() 
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join restaurant room for admin
  socket.on('join-restaurant', (restaurantId) => {
    socket.join(`restaurant-${restaurantId}`);
    console.log(`Socket ${socket.id} joined restaurant-${restaurantId}`);
  });

  // Join order room for customer
  socket.on('join-order', (orderId) => {
    socket.join(`order-${orderId}`);
    console.log(`Socket ${socket.id} joined order-${orderId}`);
  });

  // Join table room
  socket.on('join-table', (tableId) => {
    socket.join(`table-${tableId}`);
    console.log(`Socket ${socket.id} joined table-${tableId}`);
  });

  // Join staff/waiter room for notifications
  socket.on('join-staff', (staffId) => {
    socket.join(`staff-${staffId}`);
    console.log(`Socket ${socket.id} joined staff-${staffId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// cPanel Phusion Passenger support
// Passenger uses 'passenger' as a special socket path
if (typeof(PhusionPassenger) !== 'undefined') {
  PhusionPassenger.configure({ autoInstall: false });
}

const PORT = process.env.PORT || 5000;

// Listen on 'passenger' socket if available (cPanel), otherwise use PORT
server.listen(typeof(PhusionPassenger) !== 'undefined' ? 'passenger' : PORT, () => {
  console.log(`🚀 Server running`);
  console.log(`📱 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Passenger: ${typeof(PhusionPassenger) !== 'undefined' ? 'YES' : 'NO'}`);
});

module.exports = { app, io };

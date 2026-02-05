const jwt = require('jsonwebtoken');
const db = require('../config/database');

// JWT Secret - ensure it's set consistently
const JWT_SECRET = process.env.JWT_SECRET || 'tap2dine-dev-secret-change-in-production';

const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from database
    const [users] = await db.query(
      'SELECT id, email, name FROM users WHERE id = ?',
      [decoded.userId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found.'
      });
    }

    req.user = users[0];
    
    // Get user's restaurant
    const [restaurants] = await db.query(
      'SELECT id FROM restaurants WHERE user_id = ?',
      [req.user.id]
    );
    
    if (restaurants.length > 0) {
      req.restaurantId = restaurants[0].id;
    }

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};

// Staff auth middleware
const staffAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if this is a staff token
    if (!decoded.staffId) {
      return res.status(401).json({
        success: false,
        message: 'Invalid staff token.'
      });
    }

    // Get staff from database
    const [staff] = await db.query(
      'SELECT id, login_id, name, role, restaurant_id, is_active FROM staff WHERE id = ?',
      [decoded.staffId]
    );

    if (staff.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Staff not found.'
      });
    }

    if (!staff[0].is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled.'
      });
    }

    req.staff = staff[0];
    req.restaurantId = staff[0].restaurant_id;
    req.staffRole = staff[0].role;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    console.error('Staff auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};

// Superadmin auth middleware
const superAdminAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const token = authHeader.split(' ')[1];
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Check if this is a superadmin token
    if (!decoded.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Superadmin only.'
      });
    }

    req.isSuperAdmin = true;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    console.error('Superadmin auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error.'
    });
  }
};

module.exports = { authMiddleware: auth, staffAuthMiddleware: staffAuth, superAdminAuthMiddleware: superAdminAuth };


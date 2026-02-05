const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

// JWT Secret - ensure it's set
const JWT_SECRET = process.env.JWT_SECRET || 'tap2dine-dev-secret-change-in-production';

// Superadmin credentials (move to environment variables in production)
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL || 'superadmin@tap2dine.com';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'superadmin123';

// Register a new user
const register = async (req, res) => {
  try {
    const { email, password, name, phone, restaurantName } = req.body;

    // Check if user already exists
    const [existingUsers] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    try {
      // Create user
      const [userResult] = await db.query(
        'INSERT INTO users (email, password, name, phone) VALUES (?, ?, ?, ?)',
        [email, hashedPassword, name, phone || null]
      );

      const userId = userResult.insertId;

      // Create restaurant
      const [restaurantResult] = await db.query(
        'INSERT INTO restaurants (user_id, name) VALUES (?, ?)',
        [userId, restaurantName || `${name}'s Restaurant`]
      );

      // Generate token
      const token = jwt.sign(
        { userId },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          user: {
            id: userId,
            email,
            name
          },
          restaurant: {
            id: restaurantResult.insertId,
            name: restaurantName || `${name}'s Restaurant`
          },
          token
        }
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if superadmin login
    if (email === SUPERADMIN_EMAIL && password === SUPERADMIN_PASSWORD) {
      const token = jwt.sign(
        { isSuperAdmin: true },
        JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
      );

      return res.json({
        success: true,
        message: 'Superadmin login successful',
        data: {
          user: {
            id: 0,
            email: SUPERADMIN_EMAIL,
            name: 'Super Admin'
          },
          restaurant: null,
          token,
          isSuperAdmin: true
        }
      });
    }

    // Find user
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Get restaurant for user
    const [restaurants] = await db.query(
      'SELECT * FROM restaurants WHERE user_id = ?',
      [user.id]
    );
    const restaurant = restaurants.length > 0 ? restaurants[0] : null;

    // Generate token
    const token = jwt.sign(
      { userId: user.id },
      JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        },
        restaurant: restaurant ? {
          id: restaurant.id,
          name: restaurant.name
        } : null,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

// Get current user
const getMe = async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT u.id, u.email, u.name, u.phone, r.id as restaurant_id, r.name as restaurant_name, r.logo_url FROM users u LEFT JOIN restaurants r ON u.id = r.user_id WHERE u.id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone
        },
        restaurant: user.restaurant_id ? {
          id: user.restaurant_id,
          name: user.restaurant_name,
          logo_url: user.logo_url
        } : null
      }
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user info'
    });
  }
};

// Get all admins (superadmin only)
const getAllAdmins = async (req, res) => {
  try {
    const [admins] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, u.created_at, 
              r.id as restaurant_id, r.name as restaurant_name
       FROM users u
       LEFT JOIN restaurants r ON u.id = r.user_id
       ORDER BY u.created_at DESC`
    );

    res.json({
      success: true,
      data: admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        createdAt: admin.created_at,
        restaurant: admin.restaurant_id ? {
          id: admin.restaurant_id,
          name: admin.restaurant_name
        } : null
      }))
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admins'
    });
  }
};

// Update admin credentials (superadmin only)
const updateAdminCredentials = async (req, res) => {
  try {
    const { id } = req.params;
    const { email, password, name } = req.body;

    // Check if admin exists
    const [admins] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (email) {
      // Check if email is already taken by another user
      const [existing] = await db.query(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id]
      );
      if (existing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use by another admin'
        });
      }
      updates.push('email = ?');
      values.push(email);
    }

    if (password) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      updates.push('password = ?');
      values.push(hashedPassword);
    }

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(id);
    await db.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      values
    );

    // Get updated admin
    const [updatedAdmins] = await db.query(
      `SELECT u.id, u.email, u.name, u.phone, 
              r.id as restaurant_id, r.name as restaurant_name
       FROM users u
       LEFT JOIN restaurants r ON u.id = r.user_id
       WHERE u.id = ?`,
      [id]
    );

    const admin = updatedAdmins[0];

    res.json({
      success: true,
      message: 'Admin credentials updated successfully',
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        phone: admin.phone,
        restaurant: admin.restaurant_id ? {
          id: admin.restaurant_id,
          name: admin.restaurant_name
        } : null
      }
    });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin credentials'
    });
  }
};

// Delete admin (superadmin only)
const deleteAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const [admins] = await db.query('SELECT id FROM users WHERE id = ?', [id]);
    if (admins.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    await db.query('DELETE FROM users WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin'
    });
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllAdmins,
  updateAdminCredentials,
  deleteAdmin
};

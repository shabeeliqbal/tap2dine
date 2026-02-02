const db = require('../config/database');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get all staff for restaurant
const getAllStaff = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const [staff] = await db.query(
      'SELECT id, restaurant_id, login_id, name, role, is_active, created_at FROM staff WHERE restaurant_id = ?',
      [restaurantId]
    );

    res.json({
      success: true,
      data: staff
    });
  } catch (error) {
    console.error('Get staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get staff'
    });
  }
};

// Create new staff member
const createStaff = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { loginId, password, name, role } = req.body;

    // Validate role
    if (!['waiter', 'chef'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either "waiter" or "chef"'
      });
    }

    // Check if login ID already exists (globally unique)
    const [existing] = await db.query(
      'SELECT id FROM staff WHERE login_id = ?',
      [loginId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Login ID already exists. Please choose a different one.'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create staff
    const [result] = await db.query(
      `INSERT INTO staff (restaurant_id, login_id, password, name, role, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      [restaurantId, loginId, hashedPassword, name, role, new Date().toISOString(), new Date().toISOString()]
    );

    res.status(201).json({
      success: true,
      message: 'Staff member created successfully',
      data: {
        id: result.insertId,
        login_id: loginId,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Create staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create staff member'
    });
  }
};

// Update staff member
const updateStaff = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { id } = req.params;
    const { name, password, isActive } = req.body;

    // Check if staff exists
    const [staff] = await db.query(
      'SELECT * FROM staff WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (staff.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    // Build update
    let updateQuery = 'UPDATE staff SET updated_at = ?';
    const params = [new Date().toISOString()];

    if (name !== undefined) {
      updateQuery += ', name = ?';
      params.push(name);
    }

    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateQuery += ', password = ?';
      params.push(hashedPassword);
    }

    if (isActive !== undefined) {
      updateQuery += ', is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    updateQuery += ' WHERE id = ? AND restaurant_id = ?';
    params.push(id, restaurantId);

    await db.query(updateQuery, params);

    res.json({
      success: true,
      message: 'Staff member updated successfully'
    });
  } catch (error) {
    console.error('Update staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update staff member'
    });
  }
};

// Delete staff member
const deleteStaff = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { id } = req.params;

    const [result] = await db.query(
      'DELETE FROM staff WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Staff member not found'
      });
    }

    res.json({
      success: true,
      message: 'Staff member deleted successfully'
    });
  } catch (error) {
    console.error('Delete staff error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete staff member'
    });
  }
};

// Staff login
const staffLogin = async (req, res) => {
  try {
    const { loginId, password } = req.body;

    if (!loginId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Login ID and password are required'
      });
    }

    // Find staff by login_id only (login_id should be unique)
    const [staff] = await db.query(
      'SELECT * FROM staff WHERE login_id = ?',
      [loginId]
    );

    if (staff.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const staffMember = staff[0];

    // Check if active
    if (!staffMember.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Account is disabled'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, staffMember.password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Get restaurant info
    const [restaurants] = await db.query(
      'SELECT id, name, logo_url FROM restaurants WHERE id = ?',
      [staffMember.restaurant_id]
    );

    // Generate token
    const token = jwt.sign(
      { 
        staffId: staffMember.id, 
        restaurantId: staffMember.restaurant_id,
        role: staffMember.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      data: {
        staff: {
          id: staffMember.id,
          login_id: staffMember.login_id,
          name: staffMember.name,
          role: staffMember.role
        },
        restaurant: restaurants[0] || null,
        token
      }
    });
  } catch (error) {
    console.error('Staff login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  updateStaff,
  deleteStaff,
  staffLogin
};

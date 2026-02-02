const db = require('../config/database');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

// Get all tables for a restaurant
const getTables = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    // Get tables with waiter info
    const [tables] = await db.query(
      `SELECT t.*, s.name as waiter_name 
       FROM tables t 
       LEFT JOIN staff s ON t.assigned_waiter_id = s.id 
       WHERE t.restaurant_id = ? 
       ORDER BY t.table_number`,
      [restaurantId]
    );

    // Get active orders count for each table
    const [orders] = await db.query(
      `SELECT table_id, COUNT(*) as count FROM orders WHERE restaurant_id = ? AND status IN ('pending', 'received', 'preparing')`,
      [restaurantId]
    );

    // Map active orders to tables
    const tablesWithOrders = tables.map(table => ({
      ...table,
      active_orders: orders.find(o => o.table_id === table.id)?.count || 0
    }));

    res.json({
      success: true,
      data: tablesWithOrders
    });
  } catch (error) {
    console.error('Get tables error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tables'
    });
  }
};

// Get single table by ID
const getTable = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    res.json({
      success: true,
      data: tables[0]
    });
  } catch (error) {
    console.error('Get table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get table'
    });
  }
};

// Get table by QR code (public endpoint for customers)
const getTableByQR = async (req, res) => {
  try {
    const { qrCode } = req.params;

    // Get table by QR code
    const [tables] = await db.query(
      `SELECT * FROM tables WHERE qr_code = ?`,
      [qrCode]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const table = tables[0];

    // Check if table is active (default to true if not set)
    if (table.is_active === 0 || table.is_active === false) {
      return res.status(404).json({
        success: false,
        message: 'Table is inactive'
      });
    }

    // Get restaurant info
    const [restaurants] = await db.query(
      `SELECT * FROM restaurants WHERE id = ?`,
      [table.restaurant_id]
    );

    if (restaurants.length === 0 || restaurants[0].is_active === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found or inactive'
      });
    }

    const restaurant = restaurants[0];

    res.json({
      success: true,
      data: {
        ...table,
        restaurant_name: restaurant.name,
        restaurant_logo: restaurant.logo_url,
        restaurant_id: restaurant.id
      }
    });
  } catch (error) {
    console.error('Get table by QR error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get table'
    });
  }
};

// Create a new table
const createTable = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { tableNumber, capacity } = req.body;

    // Check if table number already exists
    const [existing] = await db.query(
      'SELECT id FROM tables WHERE restaurant_id = ? AND table_number = ?',
      [restaurantId, tableNumber]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Table number already exists'
      });
    }

    // Generate unique QR code
    const qrCode = `TBL-${restaurantId}-${uuidv4().substring(0, 8).toUpperCase()}`;

    const [result] = await db.query(
      'INSERT INTO tables (restaurant_id, table_number, qr_code, capacity) VALUES (?, ?, ?, ?)',
      [restaurantId, tableNumber, qrCode, capacity || 4]
    );

    const [newTable] = await db.query(
      'SELECT * FROM tables WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: newTable[0]
    });
  } catch (error) {
    console.error('Create table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create table'
    });
  }
};

// Update table
const updateTable = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;
    const { tableNumber, capacity, isActive } = req.body;

    // Check if table exists
    const [existing] = await db.query(
      'SELECT id FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Check if new table number conflicts
    if (tableNumber) {
      const [conflict] = await db.query(
        'SELECT id FROM tables WHERE restaurant_id = ? AND table_number = ? AND id != ?',
        [restaurantId, tableNumber, id]
      );

      if (conflict.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Table number already exists'
        });
      }
    }

    await db.query(
      `UPDATE tables SET 
        table_number = COALESCE(?, table_number),
        capacity = COALESCE(?, capacity),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [tableNumber, capacity, isActive, id]
    );

    const [updatedTable] = await db.query(
      'SELECT * FROM tables WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Table updated successfully',
      data: updatedTable[0]
    });
  } catch (error) {
    console.error('Update table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update table'
    });
  }
};

// Delete table
const deleteTable = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [existing] = await db.query(
      'SELECT id FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Check for active orders
    const [activeOrders] = await db.query(
      `SELECT COUNT(*) as count FROM orders 
       WHERE table_id = ? AND status IN ('pending', 'received', 'preparing')`,
      [id]
    );

    if (activeOrders[0].count > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete table with active orders'
      });
    }

    await db.query('DELETE FROM tables WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Table deleted successfully'
    });
  } catch (error) {
    console.error('Delete table error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete table'
    });
  }
};

// Generate QR code image for table
const getQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const table = tables[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const menuUrl = `${frontendUrl}/menu/${table.qr_code}`;

    // Generate QR code as data URL
    const qrDataUrl = await QRCode.toDataURL(menuUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      data: {
        table: table,
        url: menuUrl,
        qrCode: qrDataUrl
      }
    });
  } catch (error) {
    console.error('Get QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate QR code'
    });
  }
};

// Download QR code as image
const downloadQRCode = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const table = tables[0];
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const menuUrl = `${frontendUrl}/menu/${table.qr_code}`;

    // Generate QR code as buffer
    const qrBuffer = await QRCode.toBuffer(menuUrl, {
      width: 500,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="table-${table.table_number}-qr.png"`);
    res.send(qrBuffer);
  } catch (error) {
    console.error('Download QR code error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download QR code'
    });
  }
};

// Assign waiter to table
const assignWaiter = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;
    const { waiterId } = req.body;

    // Check if table exists
    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // If waiterId is provided, verify waiter exists and belongs to restaurant
    if (waiterId) {
      const [staff] = await db.query(
        'SELECT * FROM staff WHERE id = ? AND restaurant_id = ? AND role = ?',
        [waiterId, restaurantId, 'waiter']
      );

      if (staff.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Waiter not found'
        });
      }
    }

    // Update table with assigned waiter (null to unassign)
    await db.query(
      'UPDATE tables SET assigned_waiter_id = ? WHERE id = ?',
      [waiterId || null, id]
    );

    const [updatedTable] = await db.query(
      `SELECT t.*, s.name as waiter_name 
       FROM tables t 
       LEFT JOIN staff s ON t.assigned_waiter_id = s.id 
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: waiterId ? 'Waiter assigned to table' : 'Waiter unassigned from table',
      data: updatedTable[0]
    });
  } catch (error) {
    console.error('Assign waiter error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign waiter'
    });
  }
};

// Get all waiters for a restaurant
const getWaiters = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const [waiters] = await db.query(
      `SELECT id, name, login_id FROM staff WHERE restaurant_id = ? AND role = ? AND is_active = 1`,
      [restaurantId, 'waiter']
    );

    res.json({
      success: true,
      data: waiters
    });
  } catch (error) {
    console.error('Get waiters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get waiters'
    });
  }
};

// Get tables with active orders (for waiter to select)
const getTablesWithOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const staffId = req.staffId;

    // Get tables that have active orders
    const [tables] = await db.query(
      `SELECT DISTINCT t.*, s.name as waiter_name,
       (SELECT COUNT(*) FROM orders o WHERE o.table_id = t.id AND o.status IN ('pending', 'received', 'preparing', 'ready')) as active_orders
       FROM tables t 
       LEFT JOIN staff s ON t.assigned_waiter_id = s.id 
       WHERE t.restaurant_id = ?
       HAVING active_orders > 0
       ORDER BY active_orders DESC, t.table_number`,
      [restaurantId]
    );

    res.json({
      success: true,
      data: tables
    });
  } catch (error) {
    console.error('Get tables with orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get tables'
    });
  }
};

// Self-assign waiter to table
const selfAssignToTable = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;
    const staffId = req.staffId;

    // Verify this is a waiter
    const [staff] = await db.query(
      'SELECT * FROM staff WHERE id = ? AND role = ?',
      [staffId, 'waiter']
    );

    if (staff.length === 0) {
      return res.status(403).json({
        success: false,
        message: 'Only waiters can self-assign to tables'
      });
    }

    // Check if table exists
    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    // Update table with assigned waiter
    await db.query(
      'UPDATE tables SET assigned_waiter_id = ? WHERE id = ?',
      [staffId, id]
    );

    const [updatedTable] = await db.query(
      `SELECT t.*, s.name as waiter_name 
       FROM tables t 
       LEFT JOIN staff s ON t.assigned_waiter_id = s.id 
       WHERE t.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Assigned to table successfully',
      data: updatedTable[0]
    });
  } catch (error) {
    console.error('Self-assign error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign to table'
    });
  }
};

module.exports = {
  getTables,
  getTable,
  getTableByQR,
  createTable,
  updateTable,
  deleteTable,
  getQRCode,
  downloadQRCode,
  assignWaiter,
  getWaiters,
  getTablesWithOrders,
  selfAssignToTable
};

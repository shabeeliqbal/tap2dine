const db = require('../config/database');

// Get restaurant details
const getRestaurant = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const [restaurants] = await db.query(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data: restaurants[0]
    });
  } catch (error) {
    console.error('Get restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get restaurant'
    });
  }
};

// Get restaurant by ID (public)
const getRestaurantPublic = async (req, res) => {
  try {
    const { id } = req.params;

    const [restaurants] = await db.query(
      'SELECT id, name, description, address, phone, logo_url FROM restaurants WHERE id = ? AND is_active = TRUE',
      [id]
    );

    if (restaurants.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Restaurant not found'
      });
    }

    res.json({
      success: true,
      data: restaurants[0]
    });
  } catch (error) {
    console.error('Get restaurant public error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get restaurant'
    });
  }
};

// Update restaurant
const updateRestaurant = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { name, description, address, phone, show_prices, require_customer_name, show_total_at_checkout, tax_percent } = req.body;

    // Handle logo upload
    let logoUrl = undefined;
    if (req.file) {
      logoUrl = `/uploads/logos/${req.file.filename}`;
    }

    // Build update fields
    const updates = {
      name: name || undefined,
      description: description || undefined,
      address: address || undefined,
      phone: phone || undefined,
      logo_url: logoUrl
    };

    // Handle boolean fields
    if (show_prices !== undefined) {
      updates.show_prices = show_prices === 'true' || show_prices === true || show_prices === 1 ? 1 : 0;
    }
    if (require_customer_name !== undefined) {
      updates.require_customer_name = require_customer_name === 'true' || require_customer_name === true || require_customer_name === 1 ? 1 : 0;
    }
    if (show_total_at_checkout !== undefined) {
      updates.show_total_at_checkout = show_total_at_checkout === 'true' || show_total_at_checkout === true || show_total_at_checkout === 1 ? 1 : 0;
    }
    // Handle tax_percent
    if (tax_percent !== undefined) {
      updates.tax_percent = parseFloat(tax_percent) || 0;
    }

    await db.query(
      `UPDATE restaurants SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        address = COALESCE(?, address),
        phone = COALESCE(?, phone),
        logo_url = COALESCE(?, logo_url),
        show_prices = COALESCE(?, show_prices),
        require_customer_name = COALESCE(?, require_customer_name),
        show_total_at_checkout = COALESCE(?, show_total_at_checkout),
        tax_percent = COALESCE(?, tax_percent)
       WHERE id = ?`,
      [updates.name, updates.description, updates.address, updates.phone, updates.logo_url, updates.show_prices, updates.require_customer_name, updates.show_total_at_checkout, updates.tax_percent, restaurantId]
    );

    const [updatedRestaurant] = await db.query(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    res.json({
      success: true,
      message: 'Restaurant updated successfully',
      data: updatedRestaurant[0]
    });
  } catch (error) {
    console.error('Update restaurant error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update restaurant'
    });
  }
};

// Get dashboard stats
const getDashboardStats = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const today = new Date().toISOString().slice(0, 10);

    // Get all orders for this restaurant
    const [allOrders] = await db.query(
      `SELECT * FROM orders WHERE restaurant_id = ?`,
      [restaurantId]
    );

    // Filter today's orders
    const todayOrders = allOrders.filter(o => 
      o.created_at && o.created_at.slice(0, 10) === today
    );

    // Calculate today's stats
    const todayStats = {
      total_orders: todayOrders.length,
      total_revenue: todayOrders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
      pending_orders: todayOrders.filter(o => o.status === 'pending').length,
      received_orders: todayOrders.filter(o => o.status === 'received').length,
      preparing_orders: todayOrders.filter(o => o.status === 'preparing').length,
      ready_orders: todayOrders.filter(o => o.status === 'ready').length,
      completed_orders: todayOrders.filter(o => o.status === 'completed').length,
      cancelled_orders: todayOrders.filter(o => o.status === 'cancelled').length
    };

    // Get tables
    const [tables] = await db.query(
      'SELECT * FROM tables WHERE restaurant_id = ?',
      [restaurantId]
    );
    const tableCount = tables.filter(t => t.is_active === 1 || t.is_active === true).length;

    // Get menu items
    const [menuItems] = await db.query(
      'SELECT * FROM menu_items WHERE restaurant_id = ?',
      [restaurantId]
    );

    // Get active orders count
    const activeOrdersCount = allOrders.filter(o => 
      ['pending', 'received', 'preparing'].includes(o.status)
    ).length;

    res.json({
      success: true,
      data: {
        today: todayStats,
        tables: tableCount,
        menuItems: menuItems.length,
        activeOrders: activeOrdersCount
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get dashboard stats'
    });
  }
};

module.exports = {
  getRestaurant,
  getRestaurantPublic,
  updateRestaurant,
  getDashboardStats
};

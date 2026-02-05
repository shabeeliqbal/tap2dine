const db = require('../config/database');

// Helper function to safely parse JSON (handles already-parsed objects)
const safeJsonParse = (data) => {
  if (!data) return [];
  if (typeof data === 'object') return data; // Already parsed
  try {
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
};

// Generate order number
const generateOrderNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `ORD-${dateStr}-${random}`;
};

// Log order activity
const logOrderActivity = async (data) => {
  try {
    const { orderId, orderNumber, restaurantId, tableId, tableNumber, action, actorType, actorId, actorName, details } = data;
    
    await db.query(
      `INSERT INTO order_activity_log 
        (order_id, order_number, restaurant_id, table_id, table_number, action, actor_type, actor_id, actor_name, details, created_at) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [orderId, orderNumber, restaurantId, tableId, tableNumber, action, actorType, actorId || null, actorName || null, JSON.stringify(details || {}), new Date().toISOString()]
    );
  } catch (error) {
    console.error('Failed to log order activity:', error);
  }
};

// Helper to get order items for orders
const getOrderItems = async (orderIds) => {
  if (!orderIds || orderIds.length === 0) return {};
  
  // Sanitize orderIds to ensure they are integers (prevent SQL injection)
  const sanitizedIds = orderIds.map(id => parseInt(id, 10)).filter(id => !isNaN(id));
  if (sanitizedIds.length === 0) return {};
  
  const [orderItems] = await db.query(
    `SELECT * FROM order_items WHERE order_id IN (${sanitizedIds.join(',')})`,
    []
  );
  
  const [menuItems] = await db.query(`SELECT * FROM menu_items`, []);
  const menuMap = {};
  menuItems.forEach(m => menuMap[m.id] = m);
  
  const itemsByOrder = {};
  orderItems.forEach(oi => {
    if (!itemsByOrder[oi.order_id]) itemsByOrder[oi.order_id] = [];
    itemsByOrder[oi.order_id].push({
      id: oi.id,
      menu_item_id: oi.menu_item_id,
      name: menuMap[oi.menu_item_id]?.name || 'Unknown',
      quantity: oi.quantity,
      unit_price: oi.unit_price,
      total_price: oi.total_price,
      special_requests: oi.special_requests
    });
  });
  
  return itemsByOrder;
};

// Get all orders for a restaurant (admin)
const getOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { status, date, tableId } = req.query;

    // Get orders
    let [orders] = await db.query(
      `SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC`,
      [restaurantId]
    );

    // Filter by status
    if (status) {
      orders = orders.filter(o => o.status === status);
    }

    // Filter by date
    if (date) {
      orders = orders.filter(o => o.created_at && o.created_at.slice(0, 10) === date);
    }

    // Filter by table
    if (tableId) {
      orders = orders.filter(o => o.table_id === parseInt(tableId));
    }

    // Get tables
    const [tables] = await db.query(`SELECT * FROM tables WHERE restaurant_id = ?`, [restaurantId]);
    const tableMap = {};
    tables.forEach(t => tableMap[t.id] = t);

    // Get order items
    const orderIds = orders.map(o => o.id);
    const itemsByOrder = await getOrderItems(orderIds);

    // Combine data
    const parsedOrders = orders.map(order => ({
      ...order,
      table_number: tableMap[order.table_id]?.table_number || 'Unknown',
      items: itemsByOrder[order.id] || []
    }));

    res.json({
      success: true,
      data: parsedOrders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get orders'
    });
  }
};

// Get active orders (pending, received, preparing)
const getActiveOrders = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    // Get active orders
    let [orders] = await db.query(
      `SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at ASC`,
      [restaurantId]
    );

    // Filter by active status
    orders = orders.filter(o => ['pending', 'received', 'preparing'].includes(o.status));

    // Get tables
    const [tables] = await db.query(`SELECT * FROM tables WHERE restaurant_id = ?`, [restaurantId]);
    const tableMap = {};
    tables.forEach(t => tableMap[t.id] = t);

    // Get order items
    const orderIds = orders.map(o => o.id);
    const itemsByOrder = await getOrderItems(orderIds);

    const parsedOrders = orders.map(order => ({
      ...order,
      table_number: tableMap[order.table_id]?.table_number || 'Unknown',
      items: itemsByOrder[order.id] || []
    }));

    res.json({
      success: true,
      data: parsedOrders
    });
  } catch (error) {
    console.error('Get active orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get active orders'
    });
  }
};

// Get single order
const getOrder = async (req, res) => {
  try {
    const { id } = req.params;

    const [orders] = await db.query(
      `SELECT * FROM orders WHERE id = ?`,
      [id]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Get table
    const [tables] = await db.query(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
    // Get restaurant
    const [restaurants] = await db.query(`SELECT * FROM restaurants WHERE id = ?`, [order.restaurant_id]);
    // Get order items
    const itemsByOrder = await getOrderItems([order.id]);

    const result = {
      ...order,
      table_number: tables[0]?.table_number || 'Unknown',
      restaurant_name: restaurants[0]?.name || 'Unknown',
      items: itemsByOrder[order.id] || []
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order'
    });
  }
};

// Get order by order number (for customers)
const getOrderByNumber = async (req, res) => {
  try {
    const { orderNumber } = req.params;

    const [orders] = await db.query(
      `SELECT * FROM orders WHERE order_number = ?`,
      [orderNumber]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Get table
    const [tables] = await db.query(`SELECT * FROM tables WHERE id = ?`, [order.table_id]);
    // Get restaurant
    const [restaurants] = await db.query(`SELECT * FROM restaurants WHERE id = ?`, [order.restaurant_id]);
    // Get order items
    const itemsByOrder = await getOrderItems([order.id]);

    const result = {
      ...order,
      table_number: tables[0]?.table_number || 'Unknown',
      restaurant_name: restaurants[0]?.name || 'Unknown',
      items: itemsByOrder[order.id] || []
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Get order by number error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order'
    });
  }
};

// Create order (customer)
const createOrder = async (req, res) => {
  try {
    const { tableId, customerName, customerPhone, specialInstructions, items, deviceInfo } = req.body;

    // Validate table exists
    const [allTables] = await db.query(
      `SELECT * FROM tables WHERE id = ?`,
      [tableId]
    );

    // Filter active tables
    const tables = allTables.filter(t => 
      t.is_active === 1 || t.is_active === true || t.is_active === undefined
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found or inactive'
      });
    }

    const table = tables[0];

    // Validate and get menu items
    const itemIds = items.map(i => i.menuItemId);
    const [allMenuItems] = await db.query(
      `SELECT * FROM menu_items WHERE restaurant_id = ?`,
      [table.restaurant_id]
    );
    
    // Filter by IDs and availability
    const menuItems = allMenuItems.filter(m => 
      itemIds.includes(m.id) && (m.is_available === 1 || m.is_available === true)
    );

    if (menuItems.length !== itemIds.length) {
      return res.status(400).json({
        success: false,
        message: 'Some menu items are not available'
      });
    }

    // Calculate total
    let totalAmount = 0;
    const orderItems = items.map(item => {
      const menuItem = menuItems.find(m => m.id === item.menuItemId);
      const totalPrice = menuItem.price * item.quantity;
      totalAmount += totalPrice;
      return {
        menuItemId: item.menuItemId,
        quantity: item.quantity,
        unitPrice: menuItem.price,
        totalPrice,
        specialRequests: item.specialRequests || null
      };
    });

    // Generate order number
    const orderNumber = generateOrderNumber();

    try {
      // Create order
      const [orderResult] = await db.query(
        `INSERT INTO orders 
          (restaurant_id, table_id, order_number, customer_name, customer_phone, special_instructions, total_amount, status, device_info) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [table.restaurant_id, tableId, orderNumber, customerName || null, customerPhone || null, specialInstructions || null, totalAmount, 'pending', deviceInfo || null]
      );

      const orderId = orderResult.insertId;

      // Create order items
      for (const item of orderItems) {
        await db.query(
          `INSERT INTO order_items 
            (order_id, menu_item_id, quantity, unit_price, total_price, special_requests) 
           VALUES (?, ?, ?, ?, ?, ?)`,
          [orderId, item.menuItemId, item.quantity, item.unitPrice, item.totalPrice, item.specialRequests]
        );
      }

      // Get the created order
      const [newOrders] = await db.query(
        `SELECT * FROM orders WHERE id = ?`,
        [orderId]
      );

      // Get table and restaurant info
      const [tableData] = await db.query(`SELECT * FROM tables WHERE id = ?`, [tableId]);
      const [restaurantData] = await db.query(`SELECT * FROM restaurants WHERE id = ?`, [table.restaurant_id]);

      // Get order items
      const [newOrderItems] = await db.query(
        `SELECT * FROM order_items WHERE order_id = ?`,
        [orderId]
      );

      // Add menu item names
      const orderItemsWithNames = newOrderItems.map(oi => {
        const menuItem = menuItems.find(m => m.id === oi.menu_item_id);
        return {
          ...oi,
          name: menuItem?.name || 'Unknown'
        };
      });

      const newOrder = {
        ...newOrders[0],
        table_number: tableData[0]?.table_number || 'Unknown',
        restaurant_name: restaurantData[0]?.name || 'Unknown',
        items: orderItemsWithNames
      };

      // Log the order creation activity
      await logOrderActivity({
        orderId,
        orderNumber,
        restaurantId: table.restaurant_id,
        tableId,
        tableNumber: tableData[0]?.table_number || 'Unknown',
        action: 'order_created',
        actorType: 'customer',
        actorId: null,
        actorName: customerName || 'Customer',
        details: {
          items: orderItemsWithNames.map(i => ({ name: i.name, quantity: i.quantity })),
          totalAmount: totalAmount,
          deviceInfo: deviceInfo || null
        }
      });

      // Emit socket event for real-time update
      const io = req.app.get('io');
      io.to(`restaurant-${table.restaurant_id}`).emit('new-order', newOrder);

      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: newOrder
      });
    } catch (error) {
      throw error;
    }
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order'
    });
  }
};

// Update order status (admin)
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const restaurantId = req.restaurantId;

    const validStatuses = ['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Check if order exists and belongs to restaurant
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Update status
    await db.query(
      'UPDATE orders SET status = ? WHERE id = ?',
      [status, id]
    );

    // Add to status history
    await db.query(
      'INSERT INTO order_status_history (order_id, status) VALUES (?, ?)',
      [id, status]
    );

    // Get updated order
    const [updatedOrders] = await db.query(
      `SELECT o.*, t.table_number, t.assigned_waiter_id
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE o.id = ?`,
      [id]
    );

    const updatedOrder = updatedOrders[0];

    // Emit socket events for real-time update
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('order-updated', updatedOrder);
    io.to(`order-${id}`).emit('status-updated', { orderId: id, status });
    io.to(`table-${updatedOrder.table_id}`).emit('order-status-changed', { orderId: id, status });

    // Notify assigned waiter when order is ready
    if (status === 'ready' && updatedOrder.assigned_waiter_id) {
      io.to(`staff-${updatedOrder.assigned_waiter_id}`).emit('order-ready', {
        orderId: id,
        orderNumber: updatedOrder.order_number,
        tableNumber: updatedOrder.table_number,
        message: `Order ${updatedOrder.order_number} for Table ${updatedOrder.table_number} is ready for delivery!`
      });
    }

    res.json({
      success: true,
      message: 'Order status updated',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
};

// Get order history for a specific date
const getOrderHistory = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { date } = req.query;

    const targetDate = date || new Date().toISOString().slice(0, 10);

    // Get orders for the date
    let [orders] = await db.query(
      `SELECT * FROM orders WHERE restaurant_id = ? ORDER BY created_at DESC`,
      [restaurantId]
    );

    // Filter by date
    orders = orders.filter(o => o.created_at && o.created_at.slice(0, 10) === targetDate);

    // Get tables
    const [tables] = await db.query(`SELECT * FROM tables WHERE restaurant_id = ?`, [restaurantId]);
    const tableMap = {};
    tables.forEach(t => tableMap[t.id] = t);

    // Get order items
    const orderIds = orders.map(o => o.id);
    const itemsByOrder = await getOrderItems(orderIds);

    // Calculate summary
    const summary = {
      total_orders: orders.length,
      total_revenue: orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
      completed_orders: orders.filter(o => o.status === 'completed').length,
      cancelled_orders: orders.filter(o => o.status === 'cancelled').length
    };

    const parsedOrders = orders.map(order => ({
      ...order,
      table_number: tableMap[order.table_id]?.table_number || 'Unknown',
      items: itemsByOrder[order.id] || []
    }));

    res.json({
      success: true,
      data: {
        date: targetDate,
        summary: summary,
        orders: parsedOrders
      }
    });
  } catch (error) {
    console.error('Get order history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get order history'
    });
  }
};

// Get orders for a specific table
const getTableOrders = async (req, res) => {
  try {
    const { tableId } = req.params;

    // Get orders for this table
    let [orders] = await db.query(
      `SELECT * FROM orders WHERE table_id = ? ORDER BY created_at DESC`,
      [tableId]
    );

    // Filter out completed/cancelled
    orders = orders.filter(o => !['completed', 'cancelled'].includes(o.status));

    if (orders.length === 0) {
      return res.json({
        success: true,
        data: []
      });
    }

    // Get table info
    const [tables] = await db.query(`SELECT * FROM tables WHERE id = ?`, [tableId]);
    const table = tables[0];

    // Get restaurant info
    const [restaurants] = await db.query(`SELECT * FROM restaurants WHERE id = ?`, [table?.restaurant_id]);

    // Get order items
    const orderIds = orders.map(o => o.id);
    const itemsByOrder = await getOrderItems(orderIds);

    const parsedOrders = orders.map(order => ({
      ...order,
      table_number: table?.table_number || 'Unknown',
      restaurant_name: restaurants[0]?.name || 'Unknown',
      items: itemsByOrder[order.id] || []
    }));

    res.json({
      success: true,
      data: parsedOrders
    });
  } catch (error) {
    console.error('Get table orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get table orders'
    });
  }
};

// Add items to an existing order (for waiters)
const addItemsToOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { items, addedBy } = req.body;
    const restaurantId = req.restaurantId;

    // Check if order exists
    const [orders] = await db.query(
      'SELECT * FROM orders WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Only allow adding items to pending/received/preparing orders
    if (!['pending', 'received', 'preparing'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot add items to this order'
      });
    }

    // Get current order items
    let existingItems = [];
    try {
      existingItems = JSON.parse(order.items || '[]');
    } catch (e) {
      existingItems = [];
    }

    // Calculate new items total
    let additionalTotal = 0;
    const newItems = [];
    
    for (const item of items) {
      const [menuItems] = await db.query(
        'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?',
        [item.menuItemId, restaurantId]
      );

      if (menuItems.length === 0) {
        continue;
      }

      const menuItem = menuItems[0];
      const itemTotal = menuItem.price * item.quantity;
      additionalTotal += itemTotal;

      newItems.push({
        id: menuItem.id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: item.quantity,
        special_requests: item.specialRequests || null,
        added_by: addedBy || 'waiter'
      });
    }

    // Combine existing and new items
    const allItems = [...existingItems, ...newItems];
    const newTotal = parseFloat(order.total_amount) + additionalTotal;

    // Update order
    await db.query(
      'UPDATE orders SET items = ?, total_amount = ? WHERE id = ?',
      [JSON.stringify(allItems), newTotal, id]
    );

    // Get updated order
    const [updatedOrders] = await db.query(
      `SELECT o.*, t.table_number
       FROM orders o
       JOIN tables t ON o.table_id = t.id
       WHERE o.id = ?`,
      [id]
    );

    const updatedOrder = {
      ...updatedOrders[0],
      items: allItems
    };

    // Log the items added activity
    await logOrderActivity({
      orderId: id,
      orderNumber: order.order_number,
      restaurantId,
      tableId: order.table_id,
      tableNumber: updatedOrders[0]?.table_number || 'Unknown',
      action: 'items_added',
      actorType: 'waiter',
      actorId: req.staff?.id || null,
      actorName: addedBy || req.staff?.name || 'Waiter',
      details: {
        items: newItems.map(i => ({ name: i.name, quantity: i.quantity })),
        additionalTotal: additionalTotal
      }
    });

    // Emit socket event
    const io = req.app.get('io');
    io.to(`restaurant-${restaurantId}`).emit('order-updated', updatedOrder);
    io.to(`order-${id}`).emit('items-added', { orderId: id, newItems });

    res.json({
      success: true,
      message: 'Items added to order',
      data: updatedOrder
    });
  } catch (error) {
    console.error('Add items to order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add items to order'
    });
  }
};

// Get order activity log (admin only)
const getActivityLog = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { startDate, endDate, orderId } = req.query;

    // Get activity log
    let [logs] = await db.query(
      `SELECT * FROM order_activity_log WHERE restaurant_id = ? ORDER BY created_at DESC`,
      [restaurantId]
    );

    // Filter by date range
    if (startDate) {
      logs = logs.filter(log => log.created_at >= startDate);
    }
    if (endDate) {
      logs = logs.filter(log => log.created_at <= endDate + 'T23:59:59Z');
    }

    // Filter by order ID
    if (orderId) {
      logs = logs.filter(log => log.order_id === parseInt(orderId));
    }

    // Parse details JSON
    const parsedLogs = logs.map(log => ({
      ...log,
      details: typeof log.details === 'string' ? JSON.parse(log.details) : log.details
    }));

    res.json({
      success: true,
      data: parsedLogs
    });
  } catch (error) {
    console.error('Get activity log error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get activity log'
    });
  }
};

// Get invoice for a table (all orders combined)
const getTableInvoice = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { tableId } = req.params;

    // Get restaurant details (including tax_percent)
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

    const restaurant = restaurants[0];
    const taxPercent = parseFloat(restaurant.tax_percent) || 0;

    // Get table details
    const [tables] = await db.query(
      'SELECT * FROM tables WHERE id = ? AND restaurant_id = ?',
      [tableId, restaurantId]
    );

    if (tables.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Table not found'
      });
    }

    const table = tables[0];

    // Get all non-cancelled orders for this table (active orders)
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE table_id = ? AND restaurant_id = ? AND status NOT IN ('cancelled') ORDER BY created_at ASC`,
      [tableId, restaurantId]
    );

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No orders found for this table'
      });
    }

    // Get all order items
    const orderIds = orders.map(o => o.id);
    const itemsByOrder = await getOrderItems(orderIds);

    // Combine all items
    let allItems = [];
    let subtotal = 0;

    orders.forEach(order => {
      const items = itemsByOrder[order.id] || [];
      items.forEach(item => {
        allItems.push({
          ...item,
          order_number: order.order_number,
          order_id: order.id
        });
        subtotal += parseFloat(item.total_price) || 0;
      });
    });

    // Calculate tax and total
    const taxAmount = (subtotal * taxPercent) / 100;
    const totalAmount = subtotal + taxAmount;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    res.json({
      success: true,
      data: {
        invoice_number: invoiceNumber,
        restaurant: {
          name: restaurant.name,
          address: restaurant.address,
          phone: restaurant.phone,
          logo_url: restaurant.logo_url
        },
        table: {
          id: table.id,
          table_number: table.table_number
        },
        orders: orders.map(o => ({
          id: o.id,
          order_number: o.order_number,
          customer_name: o.customer_name,
          created_at: o.created_at
        })),
        items: allItems,
        subtotal: subtotal,
        tax_percent: taxPercent,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        generated_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Get table invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice'
    });
  }
};

module.exports = {
  getOrders,
  getActiveOrders,
  getOrder,
  getOrderByNumber,
  createOrder,
  updateOrderStatus,
  getOrderHistory,
  getTableOrders,
  addItemsToOrder,
  getActivityLog,
  getTableInvoice
};

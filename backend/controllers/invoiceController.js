const db = require('../config/database');

// Generate unique invoice number
const generateInvoiceNumber = () => {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${dateStr}-${random}`;
};

// Helper to get order items for orders
const getOrderItems = async (orderIds) => {
  if (!orderIds || orderIds.length === 0) return {};
  
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
      name: menuMap[oi.menu_item_id]?.name || 'Unknown Item',
      quantity: oi.quantity,
      unit_price: parseFloat(oi.unit_price),
      total_price: parseFloat(oi.total_price),
      special_requests: oi.special_requests
    });
  });
  
  return itemsByOrder;
};

// Generate and save invoice for a table
const generateInvoice = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { tableId, paymentMethod, notes } = req.body;

    if (!tableId) {
      return res.status(400).json({
        success: false,
        message: 'Table ID is required'
      });
    }

    // Get restaurant details
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

    // Get all unpaid orders for this table
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE table_id = ? AND restaurant_id = ? AND status NOT IN ('cancelled', 'completed') ORDER BY created_at ASC`,
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
    const invoiceNumber = generateInvoiceNumber();

    // Get customer name from first order
    const customerName = orders.find(o => o.customer_name)?.customer_name || null;

    // Save invoice to database
    const [result] = await db.query(
      `INSERT INTO invoices (restaurant_id, invoice_number, table_id, table_number, order_ids, items, subtotal, tax_percent, tax_amount, total_amount, customer_name, payment_method, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurantId,
        invoiceNumber,
        table.id,
        table.table_number,
        JSON.stringify(orderIds),
        JSON.stringify(allItems),
        subtotal,
        taxPercent,
        taxAmount,
        totalAmount,
        customerName,
        paymentMethod || 'cash',
        notes || null,
        new Date().toISOString()
      ]
    );

    const invoiceId = result.insertId;

    // Mark all orders as completed
    for (const orderId of orderIds) {
      await db.query(
        `UPDATE orders SET status = 'completed', updated_at = ? WHERE id = ?`,
        [new Date().toISOString(), orderId]
      );
    }

    res.json({
      success: true,
      message: 'Invoice generated successfully',
      data: {
        id: invoiceId,
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
        customer_name: customerName,
        payment_method: paymentMethod || 'cash',
        notes: notes || null,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Generate invoice error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate invoice'
    });
  }
};

// Get invoice history
const getInvoiceHistory = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { startDate, endDate, limit = 50, offset = 0 } = req.query;

    let query = `SELECT * FROM invoices WHERE restaurant_id = ?`;
    const params = [restaurantId];

    if (startDate) {
      query += ` AND created_at >= ?`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND created_at <= ?`;
      params.push(endDate + 'T23:59:59.999Z');
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [invoices] = await db.query(query, params);

    // Parse JSON fields
    const parsedInvoices = invoices.map(inv => ({
      ...inv,
      order_ids: typeof inv.order_ids === 'string' ? JSON.parse(inv.order_ids) : inv.order_ids,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
    }));

    // Get total count
    let countQuery = `SELECT COUNT(*) as total FROM invoices WHERE restaurant_id = ?`;
    const countParams = [restaurantId];

    if (startDate) {
      countQuery += ` AND created_at >= ?`;
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += ` AND created_at <= ?`;
      countParams.push(endDate + 'T23:59:59.999Z');
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    res.json({
      success: true,
      data: parsedInvoices,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Get invoice history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice history'
    });
  }
};

// Get invoice by ID
const getInvoiceById = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { id } = req.params;

    const [invoices] = await db.query(
      'SELECT * FROM invoices WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (invoices.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found'
      });
    }

    const invoice = invoices[0];

    // Get restaurant details
    const [restaurants] = await db.query(
      'SELECT name, address, phone, logo_url FROM restaurants WHERE id = ?',
      [restaurantId]
    );

    res.json({
      success: true,
      data: {
        ...invoice,
        order_ids: typeof invoice.order_ids === 'string' ? JSON.parse(invoice.order_ids) : invoice.order_ids,
        items: typeof invoice.items === 'string' ? JSON.parse(invoice.items) : invoice.items,
        restaurant: restaurants[0] || null
      }
    });
  } catch (error) {
    console.error('Get invoice by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice'
    });
  }
};

// Search invoices by invoice number
const searchInvoices = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters'
      });
    }

    const searchTerm = `%${q.trim()}%`;

    const [invoices] = await db.query(
      `SELECT * FROM invoices WHERE restaurant_id = ? AND (invoice_number LIKE ? OR table_number LIKE ? OR customer_name LIKE ?) ORDER BY created_at DESC LIMIT 50`,
      [restaurantId, searchTerm, searchTerm, searchTerm]
    );

    // Parse JSON fields
    const parsedInvoices = invoices.map(inv => ({
      ...inv,
      order_ids: typeof inv.order_ids === 'string' ? JSON.parse(inv.order_ids) : inv.order_ids,
      items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
    }));

    res.json({
      success: true,
      data: parsedInvoices
    });
  } catch (error) {
    console.error('Search invoices error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search invoices'
    });
  }
};

// Get invoice preview (without saving) - for printing preview
const getInvoicePreview = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { tableId } = req.params;

    // Get restaurant details
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

    // Get all unpaid orders for this table
    const [orders] = await db.query(
      `SELECT * FROM orders WHERE table_id = ? AND restaurant_id = ? AND status NOT IN ('cancelled', 'completed') ORDER BY created_at ASC`,
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

    res.json({
      success: true,
      data: {
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
    console.error('Get invoice preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get invoice preview'
    });
  }
};

module.exports = {
  generateInvoice,
  getInvoiceHistory,
  getInvoiceById,
  searchInvoices,
  getInvoicePreview
};

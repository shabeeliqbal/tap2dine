const db = require('../config/database');
const XLSX = require('xlsx');
const PDFDocument = require('pdfkit');

// Get report data
const getReportData = async (restaurantId, period, customStartDate, customEndDate) => {
  const now = new Date();
  let startDate;
  let endDate = now;

  // Check for custom date range
  if (period === 'custom' && customStartDate && customEndDate) {
    startDate = new Date(customStartDate);
    endDate = new Date(customEndDate);
    // Set end date to end of day
    endDate.setHours(23, 59, 59, 999);
  } else {
    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  const startDateStr = startDate.toISOString().slice(0, 10);
  const endDateStr = endDate.toISOString().slice(0, 10);

  // Get all orders
  const [allOrders] = await db.query(
    `SELECT * FROM orders WHERE restaurant_id = ?`,
    [restaurantId]
  );

  // Filter by date
  const orders = allOrders.filter(o => {
    const orderDate = o.created_at ? o.created_at.slice(0, 10) : '';
    return orderDate >= startDateStr && orderDate <= endDateStr;
  });

  // Get order items for these orders
  const orderIds = orders.map(o => o.id);
  const [allOrderItems] = await db.query(
    'SELECT * FROM order_items WHERE order_id IN (?)',
    [orderIds.length > 0 ? orderIds : [0]]
  );

  // Get menu items
  const [menuItems] = await db.query(
    'SELECT * FROM menu_items WHERE restaurant_id = ?',
    [restaurantId]
  );

  // Get tables
  const [tables] = await db.query(
    'SELECT * FROM tables WHERE restaurant_id = ?',
    [restaurantId]
  );

  // Calculate statistics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
  const completedOrders = orders.filter(o => o.status === 'completed').length;
  const cancelledOrders = orders.filter(o => o.status === 'cancelled').length;

  // Calculate dishes sold
  const dishSales = {};
  allOrderItems.forEach(item => {
    const menuItem = menuItems.find(m => m.id === item.menu_item_id);
    if (menuItem) {
      if (!dishSales[menuItem.name]) {
        dishSales[menuItem.name] = {
          name: menuItem.name,
          quantity: 0,
          revenue: 0
        };
      }
      dishSales[menuItem.name].quantity += item.quantity || 0;
      dishSales[menuItem.name].revenue += (item.quantity || 0) * (parseFloat(item.unit_price) || 0);
    }
  });

  const dishSalesArray = Object.values(dishSales).sort((a, b) => b.quantity - a.quantity);

  // Order details
  const orderDetails = orders.map(o => {
    const table = tables.find(t => t.id === o.table_id);
    const items = allOrderItems.filter(i => i.order_id === o.id);
    return {
      orderNumber: o.order_number,
      table: table?.table_number || 'N/A',
      status: o.status,
      total: parseFloat(o.total_amount) || 0,
      customerName: o.customer_name || 'Guest',
      items: items.length,
      createdAt: o.created_at
    };
  });

  // Unique customers
  const uniqueCustomers = new Set(orders.map(o => o.customer_name || o.customer_phone || 'Guest')).size;

  return {
    period,
    startDate: startDateStr,
    endDate: endDateStr,
    summary: {
      totalOrders,
      totalRevenue,
      completedOrders,
      cancelledOrders,
      uniqueCustomers
    },
    dishSales: dishSalesArray,
    orderDetails
  };
};

// Generate Excel report
const generateExcel = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { period = 'daily', startDate, endDate } = req.query;

    const data = await getReportData(restaurantId, period, startDate, endDate);

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryData = [
      ['Report Period', `${period.charAt(0).toUpperCase() + period.slice(1)} Report`],
      ['Date Range', `${data.startDate} to ${data.endDate}`],
      [''],
      ['Summary'],
      ['Total Orders', data.summary.totalOrders],
      ['Total Revenue', `$${data.summary.totalRevenue.toFixed(2)}`],
      ['Completed Orders', data.summary.completedOrders],
      ['Cancelled Orders', data.summary.cancelledOrders],
      ['Unique Customers', data.summary.uniqueCustomers],
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summarySheet, 'Summary');

    // Dish Sales sheet
    const dishHeaders = ['Dish Name', 'Quantity Sold', 'Revenue'];
    const dishRows = data.dishSales.map(d => [d.name, d.quantity, `$${d.revenue.toFixed(2)}`]);
    const dishData = [dishHeaders, ...dishRows];
    const dishSheet = XLSX.utils.aoa_to_sheet(dishData);
    XLSX.utils.book_append_sheet(wb, dishSheet, 'Dish Sales');

    // Order Details sheet
    const orderHeaders = ['Order #', 'Table', 'Customer', 'Items', 'Total', 'Status', 'Date'];
    const orderRows = data.orderDetails.map(o => [
      o.orderNumber,
      o.table,
      o.customerName,
      o.items,
      `$${o.total.toFixed(2)}`,
      o.status,
      o.createdAt
    ]);
    const orderData = [orderHeaders, ...orderRows];
    const orderSheet = XLSX.utils.aoa_to_sheet(orderData);
    XLSX.utils.book_append_sheet(wb, orderSheet, 'Order Details');

    // Generate buffer
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    // Set headers and send
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=report-${period}-${data.endDate}.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Generate Excel error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate Excel report'
    });
  }
};

// Generate PDF report
const generatePdf = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { period = 'daily', startDate, endDate } = req.query;

    const data = await getReportData(restaurantId, period, startDate, endDate);

    // Get restaurant info
    const [restaurants] = await db.query(
      'SELECT * FROM restaurants WHERE id = ?',
      [restaurantId]
    );
    const restaurant = restaurants[0];

    // Create PDF
    const doc = new PDFDocument({ margin: 50 });

    // Set headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=report-${period}-${data.endDate}.pdf`);

    // Pipe to response
    doc.pipe(res);

    // Title
    doc.fontSize(24).text(restaurant?.name || 'Restaurant', { align: 'center' });
    doc.fontSize(16).text(`${period.charAt(0).toUpperCase() + period.slice(1)} Report`, { align: 'center' });
    doc.fontSize(12).text(`${data.startDate} to ${data.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // Summary Section
    doc.fontSize(16).text('Summary', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    doc.text(`Total Orders: ${data.summary.totalOrders}`);
    doc.text(`Total Revenue: $${data.summary.totalRevenue.toFixed(2)}`);
    doc.text(`Completed Orders: ${data.summary.completedOrders}`);
    doc.text(`Cancelled Orders: ${data.summary.cancelledOrders}`);
    doc.text(`Unique Customers: ${data.summary.uniqueCustomers}`);
    doc.moveDown(2);

    // Top Selling Dishes
    doc.fontSize(16).text('Top Selling Dishes', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(12);
    
    const topDishes = data.dishSales.slice(0, 10);
    if (topDishes.length === 0) {
      doc.text('No dishes sold in this period.');
    } else {
      topDishes.forEach((dish, index) => {
        doc.text(`${index + 1}. ${dish.name} - ${dish.quantity} sold ($${dish.revenue.toFixed(2)})`);
      });
    }
    doc.moveDown(2);

    // Recent Orders
    doc.fontSize(16).text('Recent Orders', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10);

    const recentOrders = data.orderDetails.slice(0, 20);
    if (recentOrders.length === 0) {
      doc.text('No orders in this period.');
    } else {
      recentOrders.forEach(order => {
        doc.text(`${order.orderNumber} | Table ${order.table} | ${order.customerName} | $${order.total.toFixed(2)} | ${order.status}`);
      });
    }

    // Footer
    doc.moveDown(2);
    doc.fontSize(10).text(`Generated on ${new Date().toLocaleString()}`, { align: 'center', color: 'gray' });

    // Finalize
    doc.end();
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate PDF report'
    });
  }
};

// Get report preview (JSON)
const getReportPreview = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { period = 'daily', startDate, endDate } = req.query;

    const data = await getReportData(restaurantId, period, startDate, endDate);

    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Get report preview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get report data'
    });
  }
};

module.exports = {
  generateExcel,
  generatePdf,
  getReportPreview
};

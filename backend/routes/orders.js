const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { authMiddleware: auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public routes (for customers)

// Create order (customer)
router.post(
  '/',
  [
    body('tableId').isInt().withMessage('Table ID is required'),
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').isInt().withMessage('Menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('customerName').optional().trim(),
    body('customerPhone').optional().trim(),
    body('specialInstructions').optional().trim()
  ],
  validate,
  orderController.createOrder
);

// Get order by order number (customer)
router.get('/track/:orderNumber', orderController.getOrderByNumber);

// Get orders for a table (customer)
router.get('/table/:tableId', orderController.getTableOrders);

// Protected routes (admin) - these need to come before /:id to avoid route conflicts

// Get all orders (with filters)
router.get('/', auth, orderController.getOrders);

// Get active orders
router.get('/active', auth, orderController.getActiveOrders);

// Get order history
router.get('/history/daily', auth, orderController.getOrderHistory);

// Get order activity log (admin only)
router.get('/activity-log', auth, orderController.getActivityLog);

// Update order status
router.patch(
  '/:id/status',
  auth,
  [
    body('status')
      .isIn(['pending', 'received', 'preparing', 'ready', 'completed', 'cancelled'])
      .withMessage('Invalid status')
  ],
  validate,
  orderController.updateOrderStatus
);

// Add items to an existing order (waiter)
router.post(
  '/:id/items',
  auth,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.menuItemId').isInt().withMessage('Menu item ID is required'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('addedBy').optional().trim()
  ],
  validate,
  orderController.addItemsToOrder
);

// Get single order (customer can access by ID) - must be last due to /:id pattern
router.get('/:id', orderController.getOrder);

module.exports = router;

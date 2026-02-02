const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const tableController = require('../controllers/tableController');
const { authMiddleware: auth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Public route - Get table by QR code
router.get('/qr/:qrCode', tableController.getTableByQR);

// Protected routes
router.use(auth);

// Get all tables
router.get('/', tableController.getTables);

// Get all waiters for assigning to tables
router.get('/waiters', tableController.getWaiters);

// Get tables with active orders (for waiter view)
router.get('/with-orders', tableController.getTablesWithOrders);

// Get single table
router.get('/:id', tableController.getTable);

// Get QR code for table
router.get('/:id/qr', tableController.getQRCode);

// Download QR code
router.get('/:id/qr/download', tableController.downloadQRCode);

// Create table
router.post(
  '/',
  [
    body('tableNumber').trim().notEmpty().withMessage('Table number is required'),
    body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer')
  ],
  validate,
  tableController.createTable
);

// Update table
router.put(
  '/:id',
  [
    body('tableNumber').optional().trim().notEmpty(),
    body('capacity').optional().isInt({ min: 1 }),
    body('isActive').optional().isBoolean()
  ],
  validate,
  tableController.updateTable
);

// Assign waiter to table
router.put(
  '/:id/assign-waiter',
  [
    body('waiterId').optional().isInt().withMessage('Waiter ID must be an integer')
  ],
  validate,
  tableController.assignWaiter
);

// Self-assign waiter to table
router.post('/:id/self-assign', tableController.selfAssignToTable);

// Delete table
router.delete('/:id', tableController.deleteTable);

module.exports = router;

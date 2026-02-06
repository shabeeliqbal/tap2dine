const express = require('express');
const router = express.Router();
const invoiceController = require('../controllers/invoiceController');
const { authMiddleware: auth } = require('../middleware/auth');

// All routes require authentication

// Generate and save invoice
router.post('/', auth, invoiceController.generateInvoice);

// Get invoice history
router.get('/', auth, invoiceController.getInvoiceHistory);

// Search invoices
router.get('/search', auth, invoiceController.searchInvoices);

// Get invoice preview (without saving)
router.get('/preview/:tableId', auth, invoiceController.getInvoicePreview);

// Get invoice by ID
router.get('/:id', auth, invoiceController.getInvoiceById);

module.exports = router;

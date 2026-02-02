const express = require('express');
const router = express.Router();
const reportsController = require('../controllers/reportsController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Get report preview (JSON data)
router.get('/preview', reportsController.getReportPreview);

// Download Excel report
router.get('/excel', reportsController.generateExcel);

// Download PDF report
router.get('/pdf', reportsController.generatePdf);

module.exports = router;

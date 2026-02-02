const express = require('express');
const router = express.Router();
const staffController = require('../controllers/staffController');
const { authMiddleware, staffAuthMiddleware } = require('../middleware/auth');

// Public route for staff login
router.post('/login', staffController.staffLogin);

// Admin routes (requires admin auth)
router.get('/', authMiddleware, staffController.getAllStaff);
router.post('/', authMiddleware, staffController.createStaff);
router.put('/:id', authMiddleware, staffController.updateStaff);
router.delete('/:id', authMiddleware, staffController.deleteStaff);

module.exports = router;

const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware: auth, superAdminAuthMiddleware: superAdminAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Register
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('restaurantName').optional().trim()
  ],
  validate,
  authController.register
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  validate,
  authController.login
);

// Get current user
router.get('/me', auth, authController.getMe);

// Superadmin routes
router.get('/admins', superAdminAuth, authController.getAllAdmins);

router.put(
  '/admins/:id',
  superAdminAuth,
  [
    body('email').optional().isEmail().withMessage('Valid email is required'),
    body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty')
  ],
  validate,
  authController.updateAdminCredentials
);

router.delete('/admins/:id', superAdminAuth, authController.deleteAdmin);

module.exports = router;

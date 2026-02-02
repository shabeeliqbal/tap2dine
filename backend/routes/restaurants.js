const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');
const { authMiddleware: auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upload, setUploadCategory } = require('../middleware/upload');

// Public route
router.get('/public/:id', restaurantController.getRestaurantPublic);

// Protected routes
router.use(auth);

// Get restaurant details
router.get('/', restaurantController.getRestaurant);

// Update restaurant
router.put(
  '/',
  setUploadCategory('logos'),
  upload.single('logo'),
  [
    body('name').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('address').optional().trim(),
    body('phone').optional().trim()
  ],
  validate,
  restaurantController.updateRestaurant
);

// Get dashboard stats
router.get('/dashboard', restaurantController.getDashboardStats);

module.exports = router;

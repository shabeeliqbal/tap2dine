const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authMiddleware: auth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { upload, setUploadCategory } = require('../middleware/upload');

// Public route - Get menu for customers
router.get('/public/:restaurantId', menuController.getPublicMenu);

// Protected routes
router.use(auth);

// ============ Menu Items ============

// Get all menu items
router.get('/', menuController.getMenuItems);

// Get single menu item
router.get('/item/:id', menuController.getMenuItem);

// Create menu item
router.post(
  '/',
  setUploadCategory('menu'),
  upload.single('image'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('price').isFloat({ min: 0 }).withMessage('Valid price is required'),
    body('categoryId').optional().isInt(),
    body('description').optional().trim(),
    body('isAvailable').optional().isBoolean(),
    body('isVegetarian').optional().isBoolean(),
    body('isSpicy').optional().isBoolean(),
    body('preparationTime').optional().isInt({ min: 1 })
  ],
  validate,
  menuController.createMenuItem
);

// Update menu item
router.put(
  '/item/:id',
  setUploadCategory('menu'),
  upload.single('image'),
  menuController.updateMenuItem
);

// Delete menu item
router.delete('/item/:id', menuController.deleteMenuItem);

// Toggle availability
router.patch('/item/:id/toggle', menuController.toggleAvailability);

// ============ Categories ============

// Get all categories
router.get('/categories', menuController.getCategories);

// Create category
router.post(
  '/categories',
  [
    body('name').trim().notEmpty().withMessage('Category name is required'),
    body('description').optional().trim(),
    body('sortOrder').optional().isInt()
  ],
  validate,
  menuController.createCategory
);

// Update category
router.put('/categories/:id', menuController.updateCategory);

// Delete category
router.delete('/categories/:id', menuController.deleteCategory);

module.exports = router;

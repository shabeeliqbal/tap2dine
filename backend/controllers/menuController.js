const db = require('../config/database');

// Get all menu items for a restaurant (admin)
const getMenuItems = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    const [items] = await db.query(
      `SELECT m.*, c.name as category_name 
       FROM menu_items m 
       LEFT JOIN menu_categories c ON m.category_id = c.id 
       WHERE m.restaurant_id = ? 
       ORDER BY c.sort_order, m.sort_order, m.name`,
      [restaurantId]
    );

    res.json({
      success: true,
      data: items
    });
  } catch (error) {
    console.error('Get menu items error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get menu items'
    });
  }
};

// Get menu for customers (by restaurant ID - public)
const getPublicMenu = async (req, res) => {
  try {
    const { restaurantId } = req.params;

    // Get categories
    const [allCategories] = await db.query(
      `SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order`,
      [restaurantId]
    );
    
    // Filter active categories
    const categories = allCategories.filter(c => 
      c.is_active === 1 || c.is_active === true || c.is_active === undefined
    );

    // Get available items
    const [allItems] = await db.query(
      `SELECT * FROM menu_items WHERE restaurant_id = ?`,
      [restaurantId]
    );
    
    // Filter available items
    const items = allItems.filter(m => 
      m.is_available === 1 || m.is_available === true
    );

    // Sort items
    items.sort((a, b) => {
      const catA = categories.find(c => c.id === a.category_id)?.sort_order || 999;
      const catB = categories.find(c => c.id === b.category_id)?.sort_order || 999;
      if (catA !== catB) return catA - catB;
      if ((a.sort_order || 0) !== (b.sort_order || 0)) return (a.sort_order || 0) - (b.sort_order || 0);
      return (a.name || '').localeCompare(b.name || '');
    });

    // Add category name to items
    const itemsWithCategory = items.map(item => ({
      ...item,
      category_name: categories.find(c => c.id === item.category_id)?.name || 'Other'
    }));

    // Group items by category
    const menuByCategory = categories.map(cat => ({
      ...cat,
      items: itemsWithCategory.filter(item => item.category_id === cat.id)
    }));

    // Add uncategorized items
    const uncategorized = itemsWithCategory.filter(item => !item.category_id);
    if (uncategorized.length > 0) {
      menuByCategory.push({
        id: null,
        name: 'Other',
        items: uncategorized
      });
    }

    // Get restaurant settings for show_prices, require_customer_name, show_total_at_checkout
    const [restaurants] = await db.query(
      'SELECT show_prices, require_customer_name, show_total_at_checkout FROM restaurants WHERE id = ?',
      [restaurantId]
    );
    const restaurantSettings = restaurants.length > 0 ? restaurants[0] : {};
    const showPrices = restaurantSettings.show_prices === 1 || restaurantSettings.show_prices === true || restaurantSettings.show_prices === undefined;
    const requireCustomerName = restaurantSettings.require_customer_name === 1 || restaurantSettings.require_customer_name === true;
    const showTotalAtCheckout = restaurantSettings.show_total_at_checkout === 1 || restaurantSettings.show_total_at_checkout === true || restaurantSettings.show_total_at_checkout === undefined;

    res.json({
      success: true,
      data: {
        categories: menuByCategory,
        allItems: itemsWithCategory,
        showPrices: showPrices,
        requireCustomerName: requireCustomerName,
        showTotalAtCheckout: showTotalAtCheckout
      }
    });
  } catch (error) {
    console.error('Get public menu error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get menu'
    });
  }
};

// Get single menu item
const getMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [items] = await db.query(
      `SELECT m.*, c.name as category_name 
       FROM menu_items m 
       LEFT JOIN menu_categories c ON m.category_id = c.id 
       WHERE m.id = ? AND m.restaurant_id = ?`,
      [id, restaurantId]
    );

    if (items.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    res.json({
      success: true,
      data: items[0]
    });
  } catch (error) {
    console.error('Get menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get menu item'
    });
  }
};

// Create menu item
const createMenuItem = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const {
      name,
      description,
      price,
      categoryId,
      isAvailable,
      isVegetarian,
      isSpicy,
      preparationTime,
      quantityType,
      quantityValue
    } = req.body;

    // Handle image upload
    let imageUrl = null;
    if (req.file) {
      imageUrl = `/uploads/menu/${req.file.filename}`;
    }

    const [result] = await db.query(
      `INSERT INTO menu_items 
        (restaurant_id, category_id, name, description, price, image_url, is_available, is_vegetarian, is_spicy, preparation_time, quantity_type, quantity_value) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        restaurantId,
        categoryId || null,
        name,
        description || null,
        price,
        imageUrl,
        isAvailable !== false,
        isVegetarian || false,
        isSpicy || false,
        preparationTime || 15,
        quantityType || null,
        quantityValue || null
      ]
    );

    const [newItem] = await db.query(
      `SELECT m.*, c.name as category_name 
       FROM menu_items m 
       LEFT JOIN menu_categories c ON m.category_id = c.id 
       WHERE m.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Menu item created successfully',
      data: newItem[0]
    });
  } catch (error) {
    console.error('Create menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create menu item'
    });
  }
};

// Update menu item
const updateMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;
    const {
      name,
      description,
      price,
      categoryId,
      isAvailable,
      isVegetarian,
      isSpicy,
      preparationTime,
      quantityType,
      quantityValue
    } = req.body;

    // Check if item exists
    const [existing] = await db.query(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Handle image upload
    let imageUrl = existing[0].image_url;
    if (req.file) {
      imageUrl = `/uploads/menu/${req.file.filename}`;
    }

    await db.query(
      `UPDATE menu_items SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        category_id = ?,
        image_url = COALESCE(?, image_url),
        is_available = COALESCE(?, is_available),
        is_vegetarian = COALESCE(?, is_vegetarian),
        is_spicy = COALESCE(?, is_spicy),
        preparation_time = COALESCE(?, preparation_time),
        quantity_type = ?,
        quantity_value = ?
       WHERE id = ?`,
      [
        name,
        description,
        price,
        categoryId !== undefined ? categoryId : existing[0].category_id,
        imageUrl,
        isAvailable,
        isVegetarian,
        isSpicy,
        preparationTime,
        quantityType !== undefined ? quantityType : existing[0].quantity_type,
        quantityValue !== undefined ? quantityValue : existing[0].quantity_value,
        id
      ]
    );

    const [updatedItem] = await db.query(
      `SELECT m.*, c.name as category_name 
       FROM menu_items m 
       LEFT JOIN menu_categories c ON m.category_id = c.id 
       WHERE m.id = ?`,
      [id]
    );

    res.json({
      success: true,
      message: 'Menu item updated successfully',
      data: updatedItem[0]
    });
  } catch (error) {
    console.error('Update menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update menu item'
    });
  }
};

// Delete menu item
const deleteMenuItem = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [existing] = await db.query(
      'SELECT id FROM menu_items WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    await db.query('DELETE FROM menu_items WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Menu item deleted successfully'
    });
  } catch (error) {
    console.error('Delete menu item error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete menu item'
    });
  }
};

// Toggle availability
const toggleAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [existing] = await db.query(
      'SELECT * FROM menu_items WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Menu item not found'
      });
    }

    // Toggle the availability (JSON DB doesn't support NOT operator in UPDATE)
    const newAvailability = existing[0].is_available ? 0 : 1;
    await db.query(
      'UPDATE menu_items SET is_available = ? WHERE id = ?',
      [newAvailability, id]
    );

    const [updatedItem] = await db.query(
      'SELECT * FROM menu_items WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: `Menu item ${updatedItem[0].is_available ? 'enabled' : 'disabled'}`,
      data: updatedItem[0]
    });
  } catch (error) {
    console.error('Toggle availability error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to toggle availability'
    });
  }
};

// ============ Categories ============

// Get all categories
const getCategories = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;

    // Get categories
    const [categories] = await db.query(
      `SELECT * FROM menu_categories WHERE restaurant_id = ? ORDER BY sort_order`,
      [restaurantId]
    );

    // Get item counts per category
    const [menuItems] = await db.query(
      `SELECT category_id FROM menu_items WHERE restaurant_id = ?`,
      [restaurantId]
    );

    // Count items per category
    const itemCounts = {};
    menuItems.forEach(item => {
      itemCounts[item.category_id] = (itemCounts[item.category_id] || 0) + 1;
    });

    // Map counts to categories
    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      item_count: itemCounts[cat.id] || 0
    }));

    res.json({
      success: true,
      data: categoriesWithCounts
    });
  } catch (error) {
    console.error('Get categories error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get categories'
    });
  }
};

// Create category
const createCategory = async (req, res) => {
  try {
    const restaurantId = req.restaurantId;
    const { name, description, sortOrder } = req.body;

    const [result] = await db.query(
      'INSERT INTO menu_categories (restaurant_id, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [restaurantId, name, description || null, sortOrder || 0]
    );

    const [newCategory] = await db.query(
      'SELECT * FROM menu_categories WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: newCategory[0]
    });
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create category'
    });
  }
};

// Update category
const updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;
    const { name, description, sortOrder, isActive } = req.body;

    const [existing] = await db.query(
      'SELECT id FROM menu_categories WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    await db.query(
      `UPDATE menu_categories SET 
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        sort_order = COALESCE(?, sort_order),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, description, sortOrder, isActive, id]
    );

    const [updatedCategory] = await db.query(
      'SELECT * FROM menu_categories WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: 'Category updated successfully',
      data: updatedCategory[0]
    });
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update category'
    });
  }
};

// Delete category
const deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const restaurantId = req.restaurantId;

    const [existing] = await db.query(
      'SELECT id FROM menu_categories WHERE id = ? AND restaurant_id = ?',
      [id, restaurantId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Category not found'
      });
    }

    // Move items to uncategorized
    await db.query(
      'UPDATE menu_items SET category_id = NULL WHERE category_id = ?',
      [id]
    );

    await db.query('DELETE FROM menu_categories WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Category deleted successfully'
    });
  } catch (error) {
    console.error('Delete category error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete category'
    });
  }
};

module.exports = {
  getMenuItems,
  getPublicMenu,
  getMenuItem,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  toggleAvailability,
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory
};

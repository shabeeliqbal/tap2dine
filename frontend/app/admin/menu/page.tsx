'use client';

import { useEffect, useState } from 'react';
import { 
  Plus, Edit2, Trash2, X, Image as ImageIcon, 
  Leaf, Flame, ToggleLeft, ToggleRight, FolderOpen 
} from 'lucide-react';
import { menuAPI } from '@/lib/api';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// Veg/Non-Veg indicator component
const VegIndicator = ({ isVeg }: { isVeg: boolean }) => (
  <div 
    className={`w-4 h-4 border-2 rounded-sm flex items-center justify-center ${
      isVeg ? 'border-green-600' : 'border-red-600'
    }`}
    title={isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
  >
    <div 
      className={`w-2 h-2 rounded-full ${
        isVeg ? 'bg-green-600' : 'bg-red-600'
      }`}
    />
  </div>
);

// Format quantity display
const formatQuantity = (type?: string, value?: string): string | null => {
  if (!type || !value) return null;
  
  switch (type) {
    case 'ml': return `${value} ml`;
    case 'g': return `${value} g`;
    case 'kg': return `${value} kg`;
    case 'pieces': return `${value} pcs`;
    case 'servings': return `${value} servings`;
    case 'custom': return value;
    default: return null;
  }
};

interface Category {
  id: number;
  name: string;
  description?: string;
  sort_order: number;
  item_count: number;
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  category_id?: number;
  category_name?: string;
  is_available: boolean;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time: number;
  quantity_type?: string;
  quantity_value?: string;
}

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [itemForm, setItemForm] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    isVegetarian: false,
    isSpicy: false,
    preparationTime: 15,
    quantityType: '',
    quantityValue: '',
  });

  const quantityTypes = [
    { value: '', label: 'None' },
    { value: 'ml', label: 'Volume (ml)' },
    { value: 'g', label: 'Weight (g)' },
    { value: 'kg', label: 'Weight (kg)' },
    { value: 'pieces', label: 'Pieces' },
    { value: 'servings', label: 'Servings' },
    { value: 'custom', label: 'Custom' },
  ];

  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [itemsRes, categoriesRes] = await Promise.all([
        menuAPI.getAll(),
        menuAPI.getCategories(),
      ]);
      setItems(itemsRes.data.data);
      setCategories(categoriesRes.data.data);
    } catch (error) {
      toast.error('Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  // Item handlers
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const formData = new FormData();
    formData.append('name', itemForm.name);
    formData.append('description', itemForm.description);
    formData.append('price', itemForm.price);
    if (itemForm.categoryId) formData.append('categoryId', itemForm.categoryId);
    formData.append('isVegetarian', String(itemForm.isVegetarian));
    formData.append('isSpicy', String(itemForm.isSpicy));
    formData.append('preparationTime', String(itemForm.preparationTime));
    if (itemForm.quantityType) formData.append('quantityType', itemForm.quantityType);
    if (itemForm.quantityValue) formData.append('quantityValue', itemForm.quantityValue);
    
    const imageInput = document.getElementById('itemImage') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      await menuAPI.create(formData);
      toast.success('Menu item created');
      closeItemModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create item');
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const formData = new FormData();
    formData.append('name', itemForm.name);
    formData.append('description', itemForm.description);
    formData.append('price', itemForm.price);
    formData.append('categoryId', itemForm.categoryId || '');
    formData.append('isVegetarian', String(itemForm.isVegetarian));
    formData.append('isSpicy', String(itemForm.isSpicy));
    formData.append('preparationTime', String(itemForm.preparationTime));
    formData.append('quantityType', itemForm.quantityType || '');
    formData.append('quantityValue', itemForm.quantityValue || '');
    
    const imageInput = document.getElementById('itemImage') as HTMLInputElement;
    if (imageInput?.files?.[0]) {
      formData.append('image', imageInput.files[0]);
    }

    try {
      await menuAPI.update(editingItem.id, formData);
      toast.success('Menu item updated');
      closeItemModal();
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update item');
    }
  };

  const handleDeleteItem = async (id: number) => {
    if (!confirm('Delete this menu item?')) return;
    
    try {
      await menuAPI.delete(id);
      toast.success('Item deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete item');
    }
  };

  const handleToggleAvailability = async (item: MenuItem) => {
    try {
      await menuAPI.toggleAvailability(item.id);
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, is_available: !i.is_available } : i
        )
      );
      toast.success(item.is_available ? 'Item marked unavailable' : 'Item marked available');
    } catch (error) {
      toast.error('Failed to update availability');
    }
  };

  // Category handlers
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await menuAPI.createCategory(categoryForm);
      toast.success('Category created');
      closeCategoryModal();
      fetchData();
    } catch (error) {
      toast.error('Failed to create category');
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    
    try {
      await menuAPI.updateCategory(editingCategory.id, categoryForm);
      toast.success('Category updated');
      closeCategoryModal();
      fetchData();
    } catch (error) {
      toast.error('Failed to update category');
    }
  };

  const handleDeleteCategory = async (id: number) => {
    if (!confirm('Delete this category? Items will become uncategorized.')) return;
    
    try {
      await menuAPI.deleteCategory(id);
      toast.success('Category deleted');
      fetchData();
    } catch (error) {
      toast.error('Failed to delete category');
    }
  };

  // Modal helpers
  const openEditItemModal = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      categoryId: item.category_id ? String(item.category_id) : '',
      isVegetarian: item.is_vegetarian,
      isSpicy: item.is_spicy,
      preparationTime: item.preparation_time,
      quantityType: item.quantity_type || '',
      quantityValue: item.quantity_value || '',
    });
    setImagePreview(item.image_url ? getImageUrl(item.image_url) : null);
    setShowItemModal(true);
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    setEditingItem(null);
    setImagePreview(null);
    setItemForm({
      name: '',
      description: '',
      price: '',
      categoryId: '',
      isVegetarian: false,
      isSpicy: false,
      preparationTime: 15,
      quantityType: '',
      quantityValue: '',
    });
  };

  const openEditCategoryModal = (category: Category) => {
    setEditingCategory(category);
    setCategoryForm({
      name: category.name,
      description: category.description || '',
    });
    setShowCategoryModal(true);
  };

  const closeCategoryModal = () => {
    setShowCategoryModal(false);
    setEditingCategory(null);
    setCategoryForm({ name: '', description: '' });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Filter items by category
  const filteredItems = selectedCategory
    ? items.filter((item) => item.category_id === selectedCategory)
    : items;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner w-12 h-12" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="btn-outline flex items-center gap-2"
          >
            <FolderOpen className="h-5 w-5" />
            Add Category
          </button>
          <button
            onClick={() => setShowItemModal(true)}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="card p-4">
        <h2 className="font-semibold text-gray-900 mb-3">Categories</h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === null
                ? 'bg-primary-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({items.length})
          </button>
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-1">
              <button
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat.name} ({cat.item_count})
              </button>
              <button
                onClick={() => openEditCategoryModal(cat)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Edit2 className="h-3 w-3 text-gray-400" />
              </button>
              <button
                onClick={() => handleDeleteCategory(cat.id)}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <Trash2 className="h-3 w-3 text-gray-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <div className="card p-8 text-center">
          <ImageIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No menu items</h3>
          <p className="text-gray-500 mb-4">Start by adding items to your menu</p>
          <button onClick={() => setShowItemModal(true)} className="btn-primary">
            Add Menu Item
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div key={item.id} className="card overflow-hidden">
              {/* Image */}
              <div className="h-40 bg-gray-100 relative">
                {item.image_url ? (
                  <img
                    src={getImageUrl(item.image_url)}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-12 w-12 text-gray-300" />
                  </div>
                )}
                {/* Badges */}
                <div className="absolute top-2 left-2 flex gap-1">
                  <div className="bg-white p-0.5 rounded shadow-sm">
                    <VegIndicator isVeg={item.is_vegetarian} />
                  </div>
                  {item.is_spicy && (
                    <span className="bg-red-500 text-white p-1 rounded-full">
                      <Flame className="h-3 w-3" />
                    </span>
                  )}
                </div>
                {!item.is_available && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <span className="text-white font-medium">Unavailable</span>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {item.name}
                      {formatQuantity(item.quantity_type, item.quantity_value) && (
                        <span className="ml-1 text-xs font-normal text-gray-500">
                          ({formatQuantity(item.quantity_type, item.quantity_value)})
                        </span>
                      )}
                    </h3>
                    {item.category_name && (
                      <p className="text-xs text-gray-500">{item.category_name}</p>
                    )}
                  </div>
                  <span className="font-bold text-primary-600">
                    {formatCurrency(item.price)}
                  </span>
                </div>
                {item.description && (
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                    {item.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-3 border-t">
                  <button
                    onClick={() => handleToggleAvailability(item)}
                    className={`flex items-center gap-1 text-sm ${
                      item.is_available ? 'text-green-600' : 'text-gray-400'
                    }`}
                  >
                    {item.is_available ? (
                      <ToggleRight className="h-5 w-5" />
                    ) : (
                      <ToggleLeft className="h-5 w-5" />
                    )}
                    {item.is_available ? 'Available' : 'Unavailable'}
                  </button>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => openEditItemModal(item)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Edit2 className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                {editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <button onClick={closeItemModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="p-6 space-y-4">
              {/* Image Upload */}
              <div>
                <label className="label">Image</label>
                <div className="flex items-center gap-4">
                  <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    {imagePreview ? (
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon className="h-8 w-8 text-gray-300" />
                    )}
                  </div>
                  <input
                    id="itemImage"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Price *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: e.target.value })}
                    className="input"
                    required
                  />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="input"
                  >
                    <option value="">No Category</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="label">Prep Time (minutes)</label>
                <input
                  type="number"
                  value={itemForm.preparationTime}
                  onChange={(e) => setItemForm({ ...itemForm, preparationTime: parseInt(e.target.value) })}
                  className="input"
                  min={1}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Quantity Type</label>
                  <select
                    value={itemForm.quantityType}
                    onChange={(e) => setItemForm({ ...itemForm, quantityType: e.target.value })}
                    className="input"
                  >
                    {quantityTypes.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>
                {itemForm.quantityType && (
                  <div>
                    <label className="label">
                      {itemForm.quantityType === 'custom' ? 'Custom Value' : 'Quantity'}
                    </label>
                    <input
                      type="text"
                      value={itemForm.quantityValue}
                      onChange={(e) => setItemForm({ ...itemForm, quantityValue: e.target.value })}
                      className="input"
                      placeholder={
                        itemForm.quantityType === 'ml' ? 'e.g., 500' :
                        itemForm.quantityType === 'g' ? 'e.g., 250' :
                        itemForm.quantityType === 'kg' ? 'e.g., 1' :
                        itemForm.quantityType === 'pieces' ? 'e.g., 6' :
                        itemForm.quantityType === 'servings' ? 'e.g., 2' :
                        'e.g., Large'
                      }
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isVegetarian}
                    onChange={(e) => setItemForm({ ...itemForm, isVegetarian: e.target.checked })}
                    className="w-4 h-4 text-primary-500"
                  />
                  <Leaf className="h-4 w-4 text-green-500" />
                  Vegetarian
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={itemForm.isSpicy}
                    onChange={(e) => setItemForm({ ...itemForm, isSpicy: e.target.checked })}
                    className="w-4 h-4 text-primary-500"
                  />
                  <Flame className="h-4 w-4 text-red-500" />
                  Spicy
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeItemModal} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add/Edit Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingCategory ? 'Edit Category' : 'Add Category'}
              </h2>
              <button onClick={closeCategoryModal} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="input"
                  required
                />
              </div>

              <div>
                <label className="label">Description</label>
                <textarea
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="input"
                  rows={2}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeCategoryModal} className="flex-1 btn-outline">
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingCategory ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

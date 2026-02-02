'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  ShoppingCart, Plus, Minus, Utensils, Leaf, Flame, 
  Clock, X, ChevronRight, ArrowLeft, ClipboardList 
} from 'lucide-react';
import { tablesAPI, menuAPI } from '@/lib/api';
import { useCartStore, useCustomerOrdersStore } from '@/lib/store';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';
import Link from 'next/link';

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
  items: MenuItem[];
}

interface MenuItem {
  id: number;
  name: string;
  description?: string;
  price: number;
  image_url?: string;
  is_vegetarian: boolean;
  is_spicy: boolean;
  preparation_time: number;
  quantity_type?: string;
  quantity_value?: string;
}

interface TableInfo {
  id: number;
  table_number: string;
  restaurant_id: number;
  restaurant_name: string;
  restaurant_logo?: string;
}

export default function MenuPage() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode as string;

  const { 
    items: cartItems, 
    addItem, 
    removeItem, 
    updateQuantity, 
    setTableInfo,
    getTotal,
    getItemCount 
  } = useCartStore();

  const [tableInfo, setTableInfoState] = useState<TableInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [showPrices, setShowPrices] = useState(true);

  useEffect(() => {
    fetchTableAndMenu();
  }, [qrCode]);

  const fetchTableAndMenu = async () => {
    try {
      // Get table info by QR code
      const tableRes = await tablesAPI.getByQR(qrCode);
      const table = tableRes.data.data;
      
      setTableInfoState(table);
      setTableInfo(table.id, table.table_number, table.restaurant_id, table.restaurant_name);

      // Get menu
      const menuRes = await menuAPI.getPublic(table.restaurant_id);
      setCategories(menuRes.data.data.categories);
      setShowPrices(menuRes.data.data.showPrices !== false);
      
      if (menuRes.data.data.categories.length > 0) {
        setActiveCategory(menuRes.data.data.categories[0].id);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const getItemQuantity = (menuItemId: number) => {
    const item = cartItems.find((i) => i.menuItemId === menuItemId);
    return item?.quantity || 0;
  };

  const handleAddToCart = (item: MenuItem) => {
    addItem({
      menuItemId: item.id,
      name: item.name,
      price: item.price,
      image_url: item.image_url,
    });
    toast.success(`${item.name} added to cart`, { duration: 1500 });
  };

  const handleRemoveFromCart = (menuItemId: number) => {
    const item = cartItems.find((i) => i.menuItemId === menuItemId);
    if (item && item.quantity > 1) {
      updateQuantity(menuItemId, item.quantity - 1);
    } else {
      removeItem(menuItemId);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500">Loading menu...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Table Not Found</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href="/" className="btn-primary">
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              {tableInfo?.restaurant_logo ? (
                <img 
                  src={getImageUrl(tableInfo.restaurant_logo)} 
                  alt={tableInfo.restaurant_name}
                  className="w-10 h-10 rounded-full object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <Utensils className="h-5 w-5 text-primary-500" />
                </div>
              )}
              <div>
                <h1 className="font-bold text-gray-900">{tableInfo?.restaurant_name}</h1>
                <p className="text-sm text-gray-500">Welcome! Browse our menu</p>
              </div>
            </div>
            {/* My Orders Button */}
            <Link
              href={`/menu/${qrCode}/orders`}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors relative"
              aria-label="My Orders"
            >
              <ClipboardList className="h-5 w-5" />
            </Link>
          </div>
        </div>

        {/* Category tabs */}
        <div className="px-4 pb-2 overflow-x-auto hide-scrollbar">
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Menu Items */}
      <main className="p-4">
        {categories
          .filter((cat) => !activeCategory || cat.id === activeCategory)
          .map((category) => (
            <div key={category.id} className="mb-8">
              <h2 className="text-lg font-bold text-gray-900 mb-4">{category.name}</h2>
              <div className="space-y-3">
                {category.items.map((item) => {
                  const quantity = getItemQuantity(item.id);
                  
                  return (
                    <div 
                      key={item.id} 
                      className="card p-3 flex gap-3"
                      onClick={() => setSelectedItem(item)}
                    >
                      {/* Image */}
                      <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {item.image_url ? (
                          <img
                            src={getImageUrl(item.image_url)}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Utensils className="h-8 w-8 text-gray-300" />
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <VegIndicator isVeg={item.is_vegetarian} />
                              <h3 className="font-medium text-gray-900">
                                {item.name}
                                {formatQuantity(item.quantity_type, item.quantity_value) && (
                                  <span className="ml-1 text-xs font-normal text-gray-500">
                                    ({formatQuantity(item.quantity_type, item.quantity_value)})
                                  </span>
                                )}
                              </h3>
                            </div>
                            <div className="flex items-center gap-1 mt-0.5 ml-6">
                              {item.is_spicy && (
                                <Flame className="h-3 w-3 text-red-500" />
                              )}
                              <span className="text-xs text-gray-400 flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {item.preparation_time}min
                              </span>
                            </div>
                          </div>
                          {showPrices && (
                            <span className="font-semibold text-primary-600">
                              {formatCurrency(item.price)}
                            </span>
                          )}
                        </div>

                        {item.description && (
                          <p className="text-sm text-gray-500 line-clamp-2 mt-1">
                            {item.description}
                          </p>
                        )}

                        <div className="flex items-center justify-end mt-2">
                          <div 
                            className="flex items-center gap-2"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {quantity > 0 ? (
                              <>
                                <button
                                  onClick={() => handleRemoveFromCart(item.id)}
                                  className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-6 text-center font-medium">
                                  {quantity}
                                </span>
                                <button
                                  onClick={() => handleAddToCart(item)}
                                  className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => handleAddToCart(item)}
                                className="btn-primary btn-sm"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
      </main>

      {/* Cart Button */}
      {getItemCount() > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
          <button
            onClick={() => router.push(`/menu/${qrCode}/cart`)}
            className="w-full btn-primary btn-lg flex items-center justify-center gap-2"
          >
            <ShoppingCart className="h-5 w-5" />
            View Cart ({getItemCount()} item{getItemCount() > 1 ? 's' : ''})
          </button>
        </div>
      )}

      {/* Item Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-t-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image */}
            <div className="h-48 bg-gray-100 relative">
              {selectedItem.image_url ? (
                <img
                  src={getImageUrl(selectedItem.image_url)}
                  alt={selectedItem.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Utensils className="h-16 w-16 text-gray-300" />
                </div>
              )}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedItem.name}</h2>
                  {formatQuantity(selectedItem.quantity_type, selectedItem.quantity_value) && (
                    <span className="text-sm text-gray-500">
                      {formatQuantity(selectedItem.quantity_type, selectedItem.quantity_value)}
                    </span>
                  )}
                </div>
                {showPrices && (
                  <span className="text-xl font-bold text-primary-600">
                    {formatCurrency(selectedItem.price)}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-4">
                <VegIndicator isVeg={selectedItem.is_vegetarian} />
                <span className={`text-sm font-medium ${
                  selectedItem.is_vegetarian ? 'text-green-700' : 'text-red-700'
                }`}>
                  {selectedItem.is_vegetarian ? 'Vegetarian' : 'Non-Vegetarian'}
                </span>
                {selectedItem.is_spicy && (
                  <span className="badge bg-red-100 text-red-700 flex items-center gap-1">
                    <Flame className="h-3 w-3" /> Spicy
                  </span>
                )}
                <span className="badge bg-gray-100 text-gray-600 flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {selectedItem.preparation_time} min
                </span>
              </div>

              {selectedItem.description && (
                <p className="text-gray-600 mb-6">{selectedItem.description}</p>
              )}

              <button
                onClick={() => {
                  handleAddToCart(selectedItem);
                  setSelectedItem(null);
                }}
                className="w-full btn-primary btn-lg"
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

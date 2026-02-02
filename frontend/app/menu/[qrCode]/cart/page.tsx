'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Plus, Minus, Trash2, ShoppingCart, 
  MessageSquare, User, Phone, Send, ClipboardList, AlertCircle 
} from 'lucide-react';
import { ordersAPI, menuAPI, tablesAPI } from '@/lib/api';
import { useCartStore, useCustomerOrdersStore } from '@/lib/store';
import { formatCurrency, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

// Get device info
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = 'Unknown';
  let browser = 'Unknown';
  
  // Detect device
  if (/iPhone/i.test(ua)) device = 'iPhone';
  else if (/iPad/i.test(ua)) device = 'iPad';
  else if (/Android/i.test(ua)) device = 'Android';
  else if (/Windows Phone/i.test(ua)) device = 'Windows Phone';
  else if (/Windows/i.test(ua)) device = 'Windows PC';
  else if (/Mac/i.test(ua)) device = 'Mac';
  else if (/Linux/i.test(ua)) device = 'Linux';
  
  // Detect browser
  if (/Chrome/i.test(ua) && !/Edge/i.test(ua)) browser = 'Chrome';
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = 'Safari';
  else if (/Firefox/i.test(ua)) browser = 'Firefox';
  else if (/Edge/i.test(ua)) browser = 'Edge';
  else if (/Opera|OPR/i.test(ua)) browser = 'Opera';
  
  return `${device} - ${browser}`;
};

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const qrCode = params.qrCode as string;

  const {
    items,
    tableId,
    tableNumber,
    restaurantName,
    updateQuantity,
    updateSpecialRequests,
    removeItem,
    clearCart,
    getTotal,
  } = useCartStore();

  const { addOrder, getOrders } = useCustomerOrdersStore();
  const previousOrders = getOrders(qrCode);

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [itemNote, setItemNote] = useState('');
  const [requireCustomerName, setRequireCustomerName] = useState(false);
  const [showTotalAtCheckout, setShowTotalAtCheckout] = useState(true);
  const [showPrices, setShowPrices] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Fetch restaurant settings
  useEffect(() => {
    const fetchSettings = async () => {
      if (tableId) {
        try {
          // Get table info to get restaurant ID
          const tableRes = await tablesAPI.getByQR(qrCode);
          const restaurantId = tableRes.data.data.restaurant_id;
          
          // Get menu settings
          const menuRes = await menuAPI.getPublic(restaurantId);
          setRequireCustomerName(menuRes.data.data.requireCustomerName === true);
          setShowTotalAtCheckout(menuRes.data.data.showTotalAtCheckout !== false);
          setShowPrices(menuRes.data.data.showPrices !== false);
        } catch (error) {
          console.error('Failed to fetch settings');
        } finally {
          setSettingsLoaded(true);
        }
      } else {
        setSettingsLoaded(true);
      }
    };
    fetchSettings();
  }, [tableId, qrCode]);

  const handlePlaceOrder = async () => {
    if (!tableId || items.length === 0) return;

    // Validate customer name if required
    if (requireCustomerName && !customerName.trim()) {
      toast.error('Please enter your name to continue');
      return;
    }

    setLoading(true);
    try {
      const deviceInfo = getDeviceInfo();
      
      const response = await ordersAPI.create({
        tableId,
        items: items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialRequests: item.specialRequests,
        })),
        customerName: customerName || undefined,
        customerPhone: customerPhone || undefined,
        specialInstructions: specialInstructions || undefined,
        deviceInfo: deviceInfo,
      });

      const order = response.data.data;
      addOrder(order.order_number, qrCode); // Save order to history
      clearCart();
      toast.success('Order placed successfully!');
      router.push(`/menu/${qrCode}/order/${order.order_number}`);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItemNote = (menuItemId: number) => {
    updateSpecialRequests(menuItemId, itemNote);
    setEditingItemId(null);
    setItemNote('');
    toast.success('Note saved');
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingCart className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Your cart is empty</h1>
          <p className="text-gray-500 mb-6">Add some delicious items from our menu</p>
          <Link href={`/menu/${qrCode}`} className="btn-primary">
            Browse Menu
          </Link>
          
          {/* Show previous orders even when cart is empty */}
          {previousOrders.length > 0 && (
            <div className="mt-8 text-left max-w-sm mx-auto">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Your Previous Orders
              </h3>
              <div className="space-y-2">
                {previousOrders.map((order) => (
                  <Link
                    key={order.orderNumber}
                    href={`/menu/${qrCode}/order/${order.orderNumber}`}
                    className="block p-3 bg-white rounded-lg border hover:border-primary-300 transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium text-gray-900">{order.orderNumber}</span>
                      <span className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/menu/${qrCode}`} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">Your Order</h1>
            <p className="text-sm text-gray-500">{restaurantName}</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4">
        {/* Cart Items */}
        <div className="card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900">Order Items</h2>
          </div>
          <div className="divide-y">
            {items.map((item) => (
              <div key={item.menuItemId} className="p-4">
                <div className="flex gap-3">
                  {/* Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image_url ? (
                      <img
                        src={getImageUrl(item.image_url)}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100" />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h3 className="font-medium text-gray-900">{item.name}</h3>
                      <button
                        onClick={() => removeItem(item.menuItemId)}
                        className="text-red-500 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {item.specialRequests && (
                      <p className="text-sm text-gray-500 italic mt-1">
                        Note: {item.specialRequests}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => {
                          setEditingItemId(item.menuItemId);
                          setItemNote(item.specialRequests || '');
                        }}
                        className="text-sm text-primary-500 flex items-center gap-1"
                      >
                        <MessageSquare className="h-3 w-3" />
                        {item.specialRequests ? 'Edit note' : 'Add note'}
                      </button>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-6 text-center font-medium">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                          className="w-8 h-8 bg-primary-500 text-white rounded-full flex items-center justify-center"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Item Note Edit */}
                {editingItemId === item.menuItemId && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={itemNote}
                        onChange={(e) => setItemNote(e.target.value)}
                        placeholder="Special requests for this item..."
                        className="input text-sm"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveItemNote(item.menuItemId)}
                        className="btn-primary btn-sm"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer Info */}
        <div className="card p-4 space-y-4">
          <h2 className="font-semibold text-gray-900">
            Your Details {requireCustomerName ? '' : '(Optional)'}
          </h2>
          
          {requireCustomerName && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 text-amber-800 rounded-lg text-sm">
              <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
              <span>Please enter your name to place an order</span>
            </div>
          )}
          
          <div>
            <label className="label flex items-center gap-1">
              <User className="h-4 w-4" />
              Name {requireCustomerName && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={`input ${requireCustomerName && !customerName.trim() ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}`}
              placeholder="Your name"
              required={requireCustomerName}
            />
          </div>

          <div>
            <label className="label flex items-center gap-1">
              <Phone className="h-4 w-4" />
              Phone
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="input"
              placeholder="Your phone number"
            />
          </div>

          <div>
            <label className="label flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              Special Instructions
            </label>
            <textarea
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="input"
              rows={2}
              placeholder="Any allergies or special requests?"
            />
          </div>
        </div>

        {/* Order Summary */}
        <div className="card p-4">
          <h2 className="font-semibold text-gray-900 mb-3">Order Summary</h2>
          
          <div className="space-y-2 text-sm">
            {items.map((item) => (
              <div key={item.menuItemId} className="flex justify-between">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                {showPrices && (
                  <span className="text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                )}
              </div>
            ))}
          </div>

          {showTotalAtCheckout && showPrices && (
            <div className="flex justify-between font-semibold text-lg mt-3 pt-3 border-t">
              <span>Total</span>
              <span className="text-primary-600">{formatCurrency(getTotal())}</span>
            </div>
          )}

          <p className="text-xs text-gray-400 mt-3 pt-3 border-t">
            {items.length} item{items.length > 1 ? 's' : ''} in your order
          </p>
        </div>
      </main>

      {/* Place Order Button */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t shadow-lg">
        <button
          onClick={handlePlaceOrder}
          disabled={loading || (requireCustomerName && !customerName.trim())}
          className="w-full btn-primary btn-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <div className="spinner w-5 h-5" />
              Placing Order...
            </>
          ) : (
            <>
              <Send className="h-5 w-5" />
              Place Order ({items.length} item{items.length > 1 ? 's' : ''})
            </>
          )}
        </button>
        <p className="text-xs text-gray-400 text-center mt-2">
          Pay at the counter
        </p>
      </div>
    </div>
  );
}

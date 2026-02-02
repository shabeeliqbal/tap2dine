'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  CheckCircle, Clock, ChefHat, Package, 
  ArrowLeft, RefreshCw, Utensils 
} from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { formatCurrency, getStatusLabel } from '@/lib/utils';
import { connectSocket, joinOrderRoom, onStatusUpdated, offStatusUpdated } from '@/lib/socket';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Order {
  id: number;
  order_number: string;
  table_number: string;
  restaurant_name: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: OrderItem[];
}

const statusSteps = [
  { key: 'pending', label: 'Order Placed', icon: Clock, color: 'text-yellow-500' },
  { key: 'received', label: 'Received', icon: CheckCircle, color: 'text-blue-500' },
  { key: 'preparing', label: 'Preparing', icon: ChefHat, color: 'text-purple-500' },
  { key: 'ready', label: 'Ready!', icon: Package, color: 'text-green-500' },
];

export default function OrderStatusPage() {
  const params = useParams();
  const qrCode = params.qrCode as string;
  const orderNumber = params.orderNumber as string;

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOrder();
  }, [orderNumber]);

  useEffect(() => {
    if (order) {
      connectSocket();
      joinOrderRoom(order.id);

      onStatusUpdated(({ status }) => {
        setOrder((prev) => prev ? { ...prev, status } : null);
        
        if (status === 'ready') {
          toast.success('Your order is ready! 🎉', { duration: 5000 });
        } else if (status === 'preparing') {
          toast('Your order is being prepared 👨‍🍳', { icon: '🍳' });
        } else if (status === 'received') {
          toast.success('Restaurant has received your order!');
        }
      });

      return () => {
        offStatusUpdated();
      };
    }
  }, [order?.id]);

  const fetchOrder = async () => {
    try {
      const response = await ordersAPI.getByNumber(orderNumber);
      setOrder(response.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Order not found');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStepIndex = () => {
    if (!order) return -1;
    return statusSteps.findIndex((step) => step.key === order.status);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500">Loading order...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Utensils className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">Order Not Found</h1>
          <p className="text-gray-500 mb-6">{error}</p>
          <Link href={`/menu/${qrCode}`} className="btn-primary">
            Back to Menu
          </Link>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex();
  const isCompleted = order.status === 'completed';
  const isCancelled = order.status === 'cancelled';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="px-4 py-3 flex items-center justify-between">
          <Link href={`/menu/${qrCode}`} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="text-center">
            <h1 className="font-bold text-gray-900">Order Status</h1>
            <p className="text-sm text-gray-500">{order.order_number}</p>
          </div>
          <button 
            onClick={fetchOrder}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="p-4 space-y-6">
        {/* Status Card */}
        <div className="card p-6">
          {isCancelled ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">❌</span>
              </div>
              <h2 className="text-xl font-bold text-red-600 mb-2">Order Cancelled</h2>
              <p className="text-gray-500">This order has been cancelled</p>
            </div>
          ) : isCompleted ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
              <h2 className="text-xl font-bold text-green-600 mb-2">Order Completed!</h2>
              <p className="text-gray-500">Thank you for dining with us</p>
            </div>
          ) : order.status === 'ready' ? (
            <div className="text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 pulse-ring">
                <span className="text-4xl">🍽️</span>
              </div>
              <h2 className="text-2xl font-bold text-green-600 mb-2">Your Order is Ready!</h2>
              <p className="text-gray-500">Please collect from the counter</p>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  {getStatusLabel(order.status)}
                </h2>
                <p className="text-gray-500 text-sm">
                  Table {order.table_number} • {order.restaurant_name}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="relative">
                {/* Progress Line */}
                <div className="absolute top-6 left-6 right-6 h-0.5 bg-gray-200">
                  <div 
                    className="h-full bg-primary-500 transition-all duration-500"
                    style={{ 
                      width: `${Math.max(0, (currentStepIndex / (statusSteps.length - 1)) * 100)}%` 
                    }}
                  />
                </div>

                {/* Steps */}
                <div className="relative flex justify-between">
                  {statusSteps.map((step, index) => {
                    const isActive = index <= currentStepIndex;
                    const isCurrent = index === currentStepIndex;
                    const StepIcon = step.icon;

                    return (
                      <div 
                        key={step.key} 
                        className="flex flex-col items-center"
                      >
                        <div 
                          className={`
                            w-12 h-12 rounded-full flex items-center justify-center z-10
                            transition-all duration-300
                            ${isActive ? 'bg-primary-500 text-white' : 'bg-gray-200 text-gray-400'}
                            ${isCurrent ? 'ring-4 ring-primary-200' : ''}
                          `}
                        >
                          <StepIcon className="h-6 w-6" />
                        </div>
                        <span 
                          className={`
                            text-xs mt-2 font-medium
                            ${isActive ? 'text-primary-600' : 'text-gray-400'}
                          `}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Order Details */}
        <div className="card">
          <div className="p-4 border-b">
            <h3 className="font-semibold text-gray-900">Order Details</h3>
          </div>
          <div className="p-4 space-y-3">
            {order.items?.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span className="text-gray-600">
                  {item.quantity}x {item.name}
                </span>
                <span className="text-gray-900">
                  {formatCurrency(item.total_price)}
                </span>
              </div>
            ))}
            <div className="border-t pt-3 flex justify-between">
              <span className="font-semibold text-gray-900">Total</span>
              <span className="font-bold text-primary-600">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
          </div>
        </div>

        {/* Order Info */}
        <div className="text-center text-sm text-gray-500">
          <p>Ordered at {new Date(order.created_at).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          })}</p>
          <p className="mt-1">Pay at the counter when ready</p>
        </div>

        {/* Action Buttons */}
        {!isCancelled && (
          <div className="space-y-3">
            <Link 
              href={`/menu/${qrCode}`}
              className="block w-full btn-primary text-center"
            >
              Order More Items
            </Link>
            <Link 
              href={`/menu/${qrCode}/orders`}
              className="block w-full btn-outline text-center"
            >
              View All My Orders
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}

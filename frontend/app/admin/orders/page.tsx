'use client';

import { useEffect, useState } from 'react';
import { ordersAPI } from '@/lib/api';
import { formatCurrency, getStatusColor, getStatusLabel, getNextStatus, formatTime } from '@/lib/utils';
import { 
  ClipboardList, Clock, ChefHat, CheckCircle, 
  XCircle, ArrowRight, RefreshCw 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { onNewOrder, onOrderUpdated, offNewOrder, offOrderUpdated } from '@/lib/socket';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  special_requests?: string;
}

interface Order {
  id: number;
  order_number: string;
  table_number: string;
  table_id: number;
  status: string;
  total_amount: number;
  customer_name?: string;
  special_instructions?: string;
  created_at: string;
  items: OrderItem[];
}

const statusFilters = [
  { value: 'all', label: 'All Orders' },
  { value: 'pending', label: 'Pending' },
  { value: 'received', label: 'Received' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'ready', label: 'Ready' },
];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingOrder, setUpdatingOrder] = useState<number | null>(null);

  useEffect(() => {
    fetchOrders();

    // Listen for real-time updates
    onNewOrder((order) => {
      setOrders((prev) => [order, ...prev]);
    });

    onOrderUpdated((updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? { ...o, ...updatedOrder } : o))
      );
    });

    return () => {
      offNewOrder();
      offOrderUpdated();
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getActive();
      setOrders(response.data.data);
    } catch (error) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrder(orderId);
    try {
      await ordersAPI.updateStatus(orderId, newStatus);
      toast.success(`Order marked as ${getStatusLabel(newStatus)}`);
      
      // Update local state
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (error) {
      toast.error('Failed to update order status');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: number) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    
    setUpdatingOrder(orderId);
    try {
      await ordersAPI.updateStatus(orderId, 'cancelled');
      toast.success('Order cancelled');
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' } : o))
      );
    } catch (error) {
      toast.error('Failed to cancel order');
    } finally {
      setUpdatingOrder(null);
    }
  };

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'all') {
      return !['completed', 'cancelled'].includes(order.status);
    }
    return order.status === statusFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'received':
        return <ClipboardList className="h-5 w-5 text-blue-500" />;
      case 'preparing':
        return <ChefHat className="h-5 w-5 text-purple-500" />;
      case 'ready':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return null;
    }
  };

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
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <button
          onClick={fetchOrders}
          className="btn-outline flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {/* Status Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
        {statusFilters.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setStatusFilter(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              statusFilter === filter.value
                ? 'bg-primary-500 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-100'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="card p-8 text-center">
          <ClipboardList className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
          <p className="text-gray-500">
            {statusFilter === 'all' 
              ? 'New orders will appear here when customers place them'
              : `No ${statusFilter} orders at the moment`
            }
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredOrders.map((order) => {
            const nextStatus = getNextStatus(order.status);
            const isUpdating = updatingOrder === order.id;

            return (
              <div 
                key={order.id} 
                className={`card overflow-hidden ${
                  order.status === 'pending' ? 'ring-2 ring-yellow-400 pulse-ring' : ''
                }`}
              >
                {/* Order Header */}
                <div className="p-4 bg-gray-50 border-b">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(order.status)}
                      <span className="font-semibold text-gray-900">{order.order_number}</span>
                    </div>
                    <span className={getStatusColor(order.status)}>
                      {getStatusLabel(order.status)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>Table {order.table_number}</span>
                    <span>{formatTime(order.created_at)}</span>
                  </div>
                  {order.customer_name && (
                    <p className="text-sm text-gray-600 mt-1">Customer: {order.customer_name}</p>
                  )}
                </div>

                {/* Order Items */}
                <div className="p-4">
                  <div className="space-y-2 mb-4">
                    {order.items?.map((item) => (
                      <div key={item.id} className="flex justify-between">
                        <div>
                          <span className="text-gray-900">
                            {item.quantity}x {item.name}
                          </span>
                          {item.special_requests && (
                            <p className="text-xs text-gray-500 italic">
                              Note: {item.special_requests}
                            </p>
                          )}
                        </div>
                        <span className="text-gray-600">
                          {formatCurrency(item.total_price)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {order.special_instructions && (
                    <div className="p-2 bg-yellow-50 rounded-lg mb-4">
                      <p className="text-sm text-yellow-800">
                        <strong>Note:</strong> {order.special_instructions}
                      </p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-3 border-t">
                    <span className="font-semibold text-gray-900">Total</span>
                    <span className="font-bold text-lg text-primary-600">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="p-4 bg-gray-50 border-t flex gap-2">
                  {nextStatus && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, nextStatus)}
                      disabled={isUpdating}
                      className="flex-1 btn-primary flex items-center justify-center gap-2"
                    >
                      {isUpdating ? (
                        <div className="spinner w-5 h-5" />
                      ) : (
                        <>
                          Mark as {getStatusLabel(nextStatus)}
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  )}
                  
                  {order.status !== 'ready' && (
                    <button
                      onClick={() => handleCancelOrder(order.id)}
                      disabled={isUpdating}
                      className="btn-outline p-2 text-red-500 hover:bg-red-50"
                    >
                      <XCircle className="h-5 w-5" />
                    </button>
                  )}

                  {order.status === 'ready' && (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'completed')}
                      disabled={isUpdating}
                      className="flex-1 btn-secondary flex items-center justify-center gap-2"
                    >
                      {isUpdating ? (
                        <div className="spinner w-5 h-5" />
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4" />
                          Complete Order
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

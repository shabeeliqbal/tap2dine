'use client';

import { useState, useEffect } from 'react';
import { 
  ChefHat, Clock, CheckCircle, AlertCircle, 
  RefreshCw, Play, Check
} from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { useStaffAuthStore } from '@/lib/store';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  special_requests?: string;
}

interface Order {
  id: number;
  order_number: string;
  table_number: string;
  status: string;
  customer_name?: string;
  special_instructions?: string;
  items: OrderItem[];
  created_at: string;
}

export default function ChefDashboard() {
  const { restaurant } = useStaffAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getActive();
      // Filter to only show orders relevant to kitchen
      const kitchenOrders = (response.data.data || []).filter(
        (o: Order) => ['pending', 'received', 'preparing'].includes(o.status)
      );
      setOrders(kitchenOrders);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleStartPreparing = async (orderId: number) => {
    try {
      await ordersAPI.updateStatus(orderId, 'preparing');
      toast.success('Started preparing order');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleMarkReady = async (orderId: number) => {
    try {
      await ordersAPI.updateStatus(orderId, 'ready');
      toast.success('Order marked as ready!');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
      case 'received':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      case 'preparing':
        return 'bg-orange-100 text-orange-700 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'received');
  const preparingOrders = orders.filter(o => o.status === 'preparing');

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
        <h1 className="text-2xl font-bold text-gray-900">Kitchen Dashboard</h1>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card p-4 text-center border-yellow-300 bg-yellow-50">
          <div className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</div>
          <div className="text-sm text-yellow-700">New Orders</div>
        </div>
        <div className="card p-4 text-center border-orange-300 bg-orange-50">
          <div className="text-3xl font-bold text-orange-600">{preparingOrders.length}</div>
          <div className="text-sm text-orange-700">Preparing</div>
        </div>
      </div>

      {/* New Orders - Need to Start */}
      {pendingOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            New Orders - Start Preparing
          </h2>
          {pendingOrders.map((order) => (
            <div key={order.id} className="card border-yellow-300 bg-yellow-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold text-yellow-800">Table {order.table_number}</span>
                    <span className="text-sm text-yellow-600 ml-2">#{order.order_number}</span>
                  </div>
                  <span className="text-sm text-yellow-600">
                    {new Date(order.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                      <span className="font-bold text-xl text-yellow-700">{item.quantity}x</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.special_requests && (
                          <p className="text-sm text-orange-600">⚠️ {item.special_requests}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.special_instructions && (
                  <div className="p-3 bg-orange-100 rounded-lg mb-4">
                    <p className="text-sm font-medium text-orange-800">
                      📝 Special Instructions: {order.special_instructions}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleStartPreparing(order.id)}
                  className="w-full btn-primary btn-lg bg-yellow-600 hover:bg-yellow-700 flex items-center justify-center gap-2"
                >
                  <Play className="h-5 w-5" />
                  Start Preparing
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Currently Preparing */}
      {preparingOrders.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-orange-500 animate-pulse" />
            Currently Preparing
          </h2>
          {preparingOrders.map((order) => (
            <div key={order.id} className="card border-orange-300 bg-orange-50">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-2xl font-bold text-orange-800">Table {order.table_number}</span>
                    <span className="text-sm text-orange-600 ml-2">#{order.order_number}</span>
                  </div>
                  <span className="badge bg-orange-200 text-orange-800">
                    <Clock className="h-3 w-3 mr-1 animate-spin" />
                    Preparing
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 p-2 bg-white rounded-lg">
                      <span className="font-bold text-xl text-orange-700">{item.quantity}x</span>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.special_requests && (
                          <p className="text-sm text-orange-600">⚠️ {item.special_requests}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {order.special_instructions && (
                  <div className="p-3 bg-orange-100 rounded-lg mb-4">
                    <p className="text-sm font-medium text-orange-800">
                      📝 {order.special_instructions}
                    </p>
                  </div>
                )}

                <button
                  onClick={() => handleMarkReady(order.id)}
                  className="w-full btn-primary btn-lg bg-green-600 hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check className="h-5 w-5" />
                  Mark Ready
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {orders.length === 0 && (
        <div className="card p-12 text-center">
          <ChefHat className="h-16 w-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">All caught up!</h2>
          <p className="text-gray-500">No orders to prepare right now</p>
        </div>
      )}
    </div>
  );
}

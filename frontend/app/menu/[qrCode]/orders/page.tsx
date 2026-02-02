'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ClipboardList, Clock, CheckCircle, ChefHat, Package, XCircle } from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { useCustomerOrdersStore } from '@/lib/store';
import { getStatusLabel } from '@/lib/utils';

interface OrderInfo {
  orderNumber: string;
  status: string;
  createdAt: string;
  itemCount: number;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'pending':
      return <Clock className="h-5 w-5 text-yellow-500" />;
    case 'received':
      return <CheckCircle className="h-5 w-5 text-blue-500" />;
    case 'preparing':
      return <ChefHat className="h-5 w-5 text-purple-500" />;
    case 'ready':
      return <Package className="h-5 w-5 text-green-500" />;
    case 'completed':
      return <CheckCircle className="h-5 w-5 text-green-600" />;
    case 'cancelled':
      return <XCircle className="h-5 w-5 text-red-500" />;
    default:
      return <Clock className="h-5 w-5 text-gray-500" />;
  }
};

export default function MyOrdersPage() {
  const params = useParams();
  const qrCode = params.qrCode as string;
  
  const { getOrders } = useCustomerOrdersStore();
  const savedOrders = getOrders(qrCode);
  
  const [orders, setOrders] = useState<OrderInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrderStatuses();
  }, []);

  const fetchOrderStatuses = async () => {
    try {
      const orderInfos: OrderInfo[] = [];
      
      for (const savedOrder of savedOrders) {
        try {
          const response = await ordersAPI.getByNumber(savedOrder.orderNumber);
          const order = response.data.data;
          orderInfos.push({
            orderNumber: order.order_number,
            status: order.status,
            createdAt: order.created_at,
            itemCount: order.items?.length || 0,
          });
        } catch (err) {
          // Order might not exist anymore, skip it
          orderInfos.push({
            orderNumber: savedOrder.orderNumber,
            status: 'unknown',
            createdAt: savedOrder.createdAt,
            itemCount: 0,
          });
        }
      }
      
      setOrders(orderInfos);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center gap-3">
          <Link href={`/menu/${qrCode}`} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="font-bold text-gray-900">My Orders</h1>
            <p className="text-sm text-gray-500">Track your order status</p>
          </div>
        </div>
      </header>

      <main className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="spinner w-8 h-8" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Your orders will appear here</p>
            <Link href={`/menu/${qrCode}`} className="btn-primary">
              Browse Menu
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((order) => (
              <Link
                key={order.orderNumber}
                href={`/menu/${qrCode}/order/${order.orderNumber}`}
                className="block card p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="font-medium text-gray-900">{order.orderNumber}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(order.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-medium ${
                      order.status === 'ready' ? 'text-green-600' :
                      order.status === 'cancelled' ? 'text-red-600' :
                      order.status === 'completed' ? 'text-gray-600' :
                      'text-primary-600'
                    }`}>
                      {order.status === 'unknown' ? 'Loading...' : getStatusLabel(order.status)}
                    </span>
                    {order.itemCount > 0 && (
                      <p className="text-xs text-gray-400">{order.itemCount} item{order.itemCount > 1 ? 's' : ''}</p>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

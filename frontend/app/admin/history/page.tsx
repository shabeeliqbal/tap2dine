'use client';

import { useEffect, useState } from 'react';
import { Calendar, ClipboardList, DollarSign, TrendingUp } from 'lucide-react';
import { ordersAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

interface OrderSummary {
  total_orders: number;
  total_revenue: number;
  completed_orders: number;
  cancelled_orders: number;
}

interface Order {
  id: number;
  order_number: string;
  table_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: { name: string; quantity: number; total_price: number }[];
}

export default function HistoryPage() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState<OrderSummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, [date]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const response = await ordersAPI.getHistory(date);
      setSummary(response.data.data.summary);
      setOrders(response.data.data.orders);
    } catch (error) {
      toast.error('Failed to load order history');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Order History</h1>
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-gray-400" />
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="input w-auto"
            max={new Date().toISOString().slice(0, 10)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="spinner w-12 h-12" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary?.total_orders || 0}
                  </p>
                </div>
                <ClipboardList className="h-8 w-8 text-primary-500" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(summary?.total_revenue || 0)}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-green-500" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Completed</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary?.completed_orders || 0}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Cancelled</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {summary?.cancelled_orders || 0}
                  </p>
                </div>
                <ClipboardList className="h-8 w-8 text-red-500" />
              </div>
            </div>
          </div>

          {/* Orders List */}
          <div className="card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">
                Orders on {new Date(date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </h2>
            </div>

            {orders.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No orders on this date</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Order
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Table
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Items
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">
                        Time
                      </th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.map((order) => (
                      <tr key={order.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {order.order_number}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {order.table_number}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          <div className="max-w-xs">
                            {order.items?.slice(0, 2).map((item, i) => (
                              <span key={i}>
                                {item.quantity}x {item.name}
                                {i < Math.min(order.items.length, 2) - 1 && ', '}
                              </span>
                            ))}
                            {order.items?.length > 2 && (
                              <span className="text-gray-400">
                                {' '}+{order.items.length - 2} more
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={getStatusColor(order.status)}>
                            {getStatusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {new Date(order.created_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-gray-900">
                          {formatCurrency(order.total_amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ClipboardList, TableIcon, UtensilsCrossed, 
  TrendingUp, Clock, CheckCircle, XCircle 
} from 'lucide-react';
import { restaurantAPI, ordersAPI } from '@/lib/api';
import { formatCurrency, getStatusColor, getStatusLabel } from '@/lib/utils';
import toast from 'react-hot-toast';

interface DashboardStats {
  today: {
    total_orders: number;
    total_revenue: number;
    pending_orders: number;
    received_orders: number;
    preparing_orders: number;
    ready_orders: number;
    completed_orders: number;
    cancelled_orders: number;
  };
  tables: number;
  menuItems: number;
  activeOrders: number;
}

interface Order {
  id: number;
  order_number: string;
  table_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  items: any[];
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        restaurantAPI.getDashboard(),
        ordersAPI.getActive(),
      ]);
      
      setStats(statsRes.data.data);
      setRecentOrders(ordersRes.data.data.slice(0, 5));
    } catch (error) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Today's Orders</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.today.total_orders || 0}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center">
              <ClipboardList className="h-6 w-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Revenue Today</p>
              <p className="text-3xl font-bold text-gray-900">
                {formatCurrency(stats?.today.total_revenue || 0)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Tables</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.tables || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <TableIcon className="h-6 w-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Menu Items</p>
              <p className="text-3xl font-bold text-gray-900">{stats?.menuItems || 0}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <UtensilsCrossed className="h-6 w-6 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Order Status Summary */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">Today's Order Status</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {(stats?.today.pending_orders || 0) + (stats?.today.received_orders || 0)}
              </p>
              <p className="text-sm text-gray-600">Pending</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
            <UtensilsCrossed className="h-8 w-8 text-purple-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.today.preparing_orders || 0}</p>
              <p className="text-sm text-gray-600">Preparing</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.today.completed_orders || 0}</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg">
            <XCircle className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats?.today.cancelled_orders || 0}</p>
              <p className="text-sm text-gray-600">Cancelled</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Orders */}
      <div className="card">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Orders</h2>
          <Link href="/admin/orders" className="text-primary-500 hover:text-primary-600 text-sm font-medium">
            View All →
          </Link>
        </div>
        
        {recentOrders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No active orders</p>
          </div>
        ) : (
          <div className="divide-y">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{order.order_number}</span>
                      <span className={getStatusColor(order.status)}>
                        {getStatusLabel(order.status)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      Table {order.table_number} • {order.items?.length || 0} items
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {formatCurrency(order.total_amount)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(order.created_at).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-4">
        <Link href="/admin/tables" className="card p-6 hover:shadow-lg transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <TableIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Manage Tables</h3>
              <p className="text-sm text-gray-500">Add tables & generate QR codes</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/menu" className="card p-6 hover:shadow-lg transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <UtensilsCrossed className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Update Menu</h3>
              <p className="text-sm text-gray-500">Add or edit menu items</p>
            </div>
          </div>
        </Link>

        <Link href="/admin/orders" className="card p-6 hover:shadow-lg transition-shadow group">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <ClipboardList className="h-6 w-6 text-primary-500" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">View Orders</h3>
              <p className="text-sm text-gray-500">Manage incoming orders</p>
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}

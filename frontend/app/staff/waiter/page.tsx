'use client';

import { useState, useEffect } from 'react';
import { 
  ClipboardList, Clock, CheckCircle, AlertCircle, 
  RefreshCw, ChevronRight, Bell, MapPin, Plus, X, Users
} from 'lucide-react';
import { ordersAPI, tablesAPI, menuAPI } from '@/lib/api';
import { useStaffAuthStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { joinStaffRoom, onOrderReady, offOrderReady, disconnectSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

interface OrderItem {
  id: number;
  name: string;
  quantity: number;
  special_requests?: string;
  added_by?: string;
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
  items: OrderItem[];
  created_at: string;
}

interface TableWithOrders {
  id: number;
  table_number: string;
  capacity: number;
  assigned_waiter_id: number | null;
  waiter_name: string | null;
  active_orders: number;
}

interface MenuItem {
  id: number;
  name: string;
  price: number;
  is_available: boolean;
}

export default function WaiterDashboard() {
  const { staff, restaurant } = useStaffAuthStore();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tablesWithOrders, setTablesWithOrders] = useState<TableWithOrders[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<{orderId: number; message: string}[]>([]);
  const [activeTab, setActiveTab] = useState<'orders' | 'tables'>('orders');
  const [showAddItemsModal, setShowAddItemsModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [itemsToAdd, setItemsToAdd] = useState<{menuItemId: number; quantity: number}[]>([]);

  useEffect(() => {
    fetchOrders();
    fetchTablesWithOrders();
    fetchMenu();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchOrders();
      fetchTablesWithOrders();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Socket connection for real-time order ready notifications
  useEffect(() => {
    if (staff?.id) {
      joinStaffRoom(staff.id);
      
      onOrderReady((data) => {
        // Show toast notification
        toast.success(data.message, {
          duration: 10000,
          icon: '🔔',
        });
        
        // Add to notifications list
        setNotifications(prev => [...prev, { orderId: data.orderId, message: data.message }]);
        
        // Refresh orders to show updated status
        fetchOrders();
        
        // Play notification sound if available
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {}); // Ignore if audio fails
        } catch (e) {}
      });
    }

    return () => {
      offOrderReady();
    };
  }, [staff?.id]);

  const fetchOrders = async () => {
    try {
      const response = await ordersAPI.getActive();
      setOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTablesWithOrders = async () => {
    try {
      const response = await tablesAPI.getTablesWithOrders();
      setTablesWithOrders(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch tables:', error);
    }
  };

  const fetchMenu = async () => {
    try {
      const response = await menuAPI.getAll();
      setMenuItems(response.data.data?.filter((item: MenuItem) => item.is_available) || []);
    } catch (error) {
      console.error('Failed to fetch menu:', error);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchOrders();
    fetchTablesWithOrders();
  };

  const handleMarkReady = async (orderId: number) => {
    try {
      await ordersAPI.updateStatus(orderId, 'ready');
      toast.success('Order marked as ready for pickup!');
      fetchOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleMarkDelivered = async (orderId: number) => {
    try {
      await ordersAPI.updateStatus(orderId, 'completed');
      toast.success('Order marked as delivered!');
      fetchOrders();
      fetchTablesWithOrders();
    } catch (error) {
      toast.error('Failed to update order');
    }
  };

  const handleSelfAssign = async (tableId: number) => {
    try {
      await tablesAPI.selfAssignToTable(tableId);
      toast.success('Assigned to table!');
      fetchTablesWithOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign to table');
    }
  };

  const handleOpenAddItems = (order: Order) => {
    setSelectedOrder(order);
    setItemsToAdd([]);
    setShowAddItemsModal(true);
  };

  const handleAddItemToList = (menuItemId: number) => {
    const existing = itemsToAdd.find(i => i.menuItemId === menuItemId);
    if (existing) {
      setItemsToAdd(prev => prev.map(i => 
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity + 1 } : i
      ));
    } else {
      setItemsToAdd(prev => [...prev, { menuItemId, quantity: 1 }]);
    }
  };

  const handleRemoveItemFromList = (menuItemId: number) => {
    const existing = itemsToAdd.find(i => i.menuItemId === menuItemId);
    if (existing && existing.quantity > 1) {
      setItemsToAdd(prev => prev.map(i => 
        i.menuItemId === menuItemId ? { ...i, quantity: i.quantity - 1 } : i
      ));
    } else {
      setItemsToAdd(prev => prev.filter(i => i.menuItemId !== menuItemId));
    }
  };

  const handleSubmitAddItems = async () => {
    if (!selectedOrder || itemsToAdd.length === 0) return;
    
    try {
      await ordersAPI.addItems(selectedOrder.id, itemsToAdd, staff?.name);
      toast.success('Items added to order!');
      setShowAddItemsModal(false);
      setSelectedOrder(null);
      setItemsToAdd([]);
      fetchOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to add items');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      case 'received':
        return 'bg-blue-100 text-blue-700';
      case 'preparing':
        return 'bg-orange-100 text-orange-700';
      case 'ready':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const readyOrders = orders.filter(o => o.status === 'ready');
  const preparingOrders = orders.filter(o => o.status === 'preparing' || o.status === 'received');
  const pendingOrders = orders.filter(o => o.status === 'pending');
  
  // Tables assigned to this waiter
  const myTables = tablesWithOrders.filter(t => t.assigned_waiter_id === staff?.id);
  const unassignedTables = tablesWithOrders.filter(t => !t.assigned_waiter_id);

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
        <h1 className="text-2xl font-bold text-gray-900">Waiter Dashboard</h1>
        <div className="flex items-center gap-2">
          {notifications.length > 0 && (
            <button
              onClick={() => setNotifications([])}
              className="btn-secondary btn-sm flex items-center gap-2 relative"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {notifications.length}
              </span>
            </button>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Notifications Panel */}
      {notifications.length > 0 && (
        <div className="card border-orange-300 bg-orange-50 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-orange-600 animate-bounce" />
              <h3 className="font-semibold text-orange-800">New Notifications</h3>
            </div>
            <button
              onClick={() => setNotifications([])}
              className="text-sm text-orange-600 hover:text-orange-800"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {notifications.map((notif, index) => (
              <div key={index} className="flex items-center justify-between bg-white p-3 rounded-lg shadow-sm">
                <span className="text-gray-800">{notif.message}</span>
                <button
                  onClick={() => setNotifications(prev => prev.filter((_, i) => i !== index))}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab Buttons */}
      <div className="flex gap-2 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <ClipboardList className="h-4 w-4 inline-block mr-2" />
          Orders
        </button>
        <button
          onClick={() => setActiveTab('tables')}
          className={`px-4 py-2 font-medium border-b-2 transition-colors ${
            activeTab === 'tables'
              ? 'text-primary-600 border-primary-600'
              : 'text-gray-500 border-transparent hover:text-gray-700'
          }`}
        >
          <MapPin className="h-4 w-4 inline-block mr-2" />
          Tables ({myTables.length})
        </button>
      </div>

      {activeTab === 'tables' && (
        <div className="space-y-6">
          {/* My Assigned Tables */}
          {myTables.length > 0 && (
            <div className="card">
              <div className="p-4 border-b flex items-center gap-2">
                <Users className="h-5 w-5 text-primary-600" />
                <h2 className="font-semibold text-gray-900">My Tables</h2>
              </div>
              <div className="divide-y">
                {myTables.map((table) => (
                  <div key={table.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900">Table {table.table_number}</span>
                      <span className="ml-2 badge bg-primary-100 text-primary-700">
                        {table.active_orders} orders
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned Tables with Orders */}
          {unassignedTables.length > 0 && (
            <div className="card">
              <div className="p-4 border-b flex items-center gap-2">
                <MapPin className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-900">Available Tables</h2>
              </div>
              <div className="divide-y">
                {unassignedTables.map((table) => (
                  <div key={table.id} className="p-4 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-gray-900">Table {table.table_number}</span>
                      <span className="ml-2 badge bg-yellow-100 text-yellow-700">
                        {table.active_orders} orders
                      </span>
                    </div>
                    <button
                      onClick={() => handleSelfAssign(table.id)}
                      className="btn-primary btn-sm"
                    >
                      Assign to Me
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myTables.length === 0 && unassignedTables.length === 0 && (
            <div className="card p-8 text-center text-gray-500">
              <MapPin className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No tables with active orders</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'orders' && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-yellow-600">{pendingOrders.length}</div>
              <div className="text-sm text-gray-500">Pending</div>
            </div>
            <div className="card p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{preparingOrders.length}</div>
              <div className="text-sm text-gray-500">Preparing</div>
            </div>
            <div className="card p-4 text-center bg-green-50 border-green-200">
              <div className="text-3xl font-bold text-green-600">{readyOrders.length}</div>
              <div className="text-sm text-green-700">Ready for Pickup</div>
            </div>
          </div>

          {/* Ready Orders - Priority */}
          {readyOrders.length > 0 && (
            <div className="card border-green-300 bg-green-50">
              <div className="p-4 border-b border-green-200 flex items-center gap-2">
                <Bell className="h-5 w-5 text-green-600" />
                <h2 className="font-semibold text-green-800">Ready for Pickup</h2>
              </div>
              <div className="divide-y divide-green-200">
            {readyOrders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-bold text-green-800">Table {order.table_number}</span>
                    <span className="text-sm text-green-600 ml-2">#{order.order_number}</span>
                  </div>
                  <button
                    onClick={() => handleMarkDelivered(order.id)}
                    className="btn-primary btn-sm bg-green-600 hover:bg-green-700"
                  >
                    Mark Delivered
                  </button>
                </div>
                <div className="text-sm text-green-700">
                  {order.items?.map((item, i) => (
                    <span key={item.id}>
                      {item.quantity}x {item.name}{i < order.items.length - 1 ? ', ' : ''}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All Active Orders */}
      <div className="card">
        <div className="p-4 border-b flex items-center gap-2">
          <ClipboardList className="h-5 w-5 text-gray-500" />
          <h2 className="font-semibold text-gray-900">All Active Orders</h2>
        </div>
        <div className="divide-y">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <ClipboardList className="h-12 w-12 mx-auto mb-2 text-gray-300" />
              <p>No active orders</p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-gray-900">Table {order.table_number}</span>
                    <span className={`badge ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(order.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                
                <p className="text-sm text-gray-500 mb-2">#{order.order_number}</p>
                
                <div className="text-sm text-gray-700 mb-2">
                  {order.items?.map((item, i) => (
                    <div key={item.id} className="flex justify-between">
                      <span>{item.quantity}x {item.name}</span>
                      {item.special_requests && (
                        <span className="text-gray-400 italic">({item.special_requests})</span>
                      )}
                    </div>
                  ))}
                </div>

                {order.special_instructions && (
                  <p className="text-sm text-orange-600 bg-orange-50 p-2 rounded mt-2">
                    ⚠️ {order.special_instructions}
                  </p>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="font-medium">{formatCurrency(order.total_amount)}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenAddItems(order)}
                      className="btn-secondary btn-sm flex items-center gap-1"
                    >
                      <Plus className="h-4 w-4" />
                      Add Items
                    </button>
                    {order.status === 'ready' && (
                      <button
                        onClick={() => handleMarkDelivered(order.id)}
                        className="btn-primary btn-sm"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
        </>
      )}

      {/* Add Items Modal */}
      {showAddItemsModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Add Items to Order #{selectedOrder.order_number}
              </h2>
              <button
                onClick={() => {
                  setShowAddItemsModal(false);
                  setSelectedOrder(null);
                  setItemsToAdd([]);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[60vh]">
              {/* Selected Items */}
              {itemsToAdd.length > 0 && (
                <div className="mb-4 p-3 bg-primary-50 rounded-lg">
                  <h3 className="text-sm font-medium text-primary-800 mb-2">Items to Add:</h3>
                  <div className="space-y-2">
                    {itemsToAdd.map(item => {
                      const menuItem = menuItems.find(m => m.id === item.menuItemId);
                      return (
                        <div key={item.menuItemId} className="flex items-center justify-between text-sm">
                          <span>{item.quantity}x {menuItem?.name}</span>
                          <button
                            onClick={() => handleRemoveItemFromList(item.menuItemId)}
                            className="text-red-500 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="space-y-2">
                {menuItems.map(item => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">{formatCurrency(item.price)}</div>
                    </div>
                    <button
                      onClick={() => handleAddItemToList(item.id)}
                      className="btn-primary btn-sm"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 border-t flex gap-2">
              <button
                onClick={() => {
                  setShowAddItemsModal(false);
                  setSelectedOrder(null);
                  setItemsToAdd([]);
                }}
                className="btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitAddItems}
                disabled={itemsToAdd.length === 0}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add {itemsToAdd.reduce((sum, i) => sum + i.quantity, 0)} Items
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

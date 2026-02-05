'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { 
  Utensils, LayoutDashboard, TableIcon, UtensilsCrossed, 
  ClipboardList, History, Settings, LogOut, Menu, X, Bell, FileText, Users, ScrollText, Receipt
} from 'lucide-react';
import { useAuthStore } from '@/lib/store';
import { connectSocket, joinRestaurantRoom, onNewOrder, offNewOrder, disconnectSocket } from '@/lib/socket';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/orders', label: 'Orders', icon: ClipboardList },
  { href: '/admin/tables', label: 'Tables', icon: TableIcon },
  { href: '/admin/menu', label: 'Menu', icon: UtensilsCrossed },
  { href: '/admin/staff', label: 'Staff', icon: Users },
  { href: '/admin/invoice', label: 'Invoice', icon: Receipt },
  { href: '/admin/history', label: 'History', icon: History },
  { href: '/admin/activity-log', label: 'Activity Log', icon: ScrollText },
  { href: '/admin/reports', label: 'Reports', icon: FileText },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, restaurant, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration to complete
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    // Skip auth check for login page
    if (pathname === '/admin/login') {
      return;
    }

    // Skip layout for superadmin page (it has its own layout)
    if (pathname === '/admin/superadmin') {
      return;
    }

    // Wait for hydration before checking auth
    if (!isHydrated) {
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      router.push('/admin/login');
      return;
    }

    // Connect to socket and join restaurant room
    if (restaurant?.id) {
      connectSocket();
      joinRestaurantRoom(restaurant.id);

      // Listen for new orders
      onNewOrder((order) => {
        setNewOrderCount((prev) => prev + 1);
        toast.success(`New order from Table ${order.table_number}!`, {
          icon: '🔔',
          duration: 5000,
        });
        
        // Play notification sound (if available)
        try {
          const audio = new Audio('/notification.mp3');
          audio.play().catch(() => {});
        } catch (e) {}
      });
    }

    return () => {
      offNewOrder();
    };
  }, [isAuthenticated, restaurant, pathname, router, isHydrated]);

  const handleLogout = () => {
    disconnectSocket();
    logout();
    router.push('/admin/login');
  };

  // Don't show layout for login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  // Don't show layout for superadmin page (it has its own layout)
  if (pathname === '/admin/superadmin') {
    return <>{children}</>;
  }

  // Show loading while hydrating
  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-12 h-12 mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 z-50 h-full w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out
        lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between p-4 border-b">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <Utensils className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold text-gray-800">tap2dine</span>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 hover:bg-gray-100 rounded"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Restaurant name */}
        <div className="p-4 border-b">
          <p className="text-sm text-gray-500">Restaurant</p>
          <p className="font-medium text-gray-800 truncate">{restaurant?.name || 'My Restaurant'}</p>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center gap-3 px-4 py-3 rounded-lg transition-colors
                  ${isActive 
                    ? 'bg-primary-50 text-primary-600' 
                    : 'text-gray-600 hover:bg-gray-50'
                  }
                `}
              >
                <item.icon className="h-5 w-5" />
                <span className="font-medium">{item.label}</span>
                {item.label === 'Orders' && newOrderCount > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full">
                    {newOrderCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="bg-white shadow-sm sticky top-0 z-30">
          <div className="flex items-center justify-between px-4 py-3">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg text-gray-700"
              aria-label="Open menu"
            >
              <Menu className="h-6 w-6" />
            </button>
            
            {/* Spacer for desktop */}
            <div className="hidden lg:block" />
            
            <div className="flex items-center gap-4 ml-auto">
              {newOrderCount > 0 && (
                <button 
                  onClick={() => {
                    setNewOrderCount(0);
                    router.push('/admin/orders');
                  }}
                  className="relative p-2 hover:bg-gray-100 rounded-lg"
                >
                  <Bell className="h-6 w-6 text-gray-600" />
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full">
                    {newOrderCount}
                  </span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

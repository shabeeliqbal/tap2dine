'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { Utensils, LogOut, ChefHat, ConciergeBell } from 'lucide-react';
import { useStaffAuthStore } from '@/lib/store';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, staff, restaurant, logout } = useStaffAuthStore();
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (pathname === '/staff/login') return;
    
    if (!isHydrated) return;

    if (!isAuthenticated) {
      router.push('/staff/login');
      return;
    }

    // Redirect to correct dashboard based on role
    if (staff?.role === 'chef' && pathname === '/staff/waiter') {
      router.push('/staff/chef');
    } else if (staff?.role === 'waiter' && pathname === '/staff/chef') {
      router.push('/staff/waiter');
    }
  }, [isAuthenticated, staff, pathname, router, isHydrated]);

  const handleLogout = () => {
    logout();
    router.push('/staff/login');
  };

  if (pathname === '/staff/login') {
    return <>{children}</>;
  }

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
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${staff?.role === 'chef' ? 'bg-orange-100' : 'bg-blue-100'}`}>
              {staff?.role === 'chef' ? (
                <ChefHat className={`h-6 w-6 text-orange-600`} />
              ) : (
                <ConciergeBell className="h-6 w-6 text-blue-600" />
              )}
            </div>
            <div>
              <h1 className="font-bold text-gray-900">{restaurant?.name || 'Restaurant'}</h1>
              <p className="text-sm text-gray-500">
                {staff?.name} • {staff?.role === 'chef' ? 'Chef' : 'Waiter'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2"
          >
            <LogOut className="h-5 w-5" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="p-4">
        {children}
      </main>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Utensils, User, Lock, Eye, EyeOff, ChefHat, ConciergeBell } from 'lucide-react';
import { staffAPI } from '@/lib/api';
import { useStaffAuthStore } from '@/lib/store';

export default function StaffLoginPage() {
  const router = useRouter();
  const { setAuth } = useStaffAuthStore();
  
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await staffAPI.login({
        loginId: formData.loginId,
        password: formData.password,
      });
      const { staff, restaurant, token } = response.data.data;
      
      setAuth(staff, restaurant, token);
      toast.success('Login successful!');
      
      // Redirect based on role
      if (staff.role === 'chef') {
        router.push('/staff/chef');
      } else {
        router.push('/staff/waiter');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <Utensils className="h-10 w-10 text-primary-500" />
            <span className="text-2xl font-bold text-gray-800">QR Order</span>
          </Link>
          <h1 className="mt-6 text-3xl font-bold text-gray-900">Staff Login</h1>
          <p className="mt-2 text-gray-600">Sign in to access your dashboard</p>
          
          {/* Role badges */}
          <div className="flex justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 rounded-full">
              <ConciergeBell className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-700">Waiter</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 bg-orange-100 rounded-full">
              <ChefHat className="h-4 w-4 text-orange-600" />
              <span className="text-sm text-orange-700">Chef</span>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="card p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="loginId" className="label">
                Login ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="loginId"
                  type="text"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="input pl-10"
                  placeholder="waiter1"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary btn-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2 justify-center">
                  <div className="spinner" />
                  Signing in...
                </span>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Are you an admin?{' '}
              <Link href="/admin/login" className="text-primary-500 hover:text-primary-600 font-medium">
                Admin Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

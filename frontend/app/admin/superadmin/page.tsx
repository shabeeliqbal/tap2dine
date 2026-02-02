'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  Shield, Users, Edit2, Trash2, Save, X, Eye, EyeOff, 
  LogOut, Utensils, Search, RefreshCw 
} from 'lucide-react';
import { superadminAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';

interface Admin {
  id: number;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  restaurant: {
    id: number;
    name: string;
  } | null;
}

interface EditingAdmin {
  id: number;
  email: string;
  password: string;
  name: string;
}

export default function SuperadminPage() {
  const router = useRouter();
  const { isAuthenticated, isSuperAdmin, logout } = useAuthStore();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditingAdmin | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !isSuperAdmin) {
      router.push('/admin/login');
      return;
    }

    fetchAdmins();
  }, [isAuthenticated, isSuperAdmin, router, isHydrated]);

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const response = await superadminAPI.getAllAdmins();
      setAdmins(response.data.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to fetch admins');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (admin: Admin) => {
    setEditingId(admin.id);
    setEditForm({
      id: admin.id,
      email: admin.email,
      name: admin.name,
      password: '',
    });
    setShowPassword(false);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm(null);
  };

  const handleSave = async () => {
    if (!editForm) return;

    // Validate
    if (!editForm.email || !editForm.name) {
      toast.error('Email and name are required');
      return;
    }

    try {
      setSaving(true);
      const updateData: { email?: string; password?: string; name?: string } = {
        email: editForm.email,
        name: editForm.name,
      };

      if (editForm.password) {
        if (editForm.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setSaving(false);
          return;
        }
        updateData.password = editForm.password;
      }

      await superadminAPI.updateAdmin(editForm.id, updateData);
      toast.success('Admin credentials updated successfully');
      
      setEditingId(null);
      setEditForm(null);
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update admin');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to delete admin "${name}"? This will also delete their restaurant and all associated data.`)) {
      return;
    }

    try {
      await superadminAPI.deleteAdmin(id);
      toast.success('Admin deleted successfully');
      fetchAdmins();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete admin');
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/admin/login');
  };

  const filteredAdmins = admins.filter(admin => 
    admin.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    admin.restaurant?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <Utensils className="h-8 w-8 text-primary-500" />
              <span className="text-xl font-bold text-gray-800">tap2dine</span>
            </Link>
            <div className="flex items-center gap-2 bg-purple-100 text-purple-700 px-3 py-1 rounded-full">
              <Shield className="h-4 w-4" />
              <span className="text-sm font-medium">Superadmin</span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="h-5 w-5" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Management</h1>
          <p className="text-gray-600 mt-2">Manage restaurant admin credentials and accounts</p>
        </div>

        {/* Actions Bar */}
        <div className="card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, email, or restaurant..."
              className="input pl-10 w-full"
            />
          </div>
          <button
            onClick={fetchAdmins}
            className="btn-outline flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-primary-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total Admins</p>
                <p className="text-2xl font-bold text-gray-900">{admins.length}</p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Utensils className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">With Restaurants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins.filter(a => a.restaurant).length}
                </p>
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Without Restaurants</p>
                <p className="text-2xl font-bold text-gray-900">
                  {admins.filter(a => !a.restaurant).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Admins Table */}
        <div className="card overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="spinner w-10 h-10 mx-auto mb-4" />
              <p className="text-gray-500">Loading admins...</p>
            </div>
          ) : filteredAdmins.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">
                {searchQuery ? 'No admins match your search' : 'No admins found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Name</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Email</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Restaurant</th>
                    <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">Created</th>
                    <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAdmins.map((admin) => (
                    <tr key={admin.id} className="hover:bg-gray-50">
                      {editingId === admin.id ? (
                        <>
                          <td className="px-6 py-4">
                            <input
                              type="text"
                              value={editForm?.name || ''}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="input w-full"
                              placeholder="Name"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <input
                              type="email"
                              value={editForm?.email || ''}
                              onChange={(e) => setEditForm(prev => prev ? { ...prev, email: e.target.value } : null)}
                              className="input w-full"
                              placeholder="Email"
                            />
                          </td>
                          <td className="px-6 py-4">
                            <div className="relative">
                              <input
                                type={showPassword ? 'text' : 'password'}
                                value={editForm?.password || ''}
                                onChange={(e) => setEditForm(prev => prev ? { ...prev, password: e.target.value } : null)}
                                className="input w-full pr-10"
                                placeholder="New password (optional)"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-400" />
                                )}
                              </button>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Save"
                              >
                                {saving ? (
                                  <div className="spinner w-5 h-5" />
                                ) : (
                                  <Save className="h-5 w-5" />
                                )}
                              </button>
                              <button
                                onClick={handleCancelEdit}
                                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-6 py-4">
                            <p className="font-medium text-gray-900">{admin.name}</p>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-gray-600">{admin.email}</p>
                          </td>
                          <td className="px-6 py-4">
                            {admin.restaurant ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                                <Utensils className="h-3 w-3" />
                                {admin.restaurant.name}
                              </span>
                            ) : (
                              <span className="text-gray-400 text-sm">No restaurant</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">
                            {new Date(admin.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleEdit(admin)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit credentials"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(admin.id, admin.name)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete admin"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex gap-3">
            <Shield className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-purple-800 font-medium">Superadmin Access</p>
              <p className="text-sm text-purple-600 mt-1">
                You can edit admin email, password, and name. Changes to password require the admin to use the new password on their next login.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

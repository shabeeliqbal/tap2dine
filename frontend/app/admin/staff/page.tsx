'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, ChefHat, ConciergeBell, X } from 'lucide-react';
import { staffAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Staff {
  id: number;
  login_id: string;
  name: string;
  role: 'waiter' | 'chef';
  is_active: boolean;
  created_at: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    loginId: '',
    password: '',
    name: '',
    role: 'waiter' as 'waiter' | 'chef'
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const response = await staffAPI.getAll();
      setStaff(response.data.data || []);
    } catch (error) {
      toast.error('Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingStaff) {
        await staffAPI.update(editingStaff.id, {
          name: formData.name,
          password: formData.password || undefined
        });
        toast.success('Staff member updated');
      } else {
        await staffAPI.create({
          loginId: formData.loginId,
          password: formData.password,
          name: formData.name,
          role: formData.role
        });
        toast.success('Staff member created');
      }
      setShowModal(false);
      resetForm();
      fetchStaff();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (member: Staff) => {
    setEditingStaff(member);
    setFormData({
      loginId: member.login_id,
      password: '',
      name: member.name,
      role: member.role
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;

    try {
      await staffAPI.delete(id);
      toast.success('Staff member deleted');
      fetchStaff();
    } catch (error) {
      toast.error('Failed to delete staff member');
    }
  };

  const handleToggleActive = async (member: Staff) => {
    try {
      await staffAPI.update(member.id, { isActive: !member.is_active });
      toast.success(`Staff member ${member.is_active ? 'disabled' : 'enabled'}`);
      fetchStaff();
    } catch (error) {
      toast.error('Failed to update staff member');
    }
  };

  const resetForm = () => {
    setEditingStaff(null);
    setFormData({ loginId: '', password: '', name: '', role: 'waiter' });
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
        <h1 className="text-2xl font-bold text-gray-900">Staff Management</h1>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Staff
        </button>
      </div>

      {/* Staff List */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Login ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Role</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                    <p>No staff members yet</p>
                    <button
                      onClick={() => {
                        resetForm();
                        setShowModal(true);
                      }}
                      className="text-primary-500 hover:text-primary-600 mt-2"
                    >
                      Add your first staff member
                    </button>
                  </td>
                </tr>
              ) : (
                staff.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          member.role === 'chef' ? 'bg-orange-100' : 'bg-blue-100'
                        }`}>
                          {member.role === 'chef' ? (
                            <ChefHat className={`h-5 w-5 ${member.role === 'chef' ? 'text-orange-600' : 'text-blue-600'}`} />
                          ) : (
                            <ConciergeBell className="h-5 w-5 text-blue-600" />
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{member.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{member.login_id}</td>
                    <td className="px-4 py-3">
                      <span className={`badge ${
                        member.role === 'chef' 
                          ? 'bg-orange-100 text-orange-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleToggleActive(member)}
                        className={`badge ${
                          member.is_active 
                            ? 'bg-green-100 text-green-700' 
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(member)}
                          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
                          title="Edit"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(member.id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input"
                  placeholder="Staff member name"
                  required
                />
              </div>

              <div>
                <label className="label">Login ID *</label>
                <input
                  type="text"
                  value={formData.loginId}
                  onChange={(e) => setFormData({ ...formData, loginId: e.target.value })}
                  className="input"
                  placeholder="waiter1, chef1, etc."
                  required
                  disabled={!!editingStaff}
                />
                {editingStaff && (
                  <p className="text-xs text-gray-500 mt-1">Login ID cannot be changed</p>
                )}
              </div>

              <div>
                <label className="label">
                  Password {editingStaff ? '(leave empty to keep current)' : '*'}
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="input"
                  placeholder="••••••••"
                  required={!editingStaff}
                />
              </div>

              {!editingStaff && (
                <div>
                  <label className="label">Role *</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="waiter"
                        checked={formData.role === 'waiter'}
                        onChange={(e) => setFormData({ ...formData, role: 'waiter' })}
                        className="text-primary-500 focus:ring-primary-500"
                      />
                      <ConciergeBell className="h-5 w-5 text-blue-500" />
                      <span>Waiter</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        name="role"
                        value="chef"
                        checked={formData.role === 'chef'}
                        onChange={(e) => setFormData({ ...formData, role: 'chef' })}
                        className="text-primary-500 focus:ring-primary-500"
                      />
                      <ChefHat className="h-5 w-5 text-orange-500" />
                      <span>Chef</span>
                    </label>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 btn-primary"
                >
                  {saving ? (
                    <span className="flex items-center gap-2 justify-center">
                      <div className="spinner w-4 h-4" />
                      Saving...
                    </span>
                  ) : (
                    editingStaff ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

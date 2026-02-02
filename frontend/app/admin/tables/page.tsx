'use client';

import { useEffect, useState } from 'react';
import { Plus, QrCode, Download, Trash2, Edit2, X, Users, UserPlus } from 'lucide-react';
import { tablesAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface Table {
  id: number;
  table_number: string;
  qr_code: string;
  capacity: number;
  is_active: boolean;
  active_orders: number;
  assigned_waiter_id: number | null;
  waiter_name: string | null;
}

interface Waiter {
  id: number;
  name: string;
  login_id: string;
}

interface QRCodeData {
  table: Table;
  url: string;
  qrCode: string;
}

export default function TablesPage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedQR, setSelectedQR] = useState<QRCodeData | null>(null);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [assigningTable, setAssigningTable] = useState<Table | null>(null);
  
  const [formData, setFormData] = useState({
    tableNumber: '',
    capacity: 4,
  });

  useEffect(() => {
    fetchTables();
    fetchWaiters();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tablesAPI.getAll();
      setTables(response.data.data);
    } catch (error) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const fetchWaiters = async () => {
    try {
      const response = await tablesAPI.getWaiters();
      setWaiters(response.data.data);
    } catch (error) {
      console.error('Failed to load waiters');
    }
  };

  const handleAddTable = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await tablesAPI.create({
        tableNumber: formData.tableNumber,
        capacity: formData.capacity,
      });
      toast.success('Table created successfully');
      setShowAddModal(false);
      setFormData({ tableNumber: '', capacity: 4 });
      fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create table');
    }
  };

  const handleUpdateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTable) return;
    
    try {
      await tablesAPI.update(editingTable.id, {
        tableNumber: formData.tableNumber,
        capacity: formData.capacity,
      });
      toast.success('Table updated successfully');
      setEditingTable(null);
      setFormData({ tableNumber: '', capacity: 4 });
      fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update table');
    }
  };

  const handleDeleteTable = async (id: number) => {
    if (!confirm('Are you sure you want to delete this table?')) return;
    
    try {
      await tablesAPI.delete(id);
      toast.success('Table deleted successfully');
      fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete table');
    }
  };

  const handleShowQR = async (table: Table) => {
    try {
      const response = await tablesAPI.getQRCode(table.id);
      setSelectedQR(response.data.data);
      setShowQRModal(true);
    } catch (error) {
      toast.error('Failed to generate QR code');
    }
  };

  const handleDownloadQR = () => {
    if (!selectedQR) return;
    
    const link = document.createElement('a');
    link.download = `table-${selectedQR.table.table_number}-qr.png`;
    link.href = selectedQR.qrCode;
    link.click();
  };

  const openEditModal = (table: Table) => {
    setEditingTable(table);
    setFormData({
      tableNumber: table.table_number,
      capacity: table.capacity,
    });
  };

  const openAssignModal = (table: Table) => {
    setAssigningTable(table);
    setShowAssignModal(true);
  };

  const handleAssignWaiter = async (waiterId: number | null) => {
    if (!assigningTable) return;
    
    try {
      await tablesAPI.assignWaiter(assigningTable.id, waiterId);
      toast.success(waiterId ? 'Waiter assigned to table' : 'Waiter unassigned from table');
      setShowAssignModal(false);
      setAssigningTable(null);
      fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to assign waiter');
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
        <h1 className="text-2xl font-bold text-gray-900">Tables</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Add Table
        </button>
      </div>

      {/* Tables Grid */}
      {tables.length === 0 ? (
        <div className="card p-8 text-center">
          <QrCode className="h-16 w-16 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tables yet</h3>
          <p className="text-gray-500 mb-4">Add your first table to generate a QR code</p>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-primary"
          >
            Add Table
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {tables.map((table) => (
            <div key={table.id} className="card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Table {table.table_number}
                  </h3>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Users className="h-4 w-4" />
                    <span>Capacity: {table.capacity}</span>
                  </div>
                </div>
                {table.active_orders > 0 && (
                  <span className="badge-preparing">
                    {table.active_orders} active
                  </span>
                )}
              </div>

              {/* Waiter assignment info */}
              <div className="mb-3 py-2 px-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {table.waiter_name ? (
                        <span>Waiter: <span className="font-medium text-gray-900">{table.waiter_name}</span></span>
                      ) : (
                        <span className="text-gray-400">No waiter assigned</span>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => openAssignModal(table)}
                    className="text-xs text-primary-600 hover:text-primary-700 font-medium"
                  >
                    {table.waiter_name ? 'Change' : 'Assign'}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleShowQR(table)}
                  className="flex-1 btn-primary btn-sm flex items-center justify-center gap-1"
                >
                  <QrCode className="h-4 w-4" />
                  QR Code
                </button>
                <button
                  onClick={() => openEditModal(table)}
                  className="btn-outline btn-sm p-2"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteTable(table.id)}
                  className="btn-danger btn-sm p-2"
                  disabled={table.active_orders > 0}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Table Modal */}
      {(showAddModal || editingTable) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                {editingTable ? 'Edit Table' : 'Add New Table'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingTable(null);
                  setFormData({ tableNumber: '', capacity: 4 });
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form onSubmit={editingTable ? handleUpdateTable : handleAddTable} className="space-y-4">
              <div>
                <label className="label">Table Number/Name</label>
                <input
                  type="text"
                  value={formData.tableNumber}
                  onChange={(e) => setFormData({ ...formData, tableNumber: e.target.value })}
                  className="input"
                  placeholder="e.g., T1, Table 1, Patio 3"
                  required
                />
              </div>

              <div>
                <label className="label">Capacity (seats)</label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  className="input"
                  min={1}
                  max={20}
                  required
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingTable(null);
                    setFormData({ tableNumber: '', capacity: 4 });
                  }}
                  className="flex-1 btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 btn-primary">
                  {editingTable ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQRModal && selectedQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">
                Table {selectedQR.table.table_number}
              </h2>
              <button
                onClick={() => {
                  setShowQRModal(false);
                  setSelectedQR(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="bg-white p-4 rounded-lg border-2 border-gray-200 mb-4">
              <img
                src={selectedQR.qrCode}
                alt={`QR Code for Table ${selectedQR.table.table_number}`}
                className="w-full max-w-[250px] mx-auto"
              />
            </div>

            <p className="text-sm text-gray-500 mb-4 break-all">
              {selectedQR.url}
            </p>

            <button
              onClick={handleDownloadQR}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download className="h-5 w-5" />
              Download QR Code
            </button>

            <button
              onClick={() => {
                setShowQRModal(false);
                setSelectedQR(null);
              }}
              className="btn-outline w-full mt-3"
            >
              Back to Tables
            </button>

            <p className="text-xs text-gray-400 mt-4">
              Print this QR code and place it on the table
            </p>
          </div>
        </div>
      )}

      {/* Assign Waiter Modal */}
      {showAssignModal && assigningTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                Assign Waiter to Table {assigningTable.table_number}
              </h2>
              <button
                onClick={() => {
                  setShowAssignModal(false);
                  setAssigningTable(null);
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {/* Unassign option */}
              <button
                onClick={() => handleAssignWaiter(null)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  !assigningTable.assigned_waiter_id
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <span className="text-gray-500 italic">No waiter (unassign)</span>
              </button>

              {waiters.length === 0 ? (
                <p className="text-center text-gray-500 py-4">
                  No waiters available. Add waiters in the Staff section.
                </p>
              ) : (
                waiters.map((waiter) => (
                  <button
                    key={waiter.id}
                    onClick={() => handleAssignWaiter(waiter.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      assigningTable.assigned_waiter_id === waiter.id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{waiter.name}</div>
                    <div className="text-sm text-gray-500">@{waiter.login_id}</div>
                  </button>
                ))
              )}
            </div>

            <button
              onClick={() => {
                setShowAssignModal(false);
                setAssigningTable(null);
              }}
              className="btn-outline w-full mt-6"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

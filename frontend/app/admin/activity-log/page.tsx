'use client';

import { useState, useEffect } from 'react';
import { ordersAPI } from '@/lib/api';
import { FileText, Filter, User, ShoppingCart, Clock, ChevronDown, ChevronUp, Search } from 'lucide-react';

interface ActivityLogItem {
  id: number;
  order_id: number;
  order_number: string;
  table_number: string;
  action: string;
  actor_type: 'customer' | 'waiter' | 'admin';
  actor_id: number | null;
  actor_name: string | null;
  details: {
    items?: { name: string; quantity: number }[];
    totalAmount?: number;
    additionalTotal?: number;
    deviceInfo?: string | null;
  };
  created_at: string;
}

export default function ActivityLogPage() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  
  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActorType, setFilterActorType] = useState<string>('all');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params: { startDate?: string; endDate?: string } = {};
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await ordersAPI.getActivityLog(params);
      setLogs(response.data.data || []);
    } catch (err: any) {
      setError('Failed to load activity log');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSearch = () => {
    fetchLogs();
  };

  const toggleExpand = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'order_created':
        return 'Order Placed';
      case 'items_added':
        return 'Items Added';
      case 'status_updated':
        return 'Status Changed';
      default:
        return action.replace('_', ' ');
    }
  };

  const getActorIcon = (actorType: string) => {
    switch (actorType) {
      case 'customer':
        return <User className="h-4 w-4 text-blue-500" />;
      case 'waiter':
        return <User className="h-4 w-4 text-purple-500" />;
      case 'admin':
        return <User className="h-4 w-4 text-red-500" />;
      default:
        return <User className="h-4 w-4 text-gray-500" />;
    }
  };

  const getActorColor = (actorType: string) => {
    switch (actorType) {
      case 'customer':
        return 'bg-blue-100 text-blue-800';
      case 'waiter':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'order_created':
        return 'bg-green-100 text-green-800';
      case 'items_added':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    const matchesSearch = !searchTerm || 
      log.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.table_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (log.actor_name && log.actor_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesActorType = filterActorType === 'all' || log.actor_type === filterActorType;
    
    return matchesSearch && matchesActorType;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-6 w-6" />
            Order Activity Log
          </h1>
          <p className="text-gray-500 mt-1">
            Track all order activities including who placed or modified orders
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Order #, Table, or Name"
                className="input pl-10"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Actor Type
            </label>
            <select
              value={filterActorType}
              onChange={(e) => setFilterActorType(e.target.value)}
              className="input"
            >
              <option value="all">All</option>
              <option value="customer">Customer</option>
              <option value="waiter">Waiter</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <button
            onClick={handleSearch}
            className="btn-primary flex items-center gap-2"
          >
            <Filter className="h-4 w-4" />
            Apply Filters
          </button>
        </div>
      </div>

      {/* Activity Log List */}
      <div className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900">
            Activities ({filteredLogs.length})
          </h2>
        </div>
        
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>No activity logs found</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-gray-50">
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(log.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      {getActorIcon(log.actor_type)}
                      <span className={`badge ${getActorColor(log.actor_type)}`}>
                        {log.actor_type}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900">
                          {log.actor_name || 'Unknown'}
                        </span>
                        <span className={`badge ${getActionColor(log.action)}`}>
                          {getActionLabel(log.action)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-500 flex items-center gap-3 mt-1">
                        <span>Order #{log.order_number}</span>
                        <span>•</span>
                        <span>Table {log.table_number}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right text-sm text-gray-500">
                      <div>{formatDate(log.created_at)}</div>
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3 w-3" />
                        {formatTime(log.created_at)}
                      </div>
                    </div>
                    {expandedItems.has(log.id) ? (
                      <ChevronUp className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedItems.has(log.id) && log.details && (
                  <div className="mt-4 pl-10 border-l-2 border-gray-200 ml-2">
                    {log.details.items && log.details.items.length > 0 && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                          <ShoppingCart className="h-4 w-4" />
                          Items
                        </h4>
                        <ul className="space-y-1">
                          {log.details.items.map((item, idx) => (
                            <li key={idx} className="text-sm text-gray-600">
                              {item.quantity}x {item.name}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {(log.details.totalAmount || log.details.additionalTotal) && (
                      <div className="text-sm">
                        <span className="font-medium text-gray-700">
                          {log.action === 'items_added' ? 'Additional Amount: ' : 'Total Amount: '}
                        </span>
                        <span className="text-gray-900">
                          ${(log.details.totalAmount || log.details.additionalTotal)?.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {log.details.deviceInfo && (
                      <div className="text-sm text-gray-500 mt-2">
                        Device: {log.details.deviceInfo}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

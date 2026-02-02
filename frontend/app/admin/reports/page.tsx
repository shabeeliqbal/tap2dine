'use client';

import { useState, useEffect } from 'react';
import { 
  FileSpreadsheet, FileText, Download, Calendar, 
  TrendingUp, ShoppingBag, Users, DollarSign 
} from 'lucide-react';
import { reportsAPI } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import toast from 'react-hot-toast';

interface ReportData {
  period: string;
  startDate: string;
  endDate: string;
  summary: {
    totalOrders: number;
    totalRevenue: number;
    completedOrders: number;
    cancelledOrders: number;
    uniqueCustomers: number;
  };
  dishSales: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  orderDetails: {
    orderNumber: string;
    table: string;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }[];
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'custom'>('daily');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);

  useEffect(() => {
    // Only fetch if not custom, or if custom dates are set
    if (period !== 'custom' || (customStartDate && customEndDate)) {
      fetchReportPreview();
    }
  }, [period, customStartDate, customEndDate]);

  const fetchReportPreview = async () => {
    setLoading(true);
    try {
      const response = await reportsAPI.getPreview(
        period, 
        period === 'custom' ? customStartDate : undefined,
        period === 'custom' ? customEndDate : undefined
      );
      setReportData(response.data.data);
    } catch (error) {
      toast.error('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'excel' | 'pdf') => {
    setDownloading(true);
    try {
      const response = format === 'excel' 
        ? await reportsAPI.downloadExcel(
            period,
            period === 'custom' ? customStartDate : undefined,
            period === 'custom' ? customEndDate : undefined
          )
        : await reportsAPI.downloadPdf(
            period,
            period === 'custom' ? customStartDate : undefined,
            period === 'custom' ? customEndDate : undefined
          );
      
      // Create download link
      const blob = new Blob([response.data], { 
        type: format === 'excel' 
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const dateStr = period === 'custom' ? `${customStartDate}-to-${customEndDate}` : new Date().toISOString().slice(0, 10);
      link.download = `report-${period}-${dateStr}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success(`${format.toUpperCase()} report downloaded!`);
    } catch (error) {
      toast.error(`Failed to download ${format.toUpperCase()} report`);
    } finally {
      setDownloading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
      </div>

      {/* Period Selection */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-500" />
            <span className="font-medium text-gray-700">Report Period:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['daily', 'weekly', 'monthly', 'custom'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  period === p
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>
        
        {/* Custom Date Range */}
        {period === 'custom' && (
          <div className="mt-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="input"
                max={customEndDate || new Date().toISOString().slice(0, 10)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="input"
                min={customStartDate}
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            {(!customStartDate || !customEndDate) && (
              <p className="text-sm text-amber-600">Please select both dates</p>
            )}
          </div>
        )}
        
        {reportData && (
          <p className="text-sm text-gray-500 mt-2">
            Showing data from {reportData.startDate} to {reportData.endDate}
          </p>
        )}
      </div>

      {/* Download Buttons */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => handleDownload('excel')}
          disabled={downloading || (period === 'custom' && (!customStartDate || !customEndDate))}
          className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <div className="spinner w-5 h-5" />
          ) : (
            <FileSpreadsheet className="h-5 w-5" />
          )}
          Download Excel
        </button>
        <button
          onClick={() => handleDownload('pdf')}
          disabled={downloading || (period === 'custom' && (!customStartDate || !customEndDate))}
          className="btn-secondary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {downloading ? (
            <div className="spinner w-5 h-5" />
          ) : (
            <FileText className="h-5 w-5" />
          )}
          Download PDF
        </button>
      </div>

      {reportData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ShoppingBag className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.summary.totalOrders}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Revenue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {formatCurrency(reportData.summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Unique Customers</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.summary.uniqueCustomers}</p>
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Completed Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.summary.completedOrders}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Selling Dishes */}
          <div className="card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Top Selling Dishes</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Rank</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Dish Name</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Quantity Sold</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.dishSales.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-gray-500">
                        No dishes sold in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.dishSales.slice(0, 10).map((dish, index) => (
                      <tr key={dish.name} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm text-gray-900">{index + 1}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{dish.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{dish.quantity}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(dish.revenue)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="card">
            <div className="p-4 border-b">
              <h2 className="font-semibold text-gray-900">Order Details</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Order #</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Table</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Customer</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Total</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {reportData.orderDetails.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                        No orders in this period
                      </td>
                    </tr>
                  ) : (
                    reportData.orderDetails.map((order) => (
                      <tr key={order.orderNumber} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{order.orderNumber}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{order.table}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{order.customerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`badge ${
                            order.status === 'completed' ? 'bg-green-100 text-green-700' :
                            order.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {order.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

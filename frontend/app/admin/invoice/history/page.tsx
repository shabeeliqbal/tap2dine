'use client';

import { useEffect, useState, useRef } from 'react';
import { Search, Receipt, Printer, ArrowLeft, Calendar, Eye, X } from 'lucide-react';
import Link from 'next/link';
import { invoicesAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_number: string;
  special_requests?: string;
}

interface Invoice {
  id: number;
  invoice_number: string;
  table_number: string;
  table_id: number;
  order_ids: number[];
  items: InvoiceItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  customer_name?: string;
  payment_method: string;
  notes?: string;
  created_at: string;
  restaurant?: {
    name: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
}

export default function InvoiceHistoryPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const params: any = { limit: 50 };
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      
      const response = await invoicesAPI.getHistory(params);
      setInvoices(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoice history');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      fetchInvoices();
      return;
    }

    setSearching(true);
    try {
      const response = await invoicesAPI.search(searchQuery.trim());
      setInvoices(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.error('Search query must be at least 2 characters');
      } else {
        toast.error('Search failed');
      }
    } finally {
      setSearching(false);
    }
  };

  const handleDateFilter = () => {
    setLoading(true);
    fetchInvoices();
  };

  const handleClearFilters = () => {
    setSearchQuery('');
    setStartDate('');
    setEndDate('');
    setLoading(true);
    fetchInvoices();
  };

  const handleViewInvoice = async (id: number) => {
    setLoadingInvoice(true);
    try {
      const response = await invoicesAPI.getById(id);
      setSelectedInvoice(response.data.data);
    } catch (error) {
      toast.error('Failed to load invoice details');
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent || !selectedInvoice) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${selectedInvoice.invoice_number}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; padding: 10px; }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header h1 { font-size: 18px; margin-bottom: 5px; }
            .header p { font-size: 10px; color: #666; }
            .info { margin-bottom: 15px; font-size: 11px; }
            .info p { margin: 3px 0; }
            .items { width: 100%; margin-bottom: 15px; }
            .items th, .items td { text-align: left; padding: 3px 0; font-size: 11px; }
            .items th { border-bottom: 1px solid #000; }
            .items .qty { text-align: center; width: 30px; }
            .items .price { text-align: right; width: 60px; }
            .totals { border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; }
            .totals .row { display: flex; justify-content: space-between; margin: 5px 0; font-size: 12px; }
            .totals .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 20px; padding-top: 10px; border-top: 1px dashed #000; font-size: 10px; }
            @media print { body { width: 80mm; } }
          </style>
        </head>
        <body>${printContent.innerHTML}</body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
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
        <div className="flex items-center gap-4">
          <Link href="/admin/invoice" className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Invoice History</h1>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by invoice number, table, or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="input pl-10 pr-20"
              />
              <button
                onClick={handleSearch}
                disabled={searching}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-primary text-sm py-1 px-3"
              >
                {searching ? 'Searching...' : 'Search'}
              </button>
            </div>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-gray-400" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input text-sm"
              placeholder="Start date"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input text-sm"
              placeholder="End date"
            />
            <button onClick={handleDateFilter} className="btn-secondary text-sm py-2 px-3">
              Filter
            </button>
            <button onClick={handleClearFilters} className="text-sm text-gray-500 hover:text-gray-700">
              Clear
            </button>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="card">
        <div className="p-4 border-b">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Receipt className="h-5 w-5 text-primary-500" />
            Invoices ({invoices.length})
          </h2>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Invoice #</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Table</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Customer</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Items</th>
                <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Total</th>
                <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Date</th>
                <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                    No invoices found
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-primary-600">
                        {invoice.invoice_number}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">Table {invoice.table_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {invoice.customer_name || '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {invoice.items?.length || 0} items
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium">{formatCurrency(invoice.total_amount)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {formatDateTime(invoice.created_at)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewInvoice(invoice.id)}
                        className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="View Invoice"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {(selectedInvoice || loadingInvoice) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white">
              <h2 className="font-semibold text-gray-900">
                {loadingInvoice ? 'Loading...' : `Invoice ${selectedInvoice?.invoice_number}`}
              </h2>
              <div className="flex items-center gap-2">
                {selectedInvoice && (
                  <button onClick={handlePrint} className="btn-primary flex items-center gap-2 text-sm">
                    <Printer className="h-4 w-4" />
                    Print
                  </button>
                )}
                <button
                  onClick={() => setSelectedInvoice(null)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-6">
              {loadingInvoice ? (
                <div className="flex items-center justify-center h-64">
                  <div className="spinner w-12 h-12" />
                </div>
              ) : selectedInvoice && (
                <div ref={printRef}>
                  {/* Header */}
                  <div className="header text-center mb-6 pb-4 border-b border-dashed border-gray-300">
                    {selectedInvoice.restaurant?.logo_url && (
                      <img 
                        src={getImageUrl(selectedInvoice.restaurant.logo_url)} 
                        alt="Logo" 
                        className="h-12 mx-auto mb-2"
                        style={{ maxHeight: '48px' }}
                      />
                    )}
                    <h1 className="text-xl font-bold">{selectedInvoice.restaurant?.name || 'Restaurant'}</h1>
                    {selectedInvoice.restaurant?.address && (
                      <p className="text-sm text-gray-600">{selectedInvoice.restaurant.address}</p>
                    )}
                    {selectedInvoice.restaurant?.phone && (
                      <p className="text-sm text-gray-600">{selectedInvoice.restaurant.phone}</p>
                    )}
                  </div>

                  {/* Invoice Info */}
                  <div className="info mb-4 text-sm">
                    <p><strong>Invoice:</strong> {selectedInvoice.invoice_number}</p>
                    <p><strong>Table:</strong> {selectedInvoice.table_number}</p>
                    <p><strong>Date:</strong> {formatDateTime(selectedInvoice.created_at)}</p>
                    {selectedInvoice.customer_name && (
                      <p><strong>Customer:</strong> {selectedInvoice.customer_name}</p>
                    )}
                    <p><strong>Payment:</strong> {selectedInvoice.payment_method}</p>
                  </div>

                  {/* Items */}
                  <table className="items w-full mb-4">
                    <thead>
                      <tr className="border-b border-gray-300">
                        <th className="text-left py-2">Item</th>
                        <th className="qty text-center py-2">Qty</th>
                        <th className="price text-right py-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, index) => (
                        <tr key={index} className="border-b border-gray-100">
                          <td className="py-2">
                            <span>{item.name}</span>
                            {item.special_requests && (
                              <span className="block text-xs text-gray-500">({item.special_requests})</span>
                            )}
                          </td>
                          <td className="qty text-center py-2">{item.quantity}</td>
                          <td className="price text-right py-2">{formatCurrency(item.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Totals */}
                  <div className="totals border-t border-dashed border-gray-300 pt-4">
                    <div className="row flex justify-between mb-2">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedInvoice.subtotal)}</span>
                    </div>
                    {selectedInvoice.tax_percent > 0 && (
                      <div className="row flex justify-between mb-2">
                        <span>Tax ({selectedInvoice.tax_percent}%)</span>
                        <span>{formatCurrency(selectedInvoice.tax_amount)}</span>
                      </div>
                    )}
                    <div className="total flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-2">
                      <span>Total</span>
                      <span>{formatCurrency(selectedInvoice.total_amount)}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {selectedInvoice.notes && (
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm text-gray-600"><strong>Notes:</strong> {selectedInvoice.notes}</p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="footer text-center mt-6 pt-4 border-t border-dashed border-gray-300">
                    <p className="text-sm text-gray-600">Thank you for dining with us!</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

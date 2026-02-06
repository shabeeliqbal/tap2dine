'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, Receipt, Search, History, CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { tablesAPI, invoicesAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Table {
  id: number;
  table_number: string;
  is_active: boolean;
  active_orders?: number;
}

interface InvoiceItem {
  id: number;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_number: string;
  special_requests?: string;
}

interface InvoiceData {
  id?: number;
  invoice_number: string;
  restaurant: {
    name: string;
    address?: string;
    phone?: string;
    logo_url?: string;
  };
  table: {
    id: number;
    table_number: string;
  };
  orders: {
    id: number;
    order_number: string;
    customer_name?: string;
    created_at: string;
  }[];
  items: InvoiceItem[];
  subtotal: number;
  tax_percent: number;
  tax_amount: number;
  total_amount: number;
  generated_at?: string;
  created_at?: string;
}

export default function InvoicePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [generatingInvoice, setGeneratingInvoice] = useState(false);
  const [invoiceGenerated, setInvoiceGenerated] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllTables, setShowAllTables] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tablesAPI.getAll();
      const allTables = response.data.data.filter((t: Table) => t.is_active);
      setTables(allTables);
    } catch (error) {
      toast.error('Failed to load tables');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTable = async (tableId: number) => {
    setSelectedTable(tableId);
    setLoadingInvoice(true);
    setInvoice(null);
    setInvoiceGenerated(false);

    try {
      const response = await invoicesAPI.getPreview(tableId);
      setInvoice(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('No orders found for this table');
      } else {
        toast.error('Failed to load invoice preview');
      }
      setSelectedTable(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handleGenerateInvoice = async () => {
    if (!selectedTable || !invoice) return;

    setGeneratingInvoice(true);
    try {
      const response = await invoicesAPI.generate(selectedTable);
      setInvoice(response.data.data);
      setInvoiceGenerated(true);
      toast.success(`Invoice ${response.data.data.invoice_number} generated successfully!`);
      fetchTables();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setGeneratingInvoice(false);
    }
  };

  const tablesWithOrders = tables.filter(t => (t.active_orders ?? 0) > 0);
  const displayTables = showAllTables ? tables : (tablesWithOrders.length > 0 ? tablesWithOrders : tables);
  
  const filteredTables = displayTables.filter(t => 
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    const invoiceNumber = invoice?.invoice_number || 'PREVIEW';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceNumber}</title>
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

  const handleNewInvoice = () => {
    setSelectedTable(null);
    setInvoice(null);
    setInvoiceGenerated(false);
    fetchTables();
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
        <h1 className="text-2xl font-bold text-gray-900">Invoice / Bill</h1>
        <Link href="/admin/invoice/history" className="btn-secondary flex items-center gap-2">
          <History className="h-4 w-4" />
          View History
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table Selection */}
        <div className="card">
          <div className="p-4 border-b">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Receipt className="h-5 w-5 text-primary-500" />
              Select Table
            </h2>
          </div>
          
          <div className="p-4">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search table..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input pl-10"
              />
            </div>

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">
                {tablesWithOrders.length > 0 ? `${tablesWithOrders.length} table(s) with orders` : 'No active orders'}
              </span>
              <button
                type="button"
                onClick={() => setShowAllTables(!showAllTables)}
                className="text-sm text-primary-600 hover:underline"
              >
                {showAllTables ? 'Show tables with orders' : 'Show all tables'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTables.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tables found</p>
              ) : (
                filteredTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table.id)}
                    disabled={invoiceGenerated}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTable === table.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    } ${invoiceGenerated ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Table {table.table_number}</span>
                      {(table.active_orders ?? 0) > 0 && (
                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full">
                          {table.active_orders} order(s)
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Invoice Preview */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">
                {invoiceGenerated ? 'Generated Invoice' : 'Invoice Preview'}
              </h2>
              {invoice && (
                <div className="flex items-center gap-2">
                  {invoiceGenerated ? (
                    <>
                      <button onClick={handlePrint} className="btn-primary flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        Print
                      </button>
                      <button onClick={handleNewInvoice} className="btn-secondary">
                        New Invoice
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={handlePrint} className="btn-secondary flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        Print Preview
                      </button>
                      <button
                        onClick={handleGenerateInvoice}
                        disabled={generatingInvoice}
                        className="btn-primary flex items-center gap-2"
                      >
                        {generatingInvoice ? (
                          <>
                            <div className="spinner w-4 h-4 border-2" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Generate & Save
                          </>
                        )}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            <div className="p-6">
              {loadingInvoice ? (
                <div className="flex items-center justify-center h-64">
                  <div className="spinner w-12 h-12" />
                </div>
              ) : invoice ? (
                <div className="max-w-md mx-auto bg-white border rounded-lg p-6 shadow-sm">
                  {invoiceGenerated && (
                    <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
                      <CheckCircle className="h-5 w-5" />
                      <span className="text-sm font-medium">Invoice saved! Orders marked as completed.</span>
                    </div>
                  )}
                  
                  <div ref={printRef}>
                    <div className="header text-center mb-6 pb-4 border-b border-dashed border-gray-300">
                      {invoice.restaurant.logo_url && (
                        <img 
                          src={getImageUrl(invoice.restaurant.logo_url)} 
                          alt="Logo" 
                          className="h-12 mx-auto mb-2"
                          style={{ maxHeight: '48px' }}
                        />
                      )}
                      <h1 className="text-xl font-bold">{invoice.restaurant.name}</h1>
                      {invoice.restaurant.address && (
                        <p className="text-sm text-gray-600">{invoice.restaurant.address}</p>
                      )}
                      {invoice.restaurant.phone && (
                        <p className="text-sm text-gray-600">{invoice.restaurant.phone}</p>
                      )}
                    </div>

                    <div className="info mb-4 text-sm">
                      <p><strong>Invoice:</strong> {invoice.invoice_number || 'PREVIEW'}</p>
                      <p><strong>Table:</strong> {invoice.table.table_number}</p>
                      <p><strong>Date:</strong> {formatDateTime(invoice.generated_at || invoice.created_at || new Date().toISOString())}</p>
                      {invoice.orders.length > 0 && invoice.orders[0].customer_name && (
                        <p><strong>Customer:</strong> {invoice.orders[0].customer_name}</p>
                      )}
                    </div>

                    <table className="items w-full mb-4">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left py-2">Item</th>
                          <th className="qty text-center py-2">Qty</th>
                          <th className="price text-right py-2">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoice.items.map((item, index) => (
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

                    <div className="totals border-t border-dashed border-gray-300 pt-4">
                      <div className="row flex justify-between mb-2">
                        <span>Subtotal</span>
                        <span>{formatCurrency(invoice.subtotal)}</span>
                      </div>
                      {invoice.tax_percent > 0 && (
                        <div className="row flex justify-between mb-2">
                          <span>Tax ({invoice.tax_percent}%)</span>
                          <span>{formatCurrency(invoice.tax_amount)}</span>
                        </div>
                      )}
                      <div className="total flex justify-between font-bold text-lg border-t border-gray-300 pt-2 mt-2">
                        <span>Total</span>
                        <span>{formatCurrency(invoice.total_amount)}</span>
                      </div>
                    </div>

                    <div className="footer text-center mt-6 pt-4 border-t border-dashed border-gray-300">
                      <p className="text-sm text-gray-600">Thank you for dining with us!</p>
                      <p className="text-xs text-gray-400 mt-1">Please pay at the counter</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                  <Receipt className="h-16 w-16 mb-4 text-gray-300" />
                  <p>Select a table to generate invoice</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

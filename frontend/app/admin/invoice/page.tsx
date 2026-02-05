'use client';

import { useEffect, useState, useRef } from 'react';
import { Printer, X, Receipt, Search } from 'lucide-react';
import { tablesAPI, ordersAPI } from '@/lib/api';
import { formatCurrency, formatDateTime, getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Table {
  id: number;
  table_number: string;
  is_active: boolean;
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
  generated_at: string;
}

export default function InvoicePage() {
  const [tables, setTables] = useState<Table[]>([]);
  const [selectedTable, setSelectedTable] = useState<number | null>(null);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingInvoice, setLoadingInvoice] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchTables();
  }, []);

  const fetchTables = async () => {
    try {
      const response = await tablesAPI.getAll();
      setTables(response.data.data.filter((t: Table) => t.is_active));
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

    try {
      const response = await ordersAPI.getTableInvoice(tableId);
      setInvoice(response.data.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        toast.error('No orders found for this table');
      } else {
        toast.error('Failed to load invoice');
      }
      setSelectedTable(null);
    } finally {
      setLoadingInvoice(false);
    }
  };

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Please allow popups to print');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoice?.invoice_number}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Courier New', monospace;
              font-size: 12px;
              width: 80mm;
              padding: 10px;
            }
            .header {
              text-align: center;
              margin-bottom: 15px;
              border-bottom: 1px dashed #000;
              padding-bottom: 10px;
            }
            .header h1 {
              font-size: 18px;
              margin-bottom: 5px;
            }
            .header p {
              font-size: 10px;
              color: #666;
            }
            .info {
              margin-bottom: 15px;
              font-size: 11px;
            }
            .info p {
              margin: 3px 0;
            }
            .items {
              width: 100%;
              margin-bottom: 15px;
            }
            .items th, .items td {
              text-align: left;
              padding: 3px 0;
              font-size: 11px;
            }
            .items th {
              border-bottom: 1px solid #000;
            }
            .items .qty {
              text-align: center;
              width: 30px;
            }
            .items .price {
              text-align: right;
              width: 60px;
            }
            .totals {
              border-top: 1px dashed #000;
              padding-top: 10px;
              margin-top: 10px;
            }
            .totals .row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              font-size: 12px;
            }
            .totals .total {
              font-weight: bold;
              font-size: 14px;
              border-top: 1px solid #000;
              padding-top: 5px;
              margin-top: 5px;
            }
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 10px;
              border-top: 1px dashed #000;
              font-size: 10px;
            }
            @media print {
              body {
                width: 80mm;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  const filteredTables = tables.filter(t => 
    t.table_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
            {/* Search */}
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

            {/* Table List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTables.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No tables found</p>
              ) : (
                filteredTables.map((table) => (
                  <button
                    key={table.id}
                    onClick={() => handleSelectTable(table.id)}
                    className={`w-full p-3 rounded-lg border text-left transition-colors ${
                      selectedTable === table.id
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">Table {table.table_number}</span>
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
              <h2 className="font-semibold text-gray-900">Invoice Preview</h2>
              {invoice && (
                <button
                  onClick={handlePrint}
                  className="btn-primary flex items-center gap-2"
                >
                  <Printer className="h-4 w-4" />
                  Print Invoice
                </button>
              )}
            </div>

            <div className="p-6">
              {loadingInvoice ? (
                <div className="flex items-center justify-center h-64">
                  <div className="spinner w-12 h-12" />
                </div>
              ) : invoice ? (
                <div className="max-w-md mx-auto bg-white border rounded-lg p-6 shadow-sm">
                  {/* Printable Invoice Content */}
                  <div ref={printRef}>
                    {/* Header */}
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

                    {/* Invoice Info */}
                    <div className="info mb-4 text-sm">
                      <p><strong>Invoice:</strong> {invoice.invoice_number}</p>
                      <p><strong>Table:</strong> {invoice.table.table_number}</p>
                      <p><strong>Date:</strong> {formatDateTime(invoice.generated_at)}</p>
                      {invoice.orders.length > 0 && invoice.orders[0].customer_name && (
                        <p><strong>Customer:</strong> {invoice.orders[0].customer_name}</p>
                      )}
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
                        {invoice.items.map((item, index) => (
                          <tr key={index} className="border-b border-gray-100">
                            <td className="py-2">
                              <span>{item.name}</span>
                              {item.special_requests && (
                                <span className="block text-xs text-gray-500">
                                  ({item.special_requests})
                                </span>
                              )}
                            </td>
                            <td className="qty text-center py-2">{item.quantity}</td>
                            <td className="price text-right py-2">
                              {formatCurrency(item.total_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Totals */}
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

                    {/* Footer */}
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

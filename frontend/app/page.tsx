import Link from 'next/link';
import { Utensils, QrCode, ClipboardList, Smartphone } from 'lucide-react';

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Utensils className="h-8 w-8 text-primary-500" />
            <span className="text-xl font-bold text-gray-800">tap2dine</span>
          </div>
          <div className="flex items-center gap-4">
            <Link 
              href="/staff/login" 
              className="text-gray-600 hover:text-gray-900"
            >
              Staff Portal
            </Link>
            <Link 
              href="/admin/login" 
              className="btn-primary"
            >
              Restaurant Login
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
          Modern QR Ordering
          <span className="text-primary-500"> Made Simple</span>
        </h1>
        <p className="text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
          Let your customers order food directly from their phones. 
          No app downloads, no waiting for staff. Just scan and order.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/admin/login" className="btn-primary btn-lg">
            Admin Login
          </Link>
          <Link href="/staff/login" className="btn-outline btn-lg">
            Staff Login
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How It Works
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <QrCode className="h-8 w-8 text-primary-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Generate QR Codes</h3>
            <p className="text-gray-600">
              Create unique QR codes for each table in your restaurant. Print and place them on tables.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-secondary-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-secondary-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Customers Scan & Order</h3>
            <p className="text-gray-600">
              Customers scan the QR code, browse your menu, and place orders directly from their phones.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="card p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-8 w-8 text-blue-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Manage Orders</h3>
            <p className="text-gray-600">
              Receive orders in real-time on your dashboard. Update status and keep customers informed.
            </p>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Why Choose QR Order?
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-4">
              <div className="text-3xl font-bold text-primary-500 mb-2">50%</div>
              <div className="text-gray-600">Faster ordering process</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-primary-500 mb-2">0</div>
              <div className="text-gray-600">App downloads required</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-primary-500 mb-2">100%</div>
              <div className="text-gray-600">Mobile-friendly design</div>
            </div>
            <div className="p-4">
              <div className="text-3xl font-bold text-primary-500 mb-2">24/7</div>
              <div className="text-gray-600">Real-time order updates</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 py-20 text-center">
        <div className="card p-10 bg-gradient-to-r from-primary-500 to-primary-600 text-white">
          <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
          <p className="text-lg mb-8 opacity-90">
            Login to manage your restaurant orders.
          </p>
          <Link href="/admin/login" className="btn bg-white text-primary-600 hover:bg-gray-100 btn-lg">
            Login Now
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Utensils className="h-6 w-6 text-primary-500" />
            <span className="text-lg font-bold text-white">tap2dine</span>
          </div>
          <p className="text-sm">
            © {new Date().getFullYear()} tap2dine. All rights reserved.
          </p>
        </div>
      </footer>
    </main>
  );
}

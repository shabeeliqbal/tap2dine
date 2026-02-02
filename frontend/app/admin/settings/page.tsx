'use client';

import { useEffect, useState } from 'react';
import { Store, User, Save, Image as ImageIcon, Eye, EyeOff, UserCircle, DollarSign } from 'lucide-react';
import { restaurantAPI, authAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { getImageUrl } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Restaurant {
  id: number;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  logo_url?: string;
}

interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
}

export default function SettingsPage() {
  const { user, restaurant: authRestaurant } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const [restaurantForm, setRestaurantForm] = useState({
    name: '',
    description: '',
    address: '',
    phone: '',
    showPrices: true,
    requireCustomerName: false,
    showTotalAtCheckout: true,
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await restaurantAPI.get();
      const data = response.data.data;
      setRestaurantForm({
        name: data.name || '',
        description: data.description || '',
        address: data.address || '',
        phone: data.phone || '',
        showPrices: data.show_prices === 1 || data.show_prices === true || data.show_prices === undefined,
        requireCustomerName: data.require_customer_name === 1 || data.require_customer_name === true,
        showTotalAtCheckout: data.show_total_at_checkout === 1 || data.show_total_at_checkout === true || data.show_total_at_checkout === undefined,
      });
      if (data.logo_url) {
        setLogoPreview(getImageUrl(data.logo_url));
      }
    } catch (error) {
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRestaurant = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const formData = new FormData();
    formData.append('name', restaurantForm.name);
    formData.append('description', restaurantForm.description);
    formData.append('address', restaurantForm.address);
    formData.append('phone', restaurantForm.phone);
    formData.append('show_prices', restaurantForm.showPrices.toString());
    formData.append('require_customer_name', restaurantForm.requireCustomerName.toString());
    formData.append('show_total_at_checkout', restaurantForm.showTotalAtCheckout.toString());

    const logoInput = document.getElementById('logoInput') as HTMLInputElement;
    if (logoInput?.files?.[0]) {
      formData.append('logo', logoInput.files[0]);
    }

    try {
      await restaurantAPI.update(formData);
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
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
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Restaurant Settings */}
      <div className="card">
        <div className="p-4 border-b flex items-center gap-2">
          <Store className="h-5 w-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Restaurant Information</h2>
        </div>

        <form onSubmit={handleSaveRestaurant} className="p-6 space-y-4">
          {/* Logo Upload */}
          <div>
            <label className="label">Restaurant Logo</label>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-gray-300" />
                )}
              </div>
              <input
                id="logoInput"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="text-sm"
              />
            </div>
          </div>

          <div>
            <label className="label">Restaurant Name *</label>
            <input
              type="text"
              value={restaurantForm.name}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, name: e.target.value })}
              className="input"
              required
            />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea
              value={restaurantForm.description}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, description: e.target.value })}
              className="input"
              rows={3}
              placeholder="Brief description of your restaurant"
            />
          </div>

          <div>
            <label className="label">Address</label>
            <input
              type="text"
              value={restaurantForm.address}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, address: e.target.value })}
              className="input"
              placeholder="123 Main Street, City"
            />
          </div>

          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              value={restaurantForm.phone}
              onChange={(e) => setRestaurantForm({ ...restaurantForm, phone: e.target.value })}
              className="input"
              placeholder="+1 234 567 890"
            />
          </div>

          {/* Price Visibility Toggle */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-gray-500" />
                <div>
                  <label className="font-medium text-gray-700">Show Prices to Customers</label>
                  <p className="text-sm text-gray-500">When disabled, prices will be hidden on the customer menu</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestaurantForm({ ...restaurantForm, showPrices: !restaurantForm.showPrices })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  restaurantForm.showPrices ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    restaurantForm.showPrices ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Show Total at Checkout Toggle */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-gray-500" />
                <div>
                  <label className="font-medium text-gray-700">Show Total at Checkout</label>
                  <p className="text-sm text-gray-500">When disabled, the total amount will be hidden at checkout</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestaurantForm({ ...restaurantForm, showTotalAtCheckout: !restaurantForm.showTotalAtCheckout })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  restaurantForm.showTotalAtCheckout ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    restaurantForm.showTotalAtCheckout ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Require Customer Name Toggle */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="h-5 w-5 text-gray-500" />
                <div>
                  <label className="font-medium text-gray-700">Require Customer Name</label>
                  <p className="text-sm text-gray-500">When enabled, customers must enter their name before ordering. Device info will also be captured.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRestaurantForm({ ...restaurantForm, requireCustomerName: !restaurantForm.requireCustomerName })}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                  restaurantForm.requireCustomerName ? 'bg-primary-500' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    restaurantForm.requireCustomerName ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="spinner w-5 h-5" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Account Info */}
      <div className="card">
        <div className="p-4 border-b flex items-center gap-2">
          <User className="h-5 w-5 text-primary-500" />
          <h2 className="font-semibold text-gray-900">Account Information</h2>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="label">Name</label>
            <p className="text-gray-900">{user?.name}</p>
          </div>

          <div>
            <label className="label">Email</label>
            <p className="text-gray-900">{user?.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

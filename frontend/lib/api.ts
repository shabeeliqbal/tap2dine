import axios from 'axios';

// Use environment variable for API URL, fallback to relative URL for local dev
// In production on cPanel, set NEXT_PUBLIC_API_URL to your backend URL
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      // First try regular admin token
      let token = localStorage.getItem('token');
      
      // If no admin token, try staff token
      if (!token) {
        token = localStorage.getItem('staff-token');
      }
      
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Check current path to determine where to redirect
        const isStaffPage = window.location.pathname.startsWith('/staff');
        
        if (isStaffPage) {
          localStorage.removeItem('staff-token');
          window.location.href = '/staff/login';
        } else {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('restaurant');
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string; restaurantName?: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Superadmin API
export const superadminAPI = {
  getAllAdmins: () => api.get('/auth/admins'),
  updateAdmin: (id: number, data: { email?: string; password?: string; name?: string }) =>
    api.put(`/auth/admins/${id}`, data),
  deleteAdmin: (id: number) => api.delete(`/auth/admins/${id}`),
};

// Restaurant API
export const restaurantAPI = {
  get: () => api.get('/restaurants'),
  getPublic: (id: number) => api.get(`/restaurants/public/${id}`),
  update: (data: FormData) => api.put('/restaurants', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getDashboard: () => api.get('/restaurants/dashboard'),
};

// Tables API
export const tablesAPI = {
  getAll: () => api.get('/tables'),
  get: (id: number) => api.get(`/tables/${id}`),
  getByQR: (qrCode: string) => api.get(`/tables/qr/${qrCode}`),
  create: (data: { tableNumber: string; capacity?: number }) =>
    api.post('/tables', data),
  update: (id: number, data: { tableNumber?: string; capacity?: number; isActive?: boolean }) =>
    api.put(`/tables/${id}`, data),
  delete: (id: number) => api.delete(`/tables/${id}`),
  getQRCode: (id: number) => api.get(`/tables/${id}/qr`),
  getWaiters: () => api.get('/tables/waiters'),
  assignWaiter: (tableId: number, waiterId: number | null) =>
    api.put(`/tables/${tableId}/assign-waiter`, { waiterId }),
  getTablesWithOrders: () => api.get('/tables/with-orders'),
  selfAssignToTable: (tableId: number) => api.post(`/tables/${tableId}/self-assign`),
};

// Menu API
export const menuAPI = {
  getAll: () => api.get('/menu'),
  getPublic: (restaurantId: number) => api.get(`/menu/public/${restaurantId}`),
  get: (id: number) => api.get(`/menu/item/${id}`),
  create: (data: FormData) => api.post('/menu', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  update: (id: number, data: FormData) => api.put(`/menu/item/${id}`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: number) => api.delete(`/menu/item/${id}`),
  toggleAvailability: (id: number) => api.patch(`/menu/item/${id}/toggle`),
  
  // Categories
  getCategories: () => api.get('/menu/categories'),
  createCategory: (data: { name: string; description?: string; sortOrder?: number }) =>
    api.post('/menu/categories', data),
  updateCategory: (id: number, data: { name?: string; description?: string; sortOrder?: number; isActive?: boolean }) =>
    api.put(`/menu/categories/${id}`, data),
  deleteCategory: (id: number) => api.delete(`/menu/categories/${id}`),
};

// Orders API
export const ordersAPI = {
  getAll: (params?: { status?: string; date?: string; tableId?: number }) =>
    api.get('/orders', { params }),
  getActive: () => api.get('/orders/active'),
  get: (id: number) => api.get(`/orders/${id}`),
  getByNumber: (orderNumber: string) => api.get(`/orders/track/${orderNumber}`),
  getForTable: (tableId: number) => api.get(`/orders/table/${tableId}`),
  getHistory: (date?: string) => api.get('/orders/history/daily', { params: { date } }),
  create: (data: {
    tableId: number;
    items: { menuItemId: number; quantity: number; specialRequests?: string }[];
    customerName?: string;
    customerPhone?: string;
    specialInstructions?: string;
    deviceInfo?: string;
  }) => api.post('/orders', data),
  updateStatus: (id: number, status: string) =>
    api.patch(`/orders/${id}/status`, { status }),
  addItems: (orderId: number, items: { menuItemId: number; quantity: number; specialRequests?: string }[], addedBy?: string) =>
    api.post(`/orders/${orderId}/items`, { items, addedBy }),
  getActivityLog: (params?: { startDate?: string; endDate?: string; orderId?: number }) =>
    api.get('/orders/activity-log', { params }),
  getTableInvoice: (tableId: number) => api.get(`/orders/invoice/table/${tableId}`),
};

// Reports API
export const reportsAPI = {
  getPreview: (period: 'daily' | 'weekly' | 'monthly' | 'custom', startDate?: string, endDate?: string) =>
    api.get('/reports/preview', { params: { period, startDate, endDate } }),
  downloadExcel: (period: 'daily' | 'weekly' | 'monthly' | 'custom', startDate?: string, endDate?: string) =>
    api.get('/reports/excel', { params: { period, startDate, endDate }, responseType: 'blob' }),
  downloadPdf: (period: 'daily' | 'weekly' | 'monthly' | 'custom', startDate?: string, endDate?: string) =>
    api.get('/reports/pdf', { params: { period, startDate, endDate }, responseType: 'blob' }),
};

// Staff API
export const staffAPI = {
  getAll: () => api.get('/staff'),
  create: (data: { loginId: string; password: string; name: string; role: 'waiter' | 'chef' }) =>
    api.post('/staff', data),
  update: (id: number, data: { name?: string; password?: string; isActive?: boolean }) =>
    api.put(`/staff/${id}`, data),
  delete: (id: number) => api.delete(`/staff/${id}`),
  login: (data: { loginId: string; password: string }) =>
    api.post('/staff/login', data),
};

export default api;

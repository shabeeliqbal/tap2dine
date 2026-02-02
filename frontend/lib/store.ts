import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Auth Store
interface User {
  id: number;
  email: string;
  name: string;
}

interface Restaurant {
  id: number;
  name: string;
  logo_url?: string;
}

interface AuthState {
  user: User | null;
  restaurant: Restaurant | null;
  token: string | null;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  setAuth: (user: User, restaurant: Restaurant | null, token: string, isSuperAdmin?: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      restaurant: null,
      token: null,
      isAuthenticated: false,
      isSuperAdmin: false,
      setAuth: (user, restaurant, token, isSuperAdmin = false) => {
        localStorage.setItem('token', token);
        set({ user, restaurant, token, isAuthenticated: true, isSuperAdmin });
      },
      logout: () => {
        localStorage.removeItem('token');
        set({ user: null, restaurant: null, token: null, isAuthenticated: false, isSuperAdmin: false });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);

// Cart Store (for customer ordering)
interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  specialRequests?: string;
  image_url?: string;
}

interface CartState {
  items: CartItem[];
  tableId: number | null;
  restaurantId: number | null;
  restaurantName: string | null;
  tableNumber: string | null;
  addItem: (item: Omit<CartItem, 'quantity'>) => void;
  removeItem: (menuItemId: number) => void;
  updateQuantity: (menuItemId: number, quantity: number) => void;
  updateSpecialRequests: (menuItemId: number, requests: string) => void;
  clearCart: () => void;
  setTableInfo: (tableId: number, tableNumber: string, restaurantId: number, restaurantName: string) => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  tableId: null,
  restaurantId: null,
  restaurantName: null,
  tableNumber: null,
  
  addItem: (item) => {
    set((state) => {
      const existingItem = state.items.find((i) => i.menuItemId === item.menuItemId);
      if (existingItem) {
        return {
          items: state.items.map((i) =>
            i.menuItemId === item.menuItemId
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        };
      }
      return { items: [...state.items, { ...item, quantity: 1 }] };
    });
  },
  
  removeItem: (menuItemId) => {
    set((state) => ({
      items: state.items.filter((i) => i.menuItemId !== menuItemId),
    }));
  },
  
  updateQuantity: (menuItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(menuItemId);
      return;
    }
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, quantity } : i
      ),
    }));
  },
  
  updateSpecialRequests: (menuItemId, requests) => {
    set((state) => ({
      items: state.items.map((i) =>
        i.menuItemId === menuItemId ? { ...i, specialRequests: requests } : i
      ),
    }));
  },
  
  clearCart: () => {
    set({ items: [] });
  },
  
  setTableInfo: (tableId, tableNumber, restaurantId, restaurantName) => {
    set({ tableId, tableNumber, restaurantId, restaurantName });
  },
  
  getTotal: () => {
    return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  },
  
  getItemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));

// Customer Orders Store (to track order history)
interface CustomerOrder {
  orderNumber: string;
  createdAt: string;
  qrCode: string;
}

interface CustomerOrdersState {
  orders: CustomerOrder[];
  addOrder: (orderNumber: string, qrCode: string) => void;
  getOrders: (qrCode: string) => CustomerOrder[];
  clearOrders: () => void;
}

export const useCustomerOrdersStore = create<CustomerOrdersState>()(
  persist(
    (set, get) => ({
      orders: [],
      
      addOrder: (orderNumber, qrCode) => {
        set((state) => ({
          orders: [
            { orderNumber, qrCode, createdAt: new Date().toISOString() },
            ...state.orders.filter(o => o.orderNumber !== orderNumber) // Avoid duplicates
          ].slice(0, 20) // Keep last 20 orders
        }));
      },
      
      getOrders: (qrCode) => {
        return get().orders.filter(o => o.qrCode === qrCode);
      },
      
      clearOrders: () => {
        set({ orders: [] });
      },
    }),
    {
      name: 'customer-orders-storage',
    }
  )
);

// Staff Auth Store
interface Staff {
  id: number;
  login_id: string;
  name: string;
  role: 'waiter' | 'chef';
}

interface StaffAuthState {
  staff: Staff | null;
  restaurant: Restaurant | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (staff: Staff, restaurant: Restaurant | null, token: string) => void;
  logout: () => void;
}

export const useStaffAuthStore = create<StaffAuthState>()(
  persist(
    (set) => ({
      staff: null,
      restaurant: null,
      token: null,
      isAuthenticated: false,
      setAuth: (staff, restaurant, token) => {
        localStorage.setItem('staff-token', token);
        set({ staff, restaurant, token, isAuthenticated: true });
      },
      logout: () => {
        localStorage.removeItem('staff-token');
        set({ staff: null, restaurant: null, token: null, isAuthenticated: false });
      },
    }),
    {
      name: 'staff-auth-storage',
    }
  )
);

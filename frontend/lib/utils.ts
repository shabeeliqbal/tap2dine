export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export const formatDate = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(new Date(date));
};

export const formatTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

export const formatDateTime = (date: string | Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(date));
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'badge-pending';
    case 'received':
      return 'badge-received';
    case 'preparing':
      return 'badge-preparing';
    case 'ready':
      return 'badge-ready';
    case 'completed':
      return 'badge-completed';
    case 'cancelled':
      return 'badge-cancelled';
    default:
      return 'badge bg-gray-100 text-gray-800';
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending':
      return 'Pending';
    case 'received':
      return 'Received';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
};

export const getNextStatus = (currentStatus: string): string | null => {
  switch (currentStatus) {
    case 'pending':
      return 'received';
    case 'received':
      return 'preparing';
    case 'preparing':
      return 'ready';
    case 'ready':
      return 'completed';
    default:
      return null;
  }
};

export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};

export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const getImageUrl = (path: string | null | undefined): string => {
  if (!path) return '/placeholder-food.jpg';
  if (path.startsWith('http')) return path;
  // Use environment variable for API URL, fallback to relative path for production
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || '';
  return `${apiUrl}${path}`;
};

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket = (): Socket => {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
};

export const disconnectSocket = (): void => {
  if (socket?.connected) {
    socket.disconnect();
  }
};

export const joinRestaurantRoom = (restaurantId: number): void => {
  const s = connectSocket();
  s.emit('join-restaurant', restaurantId);
};

export const joinOrderRoom = (orderId: number): void => {
  const s = connectSocket();
  s.emit('join-order', orderId);
};

export const joinTableRoom = (tableId: number): void => {
  const s = connectSocket();
  s.emit('join-table', tableId);
};

export const onNewOrder = (callback: (order: any) => void): void => {
  const s = getSocket();
  s.on('new-order', callback);
};

export const onOrderUpdated = (callback: (order: any) => void): void => {
  const s = getSocket();
  s.on('order-updated', callback);
};

export const onStatusUpdated = (callback: (data: { orderId: number; status: string }) => void): void => {
  const s = getSocket();
  s.on('status-updated', callback);
};

export const joinStaffRoom = (staffId: number): void => {
  const s = connectSocket();
  s.emit('join-staff', staffId);
};

export const onOrderReady = (callback: (data: { orderId: number; orderNumber: string; tableNumber: string; message: string }) => void): void => {
  const s = getSocket();
  s.on('order-ready', callback);
};

export const offOrderReady = (): void => {
  const s = getSocket();
  s.off('order-ready');
};

export const offNewOrder = (): void => {
  const s = getSocket();
  s.off('new-order');
};

export const offOrderUpdated = (): void => {
  const s = getSocket();
  s.off('order-updated');
};

export const offStatusUpdated = (): void => {
  const s = getSocket();
  s.off('status-updated');
};

export default {
  getSocket,
  connectSocket,
  disconnectSocket,
  joinRestaurantRoom,
  joinOrderRoom,
  joinTableRoom,
  joinStaffRoom,
  onNewOrder,
  onOrderUpdated,
  onStatusUpdated,
  onOrderReady,
  offNewOrder,
  offOrderUpdated,
  offStatusUpdated,
  offOrderReady,
};

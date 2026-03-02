import { io } from 'socket.io-client';

// Socket connects through nginx /socket.io/ proxy → notification-hub:3005
// Do NOT use a hardcoded port — nginx handles the routing inside Docker
let socket = null;

export const getSocket = () => {
  if (!socket) {
    socket = io('/', {
      path: '/socket.io/',
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
};

export const connectSocket  = () => { const s = getSocket(); if (!s.connected) s.connect(); return s; };
export const joinOrderRoom  = (id) => { connectSocket().emit('joinOrder', id); };
export const leaveOrderRoom = (id) => { getSocket().emit('leaveOrder', id); };
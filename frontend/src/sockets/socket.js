import { io } from 'socket.io-client';

// On Vercel: VITE_SOCKET_URL = your Render Notification Hub URL
// Locally: empty string → Vite proxies /socket.io → localhost:3005
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || '';

let socket = null;

export const getSocket = () => {
  if (!socket) socket = io(SOCKET_URL, { autoConnect: false });
  return socket;
};

export const connectSocket  = () => { const s=getSocket(); if (!s.connected) s.connect(); return s; };
export const joinOrderRoom  = id => connectSocket().emit('joinOrder', id);
export const leaveOrderRoom = id => getSocket().emit('leaveOrder', id);
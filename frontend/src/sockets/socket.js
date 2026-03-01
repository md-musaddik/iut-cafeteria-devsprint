import { io } from 'socket.io-client';

let socket = null;

export const getSocket = () => {
  if (!socket) socket = io('/', { autoConnect: false });
  return socket;
};

export const connectSocket  = () => { const s = getSocket(); if (!s.connected) s.connect(); return s; };
export const joinOrderRoom  = (id) => { connectSocket().emit('joinOrder', id); };
export const leaveOrderRoom = (id) => { getSocket().emit('leaveOrder', id); };

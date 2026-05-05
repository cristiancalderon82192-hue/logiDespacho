import { io } from 'socket.io-client';

// Forzamos a que si falla la variable de entorno, busque tu servidor real en Render
const apiUrl = import.meta.env.VITE_API_URL || 'https://logidespacho-1.onrender.com';

export const socket = io(apiUrl, {
  autoConnect: true,
  transports: ['websocket', 'polling'] // Esto es CLAVE para que no falle en celulares o en Render
});
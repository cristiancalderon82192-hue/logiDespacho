import { io } from 'socket.io-client';

// Se conecta automáticamente a tu URL de producción en Vercel/Render 
// o al localhost si estás haciendo pruebas en tu PC.
const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const socket = io(apiUrl, {
  autoConnect: true, // Se conecta apenas se importe el archivo
});
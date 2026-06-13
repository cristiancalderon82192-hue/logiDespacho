import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// ==========================================
// NOTIFICACIONES TOAST (Para mensajes rápidos)
// ==========================================

export const mostrarExito = (mensaje) => {
  toast.success(mensaje, {
    duration: 3000,
    position: 'top-right',
    style: {
      background: '#333',
      color: '#fff',
      borderRadius: '10px',
    },
    iconTheme: {
      primary: '#47B3A8',
      secondary: '#fff',
    },
  });
};

export const mostrarError = (mensaje) => {
  toast.error(mensaje, {
    duration: 4000,
    position: 'top-right',
    style: {
      background: '#333',
      color: '#fff',
      borderRadius: '10px',
    },
    iconTheme: {
      primary: '#ef4444',
      secondary: '#fff',
    },
  });
};

export const mostrarInfo = (mensaje) => {
  toast(mensaje, {
    duration: 3000,
    position: 'top-right',
    icon: 'ℹ️',
    style: {
      background: '#333',
      color: '#fff',
      borderRadius: '10px',
    },
  });
};

// ==========================================
// MODALES SWEETALERT2 (Para confirmaciones o bloqueos)
// ==========================================

export const confirmarAccion = async (titulo, texto = "¿Estás seguro?", textoConfirmar = "Sí, continuar") => {
  const result = await MySwal.fire({
    title: titulo,
    text: texto,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#47B3A8',
    cancelButtonColor: '#ef4444',
    confirmButtonText: textoConfirmar,
    cancelButtonText: 'Cancelar',
    background: '#ffffff',
    color: '#1e293b',
    borderRadius: '1rem',
    backdrop: `rgba(0,0,0,0.5)`,
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-lg font-bold px-4 py-2',
      cancelButton: 'rounded-lg font-bold px-4 py-2'
    }
  });

  return result.isConfirmed;
};

export const alertaModal = (titulo, texto, tipo = "info") => {
  return MySwal.fire({
    title: titulo,
    text: texto,
    icon: tipo, // 'success', 'error', 'warning', 'info', 'question'
    confirmButtonColor: '#47B3A8',
    confirmButtonText: 'Entendido',
    customClass: {
      popup: 'rounded-2xl',
      confirmButton: 'rounded-lg font-bold px-4 py-2'
    }
  });
};

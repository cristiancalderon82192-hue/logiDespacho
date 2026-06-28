import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

const GlobalLoader = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('Procesando, por favor espere...');

  useEffect(() => {
    const handleShow = (e) => {
      setMessage(e.detail?.message || 'Procesando, por favor espere...');
      setIsVisible(true);
    };

    const handleHide = () => {
      setIsVisible(false);
    };

    window.addEventListener('show-loader', handleShow);
    window.addEventListener('hide-loader', handleHide);

    return () => {
      window.removeEventListener('show-loader', handleShow);
      window.removeEventListener('hide-loader', handleHide);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4 transform scale-100 animate-bounceIn">
        <div className="relative mb-6">
          <div className="absolute inset-0 bg-emerald-100 rounded-full animate-ping opacity-75"></div>
          <div className="relative bg-emerald-500 text-white p-4 rounded-full shadow-lg">
            <Loader2 size={40} className="animate-spin" />
          </div>
        </div>
        
        <h3 className="text-xl font-extrabold text-slate-800 mb-2 text-center">
          Guardando Cambios
        </h3>
        <p className="text-slate-500 text-center font-medium text-sm animate-pulse">
          {message}
        </p>
      </div>
    </div>
  );
};

export default GlobalLoader;

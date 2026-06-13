import React, { useState, useEffect } from 'react';
import { MessageCircle, QrCode, LogOut, CheckCircle, RefreshCw, Save, Edit3 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const WhatsappConfig = () => {
  const { user } = useAuth();
  const [status, setStatus] = useState('DISCONNECTED');
  const [qrCode, setQrCode] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [template, setTemplate] = useState('');
  const [savingTemplate, setSavingTemplate] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/status`);
      const data = await res.json();
      setStatus(data.status);
      setQrCode(data.qr);
    } catch (error) {
      console.error("Error fetching whatsapp status", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplate = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/template`);
      const data = await res.json();
      setTemplate(data.mensaje);
    } catch (error) {
      console.error("Error fetching template", error);
    }
  };

  useEffect(() => {
    fetchStatus();
    fetchTemplate();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    if (!(await confirmarAccion("Confirmar", "¿Seguro que deseas cerrar la sesión de WhatsApp vinculada? Esto detendrá el envío de comprobantes hasta que vincules un nuevo dispositivo."))) return;
    setLoading(true);
    try {
      await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/logout`, { method: 'POST' });
      await fetchStatus();
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const handleSaveTemplate = async () => {
    setSavingTemplate(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/template`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensaje: template })
      });
      if (res.ok) {
        mostrarInfo("¡Plantilla de mensaje guardada correctamente!");
      } else {
        mostrarError("Error al guardar la plantilla.");
      }
    } catch (error) {
      console.error(error);
      mostrarError("Error de conexión al guardar.");
    } finally {
      setSavingTemplate(false);
    }
  };

  const rol = String(user?.role).toLowerCase().trim();
  const rolNombre = user?.rol_nombre ? String(user.rol_nombre).toLowerCase().trim() : '';

  if (rol !== '1' && rol !== 'admin' && rol !== '6' && rol !== 'especial' && rolNombre !== 'super_admin') {
    return <div className="p-8 text-center text-red-600 font-bold">No tienes permisos para ver esta página. Solo el Administrador o Super Admin pueden configurar WhatsApp.</div>;
  }

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 w-full max-w-full">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600">
              <MessageCircle size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Configuración de WhatsApp</h2>
              <p className="text-sm text-slate-500">Vincula un dispositivo móvil para habilitar el envío automático de comprobantes de entrega a los clientes.</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-6 md:p-10 bg-slate-50 rounded-xl border border-slate-100 min-h-[300px]">
            {loading ? (
              <div className="flex flex-col items-center text-slate-400">
                <RefreshCw size={32} className="animate-spin mb-2" />
                <p>Cargando estado del servicio...</p>
              </div>
            ) : status === 'CONNECTED' ? (
              <div className="flex flex-col items-center text-center space-y-4 animate-fadeIn">
                <div className="bg-green-100 p-4 rounded-full text-green-600 shadow-sm">
                  <CheckCircle size={56} />
                </div>
                <h3 className="text-2xl font-bold text-green-600">¡WhatsApp Vinculado!</h3>
                <p className="text-slate-600 max-w-md">El servidor está listo. Cada vez que un conductor marque un pedido como "Entregado", el cliente recibirá un mensaje de texto automático con su recibo.</p>
                <button onClick={handleLogout} className="mt-6 flex items-center gap-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm active:scale-95">
                  <LogOut size={18} /> Desvincular Dispositivo Actual
                </button>
              </div>
            ) : status === 'QR_READY' && qrCode ? (
              <div className="flex flex-col items-center text-center space-y-4 animate-fadeIn">
                <div className="bg-blue-100 p-4 rounded-full text-blue-600 shadow-sm">
                  <QrCode size={48} />
                </div>
                <h3 className="text-xl font-bold text-slate-800">Vincular Dispositivo</h3>
                <p className="text-sm text-slate-600 max-w-sm">Abre WhatsApp en tu teléfono celular, ve a <b>Dispositivos vinculados</b> y escanea este código QR.</p>
                <div className="p-4 bg-white rounded-2xl shadow-md border border-slate-200 mt-4">
                  <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 object-contain" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center space-y-4 text-slate-500 animate-fadeIn">
                <RefreshCw size={32} className="animate-spin text-slate-400" />
                <h3 className="text-lg font-bold text-slate-700">Iniciando el servicio de mensajería...</h3>
                <p className="text-sm max-w-sm">Puede tardar hasta un par de minutos. El código QR aparecerá automáticamente cuando esté listo.</p>
              </div>
            )}
          </div>
        </div>

        {/* 👇 NUEVA SECCIÓN DE PLANTILLA DE MENSAJE 👇 */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center gap-3 mb-6 border-b pb-4">
            <div className="bg-orange-100 p-3 rounded-full text-orange-600">
              <Edit3 size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Mensaje a Enviar</h2>
              <p className="text-sm text-slate-500">Personaliza el texto que recibirán tus clientes. Usa las variables disponibles.</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800">
              <p className="font-bold mb-2">Variables disponibles (se reemplazarán automáticamente):</p>
              <ul className="list-disc pl-5 space-y-1 font-mono">
                <li><span className="font-bold text-blue-600">{`{{nombre}}`}</span> - Nombre del cliente</li>
                <li><span className="font-bold text-blue-600">{`{{id_factura}}`}</span> - Número de factura/guía</li>
                <li><span className="font-bold text-blue-600">{`{{estado}}`}</span> - Estado (ej. Entregado)</li>
                <li><span className="font-bold text-blue-600">{`{{link}}`}</span> - Link único de descarga del comprobante</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Plantilla del Mensaje</label>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="w-full h-48 p-4 bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-all font-sans text-slate-700 resize-none"
                placeholder="Escribe tu mensaje aquí..."
              />
            </div>

            <div className="flex justify-end">
              <button 
                onClick={handleSaveTemplate}
                disabled={savingTemplate}
                className="flex items-center gap-2 bg-slate-900 text-white hover:bg-slate-800 px-6 py-2.5 rounded-lg font-bold transition-all shadow-sm active:scale-95 disabled:opacity-50"
              >
                {savingTemplate ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />} 
                {savingTemplate ? 'Guardando...' : 'Guardar Mensaje'}
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default WhatsappConfig;

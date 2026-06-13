import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Truck, MapPin, Phone, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const RutaConductor = () => {
  const { user } = useAuth();
  const [pedidos, setPedidos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para el Modal de Entrega
  const [selectedPedido, setSelectedPedido] = useState(null);
  const [formEntrega, setFormEntrega] = useState({
    fecha_real: new Date().toISOString().split('T')[0],
    hora_real: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    estado: 'Entregado',
    observaciones: ''
  });

  const fetchRuta = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/ruta-conductor/${user.id}`);
      const data = await res.json();
      setPedidos(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchRuta();
  }, [user]);

  const handleConfirmarEntrega = async (e) => {
    e.preventDefault();
    if (!selectedPedido) return;

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/${selectedPedido.id}/entrega`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formEntrega)
      });

      if (res.ok) {
        mostrarExito("✅ Entrega registrada");
        setSelectedPedido(null); // Cerrar modal
        fetchRuta(); // Recargar lista
      } else {
        mostrarError("Error al registrar");
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="bg-slate-100 min-h-screen p-4 pb-20">
      <h1 className="text-2xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Truck className="text-blue-600"/> Mi Ruta Hoy
      </h1>

      {loading ? <div className="text-center p-10">Cargando ruta...</div> : (
        <div className="space-y-4">
          {pedidos.length === 0 && (
            <div className="bg-white p-6 rounded-lg text-center text-slate-500 shadow">
              <CheckCircle size={48} className="mx-auto text-green-500 mb-2"/>
              ¡Todo listo! No tienes entregas pendientes.
            </div>
          )}

          {pedidos.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-2">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded">
                  {p.id_factura}
                </span>
                <span className="font-bold text-slate-700">{Number(p.total_peso)} Kg</span>
              </div>
              
              <h3 className="font-bold text-lg text-slate-800">{p.nombre_cliente}</h3>
              
              <div className="mt-2 space-y-1 text-sm text-slate-600">
                <p className="flex items-start gap-2">
                  <MapPin size={16} className="text-red-500 mt-0.5 shrink-0"/> 
                  {p.direccion_entrega}, {p.ciudad}
                </p>
                <p className="flex items-center gap-2">
                  <Phone size={16} className="text-green-500"/> 
                  {p.telefono || 'Sin teléfono'}
                </p>
              </div>

              <button 
                onClick={() => setSelectedPedido(p)}
                className="w-full mt-4 bg-blue-600 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
              >
                <CheckCircle size={20}/> REPORTAR ENTREGA
              </button>
            </div>
          ))}
        </div>
      )}

      {/* --- MODAL DE CONFIRMACIÓN DE ENTREGA --- */}
      {selectedPedido && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-md rounded-xl p-6 shadow-2xl animate-slideUp">
            <h2 className="text-xl font-bold mb-4">Finalizar Entrega</h2>
            <p className="text-sm text-slate-500 mb-4">Factura: {selectedPedido.id_factura}</p>
            
            <form onSubmit={handleConfirmarEntrega} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                <select 
                  className="w-full p-3 border rounded-lg bg-slate-50"
                  value={formEntrega.estado}
                  onChange={e => setFormEntrega({...formEntrega, estado: e.target.value})}
                >
                  <option value="Entregado">✅ Entregado Exitosamente</option>
                  <option value="Novedad">⚠️ No Entregado (Novedad)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Real</label>
                  <input 
                    type="date" 
                    required
                    className="w-full p-2 border rounded-lg"
                    value={formEntrega.fecha_real}
                    onChange={e => setFormEntrega({...formEntrega, fecha_real: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Hora Real</label>
                  <input 
                    type="time" 
                    required
                    className="w-full p-2 border rounded-lg"
                    value={formEntrega.hora_real}
                    onChange={e => setFormEntrega({...formEntrega, hora_real: e.target.value})}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Observaciones</label>
                <textarea 
                  className="w-full p-2 border rounded-lg" 
                  rows="2"
                  placeholder="Quien recibe, novedades..."
                  value={formEntrega.observaciones}
                  onChange={e => setFormEntrega({...formEntrega, observaciones: e.target.value})}
                ></textarea>
              </div>

              <div className="flex gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setSelectedPedido(null)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-3 font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg"
                >
                  CONFIRMAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RutaConductor;
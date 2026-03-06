import React, { useState, useEffect } from 'react';
import { Truck, Save, Edit, Trash2, RefreshCw, Activity, AlertCircle, Search } from 'lucide-react';

const Flota = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [formData, setFormData] = useState({ 
    placa: '', 
    modelo: '', 
    capacidad_kg: '', 
    estado: '1' 
  });
  const [editingId, setEditingId] = useState(null);
  const [filtro, setFiltro] = useState(''); // Estado para el buscador

  // CARGAR DATOS
  const fetchVehiculos = async () => {
    try {
      // CORREGIDO: Uso de backticks (``)
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vehiculos`);
      setVehiculos(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchVehiculos(); }, []);

  // GUARDAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.placa) return alert("La placa es obligatoria");

    // CORREGIDO: Uso de backticks (``) en ambas opciones
    const url = editingId 
      ? `${import.meta.env.VITE_API_URL}/api/vehiculos/${editingId}` 
      : `${import.meta.env.VITE_API_URL}/api/vehiculos`;
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "✅ Vehículo Actualizado" : "✅ Vehículo Registrado");
        setFormData({ placa: '', modelo: '', capacidad_kg: '', estado: '1' });
        setEditingId(null);
        fetchVehiculos();
      } else {
        alert(data.error);
      }
    } catch (error) { alert("Error de conexión"); }
  };

  // EDITAR
  const handleEdit = (v) => {
    setEditingId(v.id);
    setFormData({ 
      placa: v.placa, 
      modelo: v.modelo, 
      capacidad_kg: v.capacidad_kg, 
      estado: String(v.estado) 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar vehículo?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/vehiculos/${id}`, { method: 'DELETE' });
      if (res.ok) fetchVehiculos();
      else alert("No se puede eliminar (tiene historial)");
    } catch (e) { alert("Error de conexión"); }
  };

  // Filtrar vehículos por placa
  const filtrados = vehiculos.filter(v => v.placa.toLowerCase().includes(filtro.toLowerCase()));

  return (
    <div className="space-y-4 md:space-y-8 w-full max-w-full overflow-x-hidden p-1 md:p-0">
      
      {/* HEADER RESPONSIVO */}
      <div className="border-b border-slate-200 pb-4 md:pb-6">
        <h1 className="text-xl md:text-3xl font-bold text-slate-800 flex items-center gap-2 md:gap-3">
          <Truck className="text-blue-600 w-6 h-6 md:w-8 md:h-8" /> Gestión de Flota
        </h1>
        <p className="text-slate-500 mt-1 text-xs md:text-sm">Administra los vehículos de transporte.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        
        {/* FORMULARIO RESPONSIVO */}
        <div className={`bg-white rounded-xl shadow-md border overflow-hidden h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'border-slate-200'}`}>
          <div className={`px-4 md:px-6 py-3 md:py-4 border-b font-bold uppercase tracking-wider text-xs md:text-sm flex justify-between items-center ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
            {editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            {editingId && (
              <button onClick={() => {setEditingId(null); setFormData({ placa: '', modelo: '', capacidad_kg: '', estado: '1' })}} className="text-[10px] md:text-xs underline text-orange-800">
                Cancelar
              </button>
            )}
          </div>
          
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div>
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Placa</label>
              <input type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase text-sm md:text-base outline-none bg-white" placeholder="AAA-123" required />
            </div>
            <div>
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Modelo / Marca</label>
              <input type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base outline-none bg-white" placeholder="Ej: Chevrolet NHR" />
            </div>
            <div>
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Capacidad (Kg)</label>
              <input type="number" value={formData.capacidad_kg} onChange={e => setFormData({...formData, capacidad_kg: e.target.value})} className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 text-sm md:text-base outline-none bg-white" placeholder="2000" />
            </div>
            <div>
              <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-lg bg-white text-sm md:text-base outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1">🟢 Activo / Disponible</option>
                <option value="0">🔴 En Taller / Inactivo</option>
              </select>
            </div>
            <button type="submit" className={`w-full py-2.5 md:py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 shadow-md transition-transform active:scale-95 text-sm md:text-base ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>

        {/* TABLA CON SCROLL TÁCTIL Y BUSCADOR */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar por placa..." className="w-full pl-10 pr-4 py-2 border rounded-xl text-sm outline-none bg-white shadow-sm" value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[500px]">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] md:text-xs uppercase">
                  <tr>
                    <th className="p-3 md:p-5 font-bold">Placa / Modelo</th>
                    <th className="p-3 md:p-5 font-bold text-center">Capacidad</th>
                    <th className="p-3 md:p-5 font-bold text-center">Estado</th>
                    <th className="p-3 md:p-5 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
                  {filtrados.length === 0 ? (
                    <tr><td colSpan="4" className="p-8 text-center text-slate-400">No se encontraron vehículos.</td></tr>
                  ) : (
                    filtrados.map((v) => (
                      <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 md:p-5 align-middle">
                          <div className="font-mono font-bold text-slate-800 text-sm md:text-base">{v.placa}</div>
                          <div className="text-[10px] md:text-[11px] text-slate-500 mt-0.5">{v.modelo}</div>
                        </td>
                        <td className="p-3 md:p-5 text-slate-600 align-middle text-center font-medium">
                          {Number(v.capacidad_kg).toLocaleString()} kg
                        </td>
                        <td className="p-3 md:p-5 text-center align-middle">
                          <span className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-bold uppercase inline-flex items-center gap-1 ${v.estado === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {v.estado === 1 ? <Activity size={10} className="md:w-3 md:h-3"/> : <AlertCircle size={10} className="md:w-3 md:h-3"/>}
                            {v.estado === 1 ? 'Activo' : 'Taller'}
                          </span>
                        </td>
                        <td className="p-3 md:p-5 text-center align-middle">
                          <div className="flex justify-center gap-1.5 md:gap-2">
                            <button onClick={() => handleEdit(v)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-1.5 md:p-2 rounded-lg transition-colors"><Edit size={16} className="md:w-[18px] md:h-[18px]"/></button>
                            <button onClick={() => handleDelete(v.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-1.5 md:p-2 rounded-lg transition-colors"><Trash2 size={16} className="md:w-[18px] md:h-[18px]"/></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Flota;
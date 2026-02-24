import React, { useState, useEffect } from 'react';
import { Truck, Save, Edit, Trash2, RefreshCw, Activity, AlertCircle } from 'lucide-react';

const Flota = () => {
  const [vehiculos, setVehiculos] = useState([]);
  const [formData, setFormData] = useState({ 
    placa: '', 
    modelo: '', 
    capacidad_kg: '', 
    estado: '1' 
  });
  const [editingId, setEditingId] = useState(null);

  // CARGAR DATOS
  const fetchVehiculos = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/vehiculos');
      setVehiculos(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchVehiculos(); }, []);

  // GUARDAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.placa) return alert("La placa es obligatoria");

    const url = editingId 
      ? `http://localhost:3000/api/vehiculos/${editingId}` 
      : 'http://localhost:3000/api/vehiculos';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (res.ok) {
        alert(editingId ? "Vehículo Actualizado" : "Vehículo Registrado");
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
      estado: v.estado 
    });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar vehículo?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/vehiculos/${id}`, { method: 'DELETE' });
      if (res.ok) fetchVehiculos();
      else alert("No se puede eliminar (tiene historial)");
    } catch (e) { alert("Error de conexión"); }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Truck className="text-blue-600" size={32} /> Gestión de Flota
        </h1>
        <p className="text-slate-500 mt-1">Administra los vehículos de transporte.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className={`rounded-xl shadow-md border overflow-hidden h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-4 border-b font-bold uppercase tracking-wider ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
            {editingId ? 'Editar Vehículo' : 'Nuevo Vehículo'}
            {editingId && <button onClick={() => {setEditingId(null); setFormData({ placa: '', modelo: '', capacidad_kg: '', estado: '1' })}} className="ml-4 text-xs underline">Cancelar</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Placa</label>
              <input type="text" value={formData.placa} onChange={e => setFormData({...formData, placa: e.target.value.toUpperCase()})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono font-bold uppercase" placeholder="AAA-123" required />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Modelo / Marca</label>
              <input type="text" value={formData.modelo} onChange={e => setFormData({...formData, modelo: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Ej: Chevrolet NHR" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Capacidad (Kg)</label>
              <input type="number" value={formData.capacidad_kg} onChange={e => setFormData({...formData, capacidad_kg: e.target.value})} className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="2000" />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estado</label>
              <select value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value})} className="w-full px-4 py-2 border rounded-lg bg-white">
                <option value="1">🟢 Activo / Disponible</option>
                <option value="0">🔴 En Taller / Inactivo</option>
              </select>
            </div>
            <button type="submit" className={`w-full py-2 rounded-lg font-bold text-white flex justify-center items-center gap-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>

        {/* TABLA */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-5 font-bold">Placa</th>
                <th className="p-5 font-bold">Modelo</th>
                <th className="p-5 font-bold">Capacidad</th>
                <th className="p-5 font-bold text-center">Estado</th>
                <th className="p-5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {vehiculos.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="p-5 font-mono font-bold text-slate-800 bg-slate-50 w-24 text-center border-r border-slate-100">{v.placa}</td>
                  <td className="p-5 font-medium text-slate-700">{v.modelo}</td>
                  <td className="p-5 text-slate-600">{Number(v.capacidad_kg).toLocaleString()} kg</td>
                  <td className="p-5 text-center">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase flex justify-center items-center gap-1 ${v.estado === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {v.estado === 1 ? <Activity size={12}/> : <AlertCircle size={12}/>}
                      {v.estado === 1 ? 'Activo' : 'Taller'}
                    </span>
                  </td>
                  <td className="p-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(v)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg"><Edit size={18}/></button>
                      <button onClick={() => handleDelete(v.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg"><Trash2 size={18}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
};

export default Flota;
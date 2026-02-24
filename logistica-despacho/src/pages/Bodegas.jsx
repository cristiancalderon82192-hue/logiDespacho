import React, { useState, useEffect } from 'react';
import { Building2, Save, Edit, Trash2, RefreshCw } from 'lucide-react';

const Bodegas = () => {
  const [bodegas, setBodegas] = useState([]);
  const [formData, setFormData] = useState({ nombre: '' });
  const [editingId, setEditingId] = useState(null);

  // CARGAR DATOS
  const fetchBodegas = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/bodegas');
      setBodegas(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchBodegas(); }, []);

  // GUARDAR (CREAR / EDITAR)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return alert("El nombre es obligatorio");

    const url = editingId 
      ? `http://localhost:3000/api/bodegas/${editingId}` 
      : 'http://localhost:3000/api/bodegas';
    
    const method = editingId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        alert(editingId ? "Bodega Actualizada" : "Bodega Creada");
        setFormData({ nombre: '' });
        setEditingId(null);
        fetchBodegas();
      } else {
        alert("Error al guardar");
      }
    } catch (error) { alert("Error de conexión"); }
  };

  // PREPARAR EDICIÓN
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ nombre: item.nombre });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar esta bodega?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/bodegas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) fetchBodegas();
      else alert(data.error || "No se pudo eliminar");
    } catch (error) { alert("Error de conexión"); }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Building2 className="text-blue-600" size={32} /> Gestión de Bodegas
          </h1>
          <p className="text-slate-500 mt-1">Administra los puntos de despacho y almacenamiento.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* FORMULARIO */}
        <div className={`rounded-xl shadow-md border overflow-hidden h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <div className={`px-6 py-4 border-b flex justify-between items-center ${editingId ? 'bg-orange-100' : 'bg-slate-900'}`}>
            <h3 className={`font-bold uppercase tracking-wider ${editingId ? 'text-orange-800' : 'text-white'}`}>
              {editingId ? 'Editar Bodega' : 'Nueva Bodega'}
            </h3>
            {editingId && <button onClick={() => {setEditingId(null); setFormData({nombre: ''})}} className="text-xs underline text-orange-800">Cancelar</button>}
          </div>
          
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase ml-1 mb-1">Nombre de la Bodega</label>
              <input 
                type="text" 
                value={formData.nombre} 
                onChange={(e) => setFormData({nombre: e.target.value})} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white" 
                placeholder="Ej: Bodega Norte" 
                required 
              />
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
                <th className="p-5 font-bold w-20">ID</th>
                <th className="p-5 font-bold">Nombre</th>
                <th className="p-5 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {bodegas.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-slate-400">No hay bodegas creadas.</td></tr>
              ) : (
                bodegas.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-5 font-mono text-slate-400 font-bold">#{b.id}</td>
                    <td className="p-5 font-bold text-slate-700 text-lg">{b.nombre}</td>
                    <td className="p-5 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => handleEdit(b)} className="bg-blue-50 text-blue-600 hover:bg-blue-100 p-2 rounded-lg transition-colors"><Edit size={18}/></button>
                        <button onClick={() => handleDelete(b.id)} className="bg-red-50 text-red-600 hover:bg-red-100 p-2 rounded-lg transition-colors"><Trash2 size={18}/></button>
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
  );
};

export default Bodegas;
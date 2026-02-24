import React, { useState, useEffect } from 'react';
import { Map, Plus, Trash2, Pencil, Save, X } from 'lucide-react';

const Zonas = () => {
  const [zonas, setZonas] = useState([]);
  const [nombre, setNombre] = useState('');
  const [editingId, setEditingId] = useState(null); // ID que se está editando
  const [loading, setLoading] = useState(true);

  const fetchZonas = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/zonas');
      setZonas(await res.json());
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  useEffect(() => { fetchZonas(); }, []);

  // GUARDAR O ACTUALIZAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    const url = editingId 
      ? `http://localhost:3000/api/zonas/${editingId}` 
      : 'http://localhost:3000/api/zonas';
    
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
      });

      if (res.ok) {
        setNombre('');
        setEditingId(null);
        fetchZonas();
        alert(editingId ? "Zona actualizada" : "Zona creada");
      }
    } catch (error) { alert("Error al guardar"); }
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que quieres eliminar esta zona?")) return;

    try {
      const res = await fetch(`http://localhost:3000/api/zonas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        fetchZonas();
      } else {
        alert(data.error || "Error al eliminar");
      }
    } catch (error) { alert("Error de conexión"); }
  };

  // CARGAR DATOS EN FORMULARIO PARA EDITAR
  const handleEdit = (zona) => {
    setNombre(zona.nombre);
    setEditingId(zona.id);
  };

  // CANCELAR EDICIÓN
  const handleCancel = () => {
    setNombre('');
    setEditingId(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
        <Map className="text-blue-600" /> Gestión de Zonas
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* FORMULARIO INTELIGENTE */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-fit">
          <h2 className="font-bold text-lg mb-4 text-slate-700 flex justify-between items-center">
            {editingId ? 'Editar Zona' : 'Nueva Zona'}
            {editingId && <button onClick={handleCancel} className="text-xs text-red-500 hover:underline">Cancelar</button>}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre de Zona</label>
              <input 
                type="text" 
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Urabá"
                className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
            <button type="submit" className={`w-full py-2 rounded flex justify-center items-center gap-2 font-medium text-white ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <Save size={18} /> : <Plus size={18} />} 
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>

        {/* LISTA DE ZONAS */}
        <div className="md:col-span-2 bg-white rounded-lg shadow-md border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200 font-bold text-slate-700">Zonas Registradas ({zonas.length})</div>
          <div className="overflow-y-auto max-h-[500px]">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-4">ID</th>
                  <th className="p-4">Nombre</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {zonas.map((z) => (
                  <tr key={z.id} className="hover:bg-slate-50">
                    <td className="p-4 text-slate-400 font-mono text-xs">#{z.id}</td>
                    <td className="p-4 font-medium text-slate-700">{z.nombre}</td>
                    <td className="p-4 text-center flex justify-center gap-2">
                      <button onClick={() => handleEdit(z)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-full" title="Editar">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => handleDelete(z.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-full" title="Eliminar">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Zonas;
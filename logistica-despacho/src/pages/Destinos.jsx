import React, { useState, useEffect } from 'react';
import { MapPin, Save, Search, Pencil, Trash2, X } from 'lucide-react';

const Destinos = () => {
  const [destinos, setDestinos] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [form, setForm] = useState({ nombre: '', zona_id: '' });
  const [editingId, setEditingId] = useState(null); // ID en edición
  const [filtro, setFiltro] = useState('');

  const loadData = async () => {
    try {
      const [resDest, resZonas] = await Promise.all([
        fetch('http://localhost:3000/api/destinos'),
        fetch('http://localhost:3000/api/zonas')
      ]);
      setDestinos(await resDest.json());
      setZonas(await resZonas.json());
    } catch (error) { console.error("Error", error); }
  };

  useEffect(() => { loadData(); }, []);

  // GUARDAR O ACTUALIZAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nombre || !form.zona_id) return alert("Complete los campos");

    const url = editingId 
      ? `http://localhost:3000/api/destinos/${editingId}` 
      : 'http://localhost:3000/api/destinos';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      
      if (res.ok) {
        setForm({ nombre: '', zona_id: '' });
        setEditingId(null);
        loadData();
        alert(editingId ? "Ciudad actualizada" : "Ciudad guardada");
      }
    } catch (error) { alert("Error al guardar"); }
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if (!window.confirm("¿Eliminar esta ciudad?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/destinos/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) loadData();
      else alert(data.error);
    } catch (e) { alert("Error de conexión"); }
  };

  // PREPARAR EDICIÓN
  const handleEdit = (d) => {
    setForm({ nombre: d.nombre, zona_id: d.zona_id });
    setEditingId(d.id);
  };

  const handleCancel = () => {
    setForm({ nombre: '', zona_id: '' });
    setEditingId(null);
  };

  const destinosFiltrados = destinos.filter(d => 
    d.nombre.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6 text-slate-800 flex items-center gap-2">
        <MapPin className="text-green-600" /> Gestión de Destinos
      </h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FORMULARIO */}
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 h-fit">
          <h2 className="font-bold text-lg mb-4 text-slate-700 border-b pb-2 flex justify-between">
            {editingId ? 'Editar Ciudad' : 'Registrar Ciudad'}
            {editingId && <button onClick={handleCancel} className="text-red-500 text-xs hover:underline">Cancelar</button>}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zona Regional</label>
              <select 
                className="w-full border p-2 rounded bg-slate-50 outline-none"
                value={form.zona_id}
                onChange={e => setForm({...form, zona_id: e.target.value})}
              >
                <option value="">-- Seleccione Zona --</option>
                {zonas.map(z => <option key={z.id} value={z.id}>{z.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
              <input 
                type="text" 
                className="w-full border p-2 rounded outline-none"
                value={form.nombre}
                onChange={e => setForm({...form, nombre: e.target.value})}
              />
            </div>
            <button type="submit" className={`w-full text-white py-2 rounded flex justify-center items-center gap-2 font-bold ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-green-600 hover:bg-green-700'}`}>
              <Save size={18} /> {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </form>
        </div>

        {/* TABLA */}
        <div className="lg:col-span-2 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
            <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border rounded-lg" value={filtro} onChange={e => setFiltro(e.target.value)} />
          </div>

          <div className="bg-white rounded-lg shadow border border-slate-200 overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-semibold">
                <tr>
                  <th className="p-3">ID</th>
                  <th className="p-3">Ciudad</th>
                  <th className="p-3">Zona</th>
                  <th className="p-3 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {destinosFiltrados.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50">
                    <td className="p-3 text-slate-400 text-xs font-mono">#{d.id}</td>
                    <td className="p-3 font-medium">{d.nombre}</td>
                    <td className="p-3"><span className="bg-blue-100 text-blue-700 text-xs px-2 py-1 rounded-full">{d.zona_nombre}</span></td>
                    <td className="p-3 text-center flex justify-center gap-2">
                      <button onClick={() => handleEdit(d)} className="text-blue-500 hover:bg-blue-100 p-1 rounded"><Pencil size={16}/></button>
                      <button onClick={() => handleDelete(d.id)} className="text-red-500 hover:bg-red-100 p-1 rounded"><Trash2 size={16}/></button>
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

export default Destinos;
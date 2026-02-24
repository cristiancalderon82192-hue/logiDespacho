import React, { useState, useEffect } from 'react';
import { FileStack, Save, Edit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';

const TiposDocumento = () => {
  const [tipos, setTipos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);

  // CARGAR DATOS
  const fetchTipos = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/api/tipos-documento');
      if (res.ok) setTipos(await res.json());
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTipos(); }, []);

  // GUARDAR / ACTUALIZAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) return alert("El nombre es obligatorio");

    const url = editingId 
      ? `http://localhost:3000/api/tipos-documento/${editingId}` 
      : 'http://localhost:3000/api/tipos-documento';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre })
      });
      const data = await res.json();

      if (res.ok) {
        alert(editingId ? "✅ Actualizado correctamente" : "✅ Creado correctamente");
        setNombre('');
        setEditingId(null);
        fetchTipos();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) { alert("Error de conexión"); }
  };

  // EDITAR
  const handleEdit = (tipo) => {
    setNombre(tipo.nombre);
    setEditingId(tipo.id);
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if (!window.confirm("¿Seguro que deseas eliminar este tipo?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/tipos-documento/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        fetchTipos();
      } else {
        // Mensaje específico si está en uso
        alert(`⚠️ No se puede eliminar: ${data.error}`);
      }
    } catch (error) { alert("Error de conexión"); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 p-6">
       {/* HEADER */}
       <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <FileStack className="text-blue-600" size={32} /> Tipos de Documento
        </h1>
        <p className="text-slate-500 mt-2">Gestiona las opciones disponibles para los pedidos (Factura, Remisión, etc.)</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        {/* --- FORMULARIO (Columna Izquierda) --- */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden md:col-span-1">
          <div className={`px-6 py-4 border-b font-bold uppercase tracking-wider text-sm ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
            {editingId ? 'Editar Tipo' : 'Nuevo Tipo'}
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre del Tipo *</label>
              <input 
                type="text" 
                value={nombre} 
                onChange={(e) => setNombre(e.target.value)} 
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium" 
                placeholder="Ej: Nota Crédito"
                required
                autoFocus
              />
            </div>
            
            <button type="submit" className={`w-full py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 shadow-md transition-transform active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
            
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setNombre(''); }} className="w-full py-2 text-slate-500 text-sm hover:text-slate-800 underline">
                Cancelar Edición
              </button>
            )}
          </form>
        </div>

        {/* --- TABLA LISTADO (Columna Derecha) --- */}
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden md:col-span-2">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4 pl-6 font-bold">Nombre</th>
                <th className="p-4 font-bold text-center w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
              {loading ? (
                <tr><td colSpan="2" className="p-6 text-center text-slate-400">Cargando...</td></tr>
              ) : tipos.length === 0 ? (
                <tr><td colSpan="2" className="p-6 text-center text-slate-400">No hay tipos registrados.</td></tr>
              ) : (
                tipos.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4 pl-6 font-bold">{item.nombre}</td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(item)} className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors" title="Editar">
                          <Edit size={18}/>
                        </button>
                        {/* Los tipos básicos iniciales (IDs 1-4) idealmente no deberían borrarse fácilmente, pero el backend lo impide si se usan */}
                        <button onClick={() => handleDelete(item.id)} className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors group" title="Eliminar">
                          {item.id <= 4 ? <AlertTriangle size={18} className="text-orange-400 group-hover:text-red-600"/> : <Trash2 size={18}/>}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-3 bg-slate-50 text-xs text-slate-400 text-center border-t">
            <AlertTriangle size={12} className="inline mr-1"/> Nota: No se pueden eliminar tipos que ya estén en uso en pedidos.
          </div>
        </div>
      </div>
    </div>
  );
};

export default TiposDocumento;
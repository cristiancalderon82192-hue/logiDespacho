import React, { useState, useEffect } from 'react';
import { Building2, Save, Edit, Trash2, RefreshCw, AlertTriangle } from 'lucide-react';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const Bodegas = () => {
  const [bodegas, setBodegas] = useState([]);
  const [formData, setFormData] = useState({ nombre: '' });
  const [editingId, setEditingId] = useState(null);

  // CARGAR DATOS
  const fetchBodegas = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodegas`);
      setBodegas(await res.json());
    } catch (error) { console.error(error); }
  };

  useEffect(() => { fetchBodegas(); }, []);

  // GUARDAR (CREAR / EDITAR) CON AUTO-FORMATO Y VALIDACIÓN ESTRICTA
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim()) return mostrarInfo("El nombre es obligatorio");

    // 👇 1. AUTO-FORMATO INTELIGENTE (La magia del texto) 👇
    let nombreFormateado = formData.nombre.trim();
    
    // A) Separar letras de números con un espacio si no lo tienen (Ej: "bodega1" -> "bodega 1")
    nombreFormateado = nombreFormateado.replace(/([a-zA-Z])(\d)/g, '$1 $2');
    
    // B) Reducir espacios dobles o múltiples a un solo espacio (Ej: "Bodega    1" -> "Bodega 1")
    nombreFormateado = nombreFormateado.replace(/\s+/g, ' ');
    
    // C) Capitalizar la primera letra de cada palabra y el resto minúsculas (Ej: "BODEGA 1" -> "Bodega 1")
    nombreFormateado = nombreFormateado.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
    // 👆 FIN DEL AUTO-FORMATO 👆


    // 👇 2. LÓGICA DE NORMALIZACIÓN PARA EVITAR DUPLICADOS 👇
    // Usamos el texto base (todo minúscula y sin ningún espacio) para comparar matemáticamente
    const normalizedInput = nombreFormateado.toLowerCase().replace(/\s+/g, '');

    const isDuplicate = bodegas.some(b => {
      // Si estamos editando, ignoramos el nombre de la bodega actual
      if (editingId && b.id === editingId) return false;
      
      const normalizedExisting = b.nombre.toLowerCase().replace(/\s+/g, '');
      return normalizedExisting === normalizedInput;
    });

    if (isDuplicate) {
      return mostrarError("❌ ALERTA DE DUPLICADO:\n\nYa existe una bodega con este nombre. El sistema la detectó aunque tenga diferencias en mayúsculas o espacios.");
    }
    // 👆 FIN DE LÓGICA DE DUPLICADOS 👆


    const url = editingId 
      ? `${import.meta.env.VITE_API_URL}/api/bodegas/${editingId}` 
      : `${import.meta.env.VITE_API_URL}/api/bodegas`;
    
    const method = editingId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, nombre: nombreFormateado }) 
      });
      
      if (res.ok) {
        mostrarExito(editingId ? "✅ Bodega Actualizada" : "✅ Bodega Creada");
        setFormData({ nombre: '' });
        setEditingId(null);
        fetchBodegas();
      } else {
        const errorData = await res.json();
        mostrarError(`Error al guardar: ${errorData.error || 'Desconocido'}`);
      }
    } catch (error) { mostrarError("Error de conexión"); }
  };

  // PREPARAR EDICIÓN
  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ nombre: item.nombre });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!(await confirmarAccion("Confirmar", "¿Eliminar esta bodega?"))) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodegas/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) fetchBodegas();
      else mostrarError(data.error || "No se pudo eliminar");
    } catch (error) { mostrarError("Error de conexión"); }
  };

  return (
    // 👇 CONTENEDOR PRINCIPAL CENTRADO Y LIMITADO EN ANCHO 👇
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 w-full">
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 animate-fadeIn">
        
        {/* HEADER */}
        <div className="flex justify-between items-center border-b border-slate-200 pb-4 md:pb-6 bg-white p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 flex items-center gap-3">
              <Building2 className="text-[#47B3A8]" size={32} /> Gestión de Bodegas
            </h1>
            <p className="text-slate-500 mt-1 text-sm md:text-base">Administra los puntos de despacho y almacenamiento del sistema.</p>
          </div>
        </div>

        {/* CONTENEDOR DEL FORMULARIO Y LA TABLA */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* FORMULARIO (COLUMNA IZQUIERDA) */}
          <div className="lg:col-span-1">
            <div className={`rounded-2xl shadow-sm border overflow-hidden sticky top-24 transition-all duration-300 ${editingId ? 'bg-orange-50 border-orange-200 ring-2 ring-orange-100' : 'bg-white border-slate-200'}`}>
              <div className={`px-5 py-4 border-b flex justify-between items-center ${editingId ? 'bg-orange-100' : 'bg-slate-900'}`}>
                <h3 className={`font-bold uppercase tracking-wider text-sm ${editingId ? 'text-orange-800' : 'text-white'}`}>
                  {editingId ? 'Editar Bodega' : 'Nueva Bodega'}
                </h3>
                {editingId && (
                  <button type="button" onClick={() => {setEditingId(null); setFormData({nombre: ''})}} className="text-[10px] font-bold uppercase tracking-wider bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300 transition-colors">
                    Cancelar
                  </button>
                )}
              </div>
              
              <form onSubmit={handleSubmit} className="p-5 space-y-5">
                <div>
                  <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-2">Nombre de la Bodega</label>
                  <input 
                    type="text" 
                    value={formData.nombre} 
                    onChange={(e) => setFormData({nombre: e.target.value})} 
                    className="w-full px-4 py-2.5 md:py-3 border-2 rounded-xl focus:border-[#47B3A8] outline-none bg-white text-sm font-bold text-slate-700 transition-colors placeholder:text-slate-300 placeholder:font-normal" 
                    placeholder="Ej: Bodega 1" 
                    required 
                  />
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg flex gap-2">
                    <AlertTriangle size={14} className="shrink-0 text-blue-500 mt-0.5"/>
                    <p className="text-[10px] text-blue-700 leading-snug font-medium">
                      El sistema auto-formateará el texto y bloqueará los nombres duplicados automáticamente.
                    </p>
                  </div>
                </div>
                <button type="submit" className={`w-full py-3 rounded-xl font-bold text-white flex justify-center items-center gap-2 shadow-md transition-all active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-[#47B3A8] hover:bg-[#3A948C]'}`}>
                  {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
                  {editingId ? 'Actualizar Bodega' : 'Guardar Bodega'}
                </button>
              </form>
            </div>
          </div>

          {/* TABLA (COLUMNA DERECHA) */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden h-full flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                  <Building2 size={18} className="text-slate-400"/> Bodegas Registradas
                </h3>
                <span className="bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                  Total: {bodegas.length}
                </span>
              </div>

              <div className="overflow-x-auto w-full flex-1">
                <table className="w-full text-left min-w-[450px]">
                  <thead className="bg-white border-b border-slate-200 text-slate-400 text-[10px] md:text-xs uppercase tracking-wider">
                    <tr>
                      <th className="p-4 md:p-5 font-bold w-24 text-center">ID</th>
                      <th className="p-4 md:p-5 font-bold">Nombre Establecido</th>
                      <th className="p-4 md:p-5 font-bold text-center w-32">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {bodegas.length === 0 ? (
                      <tr><td colSpan="3" className="p-10 text-center text-slate-400 font-medium">No hay bodegas registradas en el sistema.</td></tr>
                    ) : (
                      bodegas.map((b) => (
                        <tr key={b.id} className="hover:bg-slate-50 transition-colors group">
                          <td className="p-4 md:p-5 text-center">
                            <span className="font-mono text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded text-xs">#{b.id}</span>
                          </td>
                          <td className="p-4 md:p-5 font-extrabold text-slate-800 text-sm md:text-base">
                            {b.nombre}
                          </td>
                          <td className="p-4 md:p-5">
                            <div className="flex justify-center gap-2">
                              <button onClick={() => handleEdit(b)} className="bg-slate-100 text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-lg transition-colors shadow-sm" title="Editar">
                                <Edit size={16}/>
                              </button>
                              <button onClick={() => handleDelete(b.id)} className="bg-slate-100 text-red-600 hover:bg-red-600 hover:text-white p-2 rounded-lg transition-colors shadow-sm" title="Eliminar">
                                <Trash2 size={16}/>
                              </button>
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
    </div>
  );
};

export default Bodegas;
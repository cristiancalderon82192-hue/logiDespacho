import React, { useState, useEffect } from 'react';
import { UsersRound, Save, Edit, Trash2, MapPin, Phone, RefreshCw, CreditCard } from 'lucide-react';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  
  const [formData, setFormData] = useState({ 
    nombre: '', 
    documento: '', 
    telefono: '', 
    direccion_exacta: '' 
  });
  
  const [editingId, setEditingId] = useState(null);

  const fetchClientes = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/clientes');
      const data = await res.json();
      setClientes(data);
    } catch (error) { console.error("Error:", error); }
  };

  useEffect(() => { fetchClientes(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre) return alert("El nombre es obligatorio");
    if (!formData.documento) return alert("La Cédula/NIT es obligatoria");
    
    const url = editingId 
      ? `http://localhost:3000/api/clientes/${editingId}` 
      : 'http://localhost:3000/api/clientes';
    
    const method = editingId ? 'PUT' : 'POST';
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json(); 

      if (res.ok) {
        alert(editingId ? "✅ Cliente Actualizado" : "✅ Cliente Creado");
        setFormData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
        setEditingId(null);
        fetchClientes();
      } else {
        alert(`❌ Error: ${data.error || 'No se pudo guardar'}`);
      }
    } catch (error) { 
      alert("Error de conexión con el servidor"); 
    }
  };

  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({ 
      nombre: c.nombre, 
      documento: c.documento || '', 
      telefono: c.telefono || '', 
      direccion_exacta: c.direccion_exacta || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Estás seguro de eliminar este cliente?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/clientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        fetchClientes();
      } else {
        alert(`❌ Error: ${data.error}`); 
      }
    } catch (e) { alert("Error de conexión"); }
  };

  return (
    <div className="space-y-4 md:space-y-8 w-full max-w-full overflow-x-hidden">
      
      {/* HEADER RESPONSIVO */}
      <div className="border-b border-slate-200 pb-4 md:pb-6">
        <h1 className="text-xl md:text-3xl font-bold text-slate-800 flex items-center gap-2 md:gap-3">
          <UsersRound className="text-blue-600 w-6 h-6 md:w-8 md:h-8" /> Gestión de Clientes
        </h1>
      </div>

      {/* FORMULARIO RESPONSIVO */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
        <div className={`px-4 md:px-8 py-3 md:py-4 border-b font-bold uppercase tracking-wider text-xs md:text-sm flex justify-between items-center ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
          <span>{editingId ? 'Editar Cliente' : 'Nuevo Cliente'}</span>
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null); 
                setFormData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' })
              }} 
              className="text-[10px] md:text-xs underline hover:text-orange-900"
            >
              Cancelar Edición
            </button>
          )}
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6 items-end">
          
          <div>
            <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Nombre Cliente *</label>
            <input 
              type="text" 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              className="w-full px-3 py-2 md:px-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base outline-none" 
              placeholder="Ej: Supermercado Éxito"
              required 
            />
          </div>

          <div>
            <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Cédula / NIT *</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.documento} 
                onChange={(e) => setFormData({...formData, documento: e.target.value})} 
                className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base outline-none" 
                placeholder="123456789"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.telefono} 
                onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base outline-none" 
                placeholder="300 123 4567"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase ml-1">Dirección Exacta</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.direccion_exacta} 
                onChange={(e) => setFormData({...formData, direccion_exacta: e.target.value})} 
                className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white text-sm md:text-base outline-none" 
                placeholder="Calle 10 # 20-30"
              />
            </div>
          </div>

          <div className="md:col-span-2 xl:col-span-4 mt-2">
            <button 
              type="submit" 
              className={`w-full py-2.5 md:py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-md text-sm md:text-base ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
              {editingId ? 'Actualizar Cliente' : 'Guardar Nuevo Cliente'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLA CON SCROLL HORIZONTAL TÁCTIL */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-[10px] md:text-xs uppercase">
              <tr>
                <th className="p-3 md:p-5 font-bold w-1/3">Cliente / Documento</th>
                <th className="p-3 md:p-5 font-bold w-1/4">Teléfono</th>
                <th className="p-3 md:p-5 font-bold w-1/3">Dirección Exacta</th>
                <th className="p-3 md:p-5 font-bold text-center w-[120px]">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs md:text-sm text-slate-700">
              {clientes.length === 0 ? (
                <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay clientes registrados.</td></tr>
              ) : (
                clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    
                    <td className="p-3 md:p-5 align-middle">
                      <div className="font-bold text-slate-800 break-words">{c.nombre}</div>
                      <div className="text-[10px] md:text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                        <CreditCard size={12} className="text-slate-400 shrink-0" /> 
                        {c.documento || 'Sin registrar'}
                      </div>
                    </td>
                    
                    <td className="p-3 md:p-5 align-middle">
                      <div className="flex items-center gap-2 text-slate-600">
                        <Phone size={14} className="text-blue-500 shrink-0 md:w-4 md:h-4"/> 
                        <span>{c.telefono || '---'}</span>
                      </div>
                    </td>
                    
                    <td className="p-3 md:p-5 align-middle">
                      <div className="flex items-center gap-2 text-slate-600">
                        <MapPin size={14} className="text-orange-500 shrink-0 md:w-4 md:h-4"/> 
                        <span className="break-words">{c.direccion_exacta || '---'}</span>
                      </div>
                    </td>
                    
                    <td className="p-3 md:p-5 align-middle text-center">
                      <div className="flex justify-center gap-1.5 md:gap-2">
                        <button 
                          onClick={() => handleEdit(c)} 
                          className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-1.5 md:p-2 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit size={16} className="md:w-[18px] md:h-[18px]"/>
                        </button>
                        <button 
                          onClick={() => handleDelete(c.id)} 
                          className="bg-red-50 hover:bg-red-100 text-red-600 p-1.5 md:p-2 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} className="md:w-[18px] md:h-[18px]"/>
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
  );
};

export default Clientes;
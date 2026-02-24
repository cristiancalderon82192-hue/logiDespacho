import React, { useState, useEffect } from 'react';
import { UsersRound, Save, Edit, Trash2, MapPin, Phone, RefreshCw, CreditCard } from 'lucide-react';

const Clientes = () => {
  const [clientes, setClientes] = useState([]);
  
  // 1. ESTADO DEL FORMULARIO (Agregamos documento)
  const [formData, setFormData] = useState({ 
    nombre: '', 
    documento: '', 
    telefono: '', 
    direccion_exacta: '' 
  });
  
  const [editingId, setEditingId] = useState(null);

  // CARGAR CLIENTES
  const fetchClientes = async () => {
    try {
      const res = await fetch('http://localhost:3000/api/clientes');
      const data = await res.json();
      setClientes(data);
    } catch (error) { console.error("Error:", error); }
  };

  useEffect(() => { fetchClientes(); }, []);

  // GUARDAR O ACTUALIZAR
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validación extra en el frontend
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

      const data = await res.json(); // Leemos la respuesta del backend

      if (res.ok) {
        alert(editingId ? "✅ Cliente Actualizado" : "✅ Cliente Creado");
        setFormData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
        setEditingId(null);
        fetchClientes();
      } else {
        // Mostramos el error exacto (ej: "Este número de documento ya está registrado")
        alert(`❌ Error: ${data.error || 'No se pudo guardar'}`);
      }
    } catch (error) { 
      alert("Error de conexión con el servidor"); 
    }
  };

  // EDITAR (Cargar datos al formulario)
  const handleEdit = (c) => {
    setEditingId(c.id);
    setFormData({ 
      nombre: c.nombre, 
      documento: c.documento || '', // Cargamos el documento
      telefono: c.telefono || '', 
      direccion_exacta: c.direccion_exacta || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!window.confirm("¿Estás seguro de eliminar este cliente?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/clientes/${id}`, { method: 'DELETE' });
      const data = await res.json();
      
      if (res.ok) {
        fetchClientes();
      } else {
        alert(`❌ Error: ${data.error}`); // Muestra si tiene pedidos asociados
      }
    } catch (e) { alert("Error de conexión"); }
  };

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <UsersRound className="text-blue-600" size={32} /> Gestión de Clientes
        </h1>
      </div>

      {/* FORMULARIO */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <div className={`px-8 py-4 border-b font-bold uppercase tracking-wider ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
          {editingId ? 'Editar Cliente' : 'Nuevo Cliente'}
          {editingId && (
            <button 
              onClick={() => {
                setEditingId(null); 
                setFormData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' })
              }} 
              className="ml-4 text-xs underline hover:text-orange-900"
            >
              Cancelar Edición
            </button>
          )}
        </div>
        
        {/* Cambiamos a 2 columnas en tablet y 4 en PC para acomodar el nuevo campo */}
        <form onSubmit={handleSubmit} className="p-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-end">
          
          {/* CAMPO 1: NOMBRE */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre Cliente *</label>
            <input 
              type="text" 
              value={formData.nombre} 
              onChange={(e) => setFormData({...formData, nombre: e.target.value})} 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
              placeholder="Ej: Supermercado Éxito"
              required 
            />
          </div>

          {/* CAMPO NUEVO: DOCUMENTO */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Cédula / NIT *</label>
            <div className="relative">
              <CreditCard className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.documento} 
                onChange={(e) => setFormData({...formData, documento: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
                placeholder="123456789"
                required
              />
            </div>
          </div>

          {/* CAMPO 3: TELÉFONO */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Teléfono</label>
            <div className="relative">
              <Phone className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.telefono} 
                onChange={(e) => setFormData({...formData, telefono: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
                placeholder="300 123 4567"
              />
            </div>
          </div>

          {/* CAMPO 4: DIRECCIÓN EXACTA */}
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Dirección Exacta</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-2.5 text-slate-400" size={16}/>
              <input 
                type="text" 
                value={formData.direccion_exacta} 
                onChange={(e) => setFormData({...formData, direccion_exacta: e.target.value})} 
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 bg-white" 
                placeholder="Calle 10 # 20-30"
              />
            </div>
          </div>

          {/* BOTÓN (Ocupa todo el ancho disponible) */}
          <div className="md:col-span-2 xl:col-span-4 mt-2">
            <button 
              type="submit" 
              className={`w-full py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 transition-transform active:scale-95 shadow-md ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
              {editingId ? <RefreshCw size={20}/> : <Save size={20}/>} 
              {editingId ? 'Actualizar Cliente' : 'Guardar Nuevo Cliente'}
            </button>
          </div>
        </form>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
        <table className="w-full text-left table-fixed">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 text-xs uppercase">
            <tr>
              <th className="p-5 font-bold w-1/3">Cliente / Documento</th>
              <th className="p-5 font-bold w-1/4">Teléfono</th>
              <th className="p-5 font-bold w-1/3">Dirección Exacta</th>
              <th className="p-5 font-bold text-center w-[120px]">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 text-sm text-slate-700">
            {clientes.length === 0 ? (
              <tr><td colSpan="4" className="p-8 text-center text-slate-400">No hay clientes registrados.</td></tr>
            ) : (
              clientes.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  
                  {/* COL 1: NOMBRE Y DOCUMENTO */}
                  <td className="p-5 align-middle">
                    <div className="font-bold text-slate-800 break-words">{c.nombre}</div>
                    {/* Aquí mostramos la cédula pequeñita debajo del nombre */}
                    <div className="text-[11px] font-mono text-slate-500 mt-1 flex items-center gap-1">
                      <CreditCard size={12} className="text-slate-400" /> 
                      {c.documento || 'Sin registrar'}
                    </div>
                  </td>
                  
                  {/* COL 2: TELÉFONO */}
                  <td className="p-5 align-middle">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Phone size={16} className="text-blue-500 shrink-0"/> 
                      <span>{c.telefono || '---'}</span>
                    </div>
                  </td>
                  
                  {/* COL 3: DIRECCIÓN */}
                  <td className="p-5 align-middle">
                    <div className="flex items-center gap-2 text-slate-600">
                      <MapPin size={16} className="text-orange-500 shrink-0"/> 
                      <span className="break-words">{c.direccion_exacta || '---'}</span>
                    </div>
                  </td>
                  
                  {/* COL 4: BOTONES */}
                  <td className="p-5 align-middle text-center">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(c)} 
                        className="bg-blue-50 hover:bg-blue-100 text-blue-600 p-2 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit size={18}/>
                      </button>
                      <button 
                        onClick={() => handleDelete(c.id)} 
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 size={18}/>
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
  );
};

export default Clientes;
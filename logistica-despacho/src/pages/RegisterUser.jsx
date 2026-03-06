import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Lock, Shield, Edit, Trash2, RefreshCw, Package } from 'lucide-react'; 
import { useAuth } from '../context/AuthContext';

const RegisterUser = () => {
  const { user } = useAuth();
  
  const [usuarios, setUsuarios] = useState([]);
  const [bodegas, setBodegas] = useState([]); 
  
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: '3', 
    estado: '1',
    bodega_id: '' 
  });

  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      const [resU, resB] = await Promise.all([
        fetch('${import.meta.env.VITE_API_URL}/api/usuarios'),
        fetch('${import.meta.env.VITE_API_URL}/api/bodegas') 
      ]);
      
      if(resU.ok) setUsuarios(await resU.json());
      if(resB.ok) setBodegas(await resB.json());

    } catch (error) {
      console.error("Error cargando datos:", error);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if(!formData.nombre_completo || !formData.email || !formData.rol_id) {
      return alert("Todos los campos principales son obligatorios");
    }
    if(!editingId && !formData.password) {
      return alert("La contraseña es obligatoria para nuevos usuarios");
    }

    const url = editingId 
      ? `${import.meta.env.VITE_API_URL}/api/usuarios/${editingId}` 
      : '${import.meta.env.VITE_API_URL}/api/usuarios';
    
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        alert(editingId ? "✅ Usuario actualizado" : "✅ Usuario creado");
        setFormData({ nombre_completo: '', email: '', password: '', rol_id: '3', estado: '1', bodega_id: '' });
        setEditingId(null);
        fetchData(); 
      } else {
        alert(data.error || "Error al guardar");
      }
    } catch (error) { alert("Error de conexión"); }
  };

  const handleEdit = (u) => {
    setEditingId(u.id);
    setFormData({
      nombre_completo: u.nombre_completo,
      email: u.email,
      password: '', 
      rol_id: u.rol_id,
      estado: u.estado,
      bodega_id: u.bodega_id || '' 
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar usuario?")) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/usuarios/${id}`, { method: 'DELETE' });
      if(res.ok) fetchData();
      else alert("No se pudo eliminar");
    } catch (error) { alert("Error de conexión"); }
  };

  const getRoleName = (id) => {
    const idNum = Number(id);
    switch(idNum) {
      case 1: return 'Administrador';
      case 2: return 'Líder Sala';
      case 3: return 'Logística';
      case 4: return 'Conductor'; 
      default: return 'Desconocido';
    }
  };

  return (
    <div className="space-y-4 md:space-y-8 w-full max-w-full overflow-x-hidden p-1 md:p-0">
          
      {/* HEADER RESPONSIVO */}
      <div className="border-b border-slate-200 pb-4 md:pb-6">
        <h1 className="text-xl md:text-3xl font-bold text-slate-800 flex items-center gap-2 md:gap-3">
          <User className="text-blue-600 w-6 h-6 md:w-8 md:h-8" /> Gestión de Usuarios
        </h1>
        <p className="text-slate-500 mt-1 text-xs md:text-sm">Administra el acceso y roles del personal.</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 md:gap-8">
        
        {/* --- FORMULARIO RESPONSIVO --- */}
        <div className={`xl:col-span-1 rounded-xl shadow-md border overflow-hidden h-fit ${editingId ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-200'}`}>
          <h2 className={`font-bold text-xs md:text-sm uppercase tracking-wider px-4 md:px-6 py-3 md:py-4 border-b flex justify-between items-center ${editingId ? 'bg-orange-100 text-orange-800' : 'bg-slate-900 text-white'}`}>
            {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            {editingId && <button type="button" onClick={() => {setEditingId(null); setFormData({ nombre_completo: '', email: '', password: '', rol_id: '3', estado: '1', bodega_id: '' })}} className="text-[10px] md:text-xs text-orange-800 underline">Cancelar</button>}
          </h2>
          
          <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4">
            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Nombre Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" placeholder="Ej: Pepito Pérez" required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Correo Electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" placeholder="correo@empresa.com" required />
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
                {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2.5 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white" placeholder="******" />
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Rol de Acceso</label>
              <div className="relative">
                <Shield size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <select name="rol_id" value={formData.rol_id} onChange={handleChange} className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm">
                  <option value="1">Administrador</option>
                  <option value="2">Líder de Sala</option>
                  <option value="3">Logística</option>
                  <option value="4">Conductor</option> 
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Bodega Asignada</label>
              <div className="relative">
                <Package size={16} className="absolute left-3 top-2.5 text-slate-400"/>
                <select name="bodega_id" value={formData.bodega_id} onChange={handleChange} className="w-full pl-9 pr-3 py-2 md:pl-10 md:pr-4 md:py-2.5 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none text-sm">
                  <option value="">-- Sin Bodega --</option>
                  {bodegas.map(b => (
                    <option key={b.id} value={b.id}>{b.nombre}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] md:text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Estado</label>
              <select name="estado" value={formData.estado} onChange={handleChange} className="w-full p-2 md:p-2.5 border rounded-lg bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500">
                <option value="1">Activo</option>
                <option value="0">Inactivo (Bloqueado)</option>
              </select>
            </div>

            <button type="submit" className={`w-full py-2.5 md:py-3 rounded-lg font-bold text-white text-sm flex justify-center items-center gap-2 shadow-md transition-transform active:scale-95 mt-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
              {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
              {editingId ? 'Actualizar' : 'Crear Usuario'}
            </button>
          </form>
        </div>

        {/* --- LISTA DE USUARIOS (SCROLL TÁCTIL) --- */}
        <div className="xl:col-span-3 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase border-b border-slate-100">
                <tr>
                  <th className="p-3 md:p-4 font-bold w-[30%]">Usuario</th>
                  <th className="p-3 md:p-4 font-bold w-[20%]">Rol</th>
                  <th className="p-3 md:p-4 font-bold w-[20%]">Bodega</th>
                  <th className="p-3 md:p-4 font-bold w-[15%] text-center">Estado</th>
                  <th className="p-3 md:p-4 font-bold w-[15%] text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs md:text-sm">
                {usuarios.map(u => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-3 md:p-4 align-middle">
                      <div className="font-bold text-slate-800">{u.nombre_completo}</div>
                      <div className="text-[10px] md:text-xs text-slate-400 mt-0.5">{u.email}</div>
                    </td>
                    <td className="p-3 md:p-4 align-middle">
                      <span className={`px-2 py-1 rounded text-[9px] md:text-[10px] font-bold uppercase border ${
                        u.rol_id === 1 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                        u.rol_id === 2 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                        u.rol_id === 4 ? 'bg-orange-50 text-orange-700 border-orange-200' : 
                        'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {getRoleName(u.rol_id)}
                      </span>
                    </td>
                    <td className="p-3 md:p-4 align-middle">
                      {u.bodega_id ? (
                        <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                          <Package size={14} className="text-blue-500 shrink-0" /> {u.bodega_nombre}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic text-[10px] md:text-xs">No asignada</span>
                      )}
                    </td>
                    <td className="p-3 md:p-4 align-middle text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[9px] md:text-[10px] font-bold ${u.estado === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.estado === 1 ? 'bg-green-600' : 'bg-red-600'}`}></span>
                        {u.estado === 1 ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="p-3 md:p-4 align-middle text-center">
                      <div className="flex justify-center gap-1.5 md:gap-2">
                        <button onClick={() => handleEdit(u)} className="p-1.5 md:p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"><Edit size={16} className="md:w-[18px] md:h-[18px]"/></button>
                        <button onClick={() => handleDelete(u.id)} className="p-1.5 md:p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"><Trash2 size={16} className="md:w-[18px] md:h-[18px]"/></button>
                      </div>
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

export default RegisterUser;
import React, { useState, useEffect } from 'react';
import { Save, User, Mail, Lock, Shield, ArrowLeft, Edit, Trash2, RefreshCw, XCircle, Truck } from 'lucide-react'; // Agregué Truck icon
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar'; // Asegúrate de que la ruta sea correcta
import { useAuth } from '../context/AuthContext';

const RegisterUser = () => {
  const { user } = useAuth();
  // const navigate = useNavigate(); // Si lo necesitas para volver atrás
  
  const [usuarios, setUsuarios] = useState([]);
  
  // ESTADO FORMULARIO
  const [formData, setFormData] = useState({
    nombre_completo: '',
    email: '',
    password: '',
    rol_id: '3', // Valor por defecto (Logística)
    estado: '1'
  });

  const [editingId, setEditingId] = useState(null);

  // CARGAR USUARIOS
  const fetchUsuarios = async () => {
    try {
      const response = await fetch('http://localhost:3000/api/usuarios');
      const data = await response.json();
      setUsuarios(data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  };

  useEffect(() => {
    fetchUsuarios();
  }, []);

  // MANEJAR CAMBIOS EN INPUTS
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ENVIAR FORMULARIO
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones básicas
    if(!formData.nombre_completo || !formData.email || !formData.rol_id) {
      return alert("Todos los campos son obligatorios");
    }
    if(!editingId && !formData.password) {
      return alert("La contraseña es obligatoria para nuevos usuarios");
    }

    const url = editingId 
      ? `http://localhost:3000/api/usuarios/${editingId}` 
      : 'http://localhost:3000/api/usuarios';
    
    const method = editingId ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (res.ok) {
        alert(editingId ? "Usuario actualizado" : "Usuario creado");
        setFormData({ nombre_completo: '', email: '', password: '', rol_id: '3', estado: '1' });
        setEditingId(null);
        fetchUsuarios();
      } else {
        alert(data.error || "Error al guardar");
      }
    } catch (error) {
      console.error(error);
      alert("Error de conexión");
    }
  };

  // PREPARAR EDICIÓN
  const handleEdit = (u) => {
    setEditingId(u.id);
    setFormData({
      nombre_completo: u.nombre_completo,
      email: u.email,
      password: '', // La contraseña no se muestra por seguridad
      rol_id: u.rol_id,
      estado: u.estado
    });
  };

  // ELIMINAR
  const handleDelete = async (id) => {
    if(!window.confirm("¿Eliminar usuario?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/usuarios/${id}`, { method: 'DELETE' });
      if(res.ok) fetchUsuarios();
      else alert("No se pudo eliminar");
    } catch (error) { alert("Error de conexión"); }
  };

  // HELPER PARA NOMBRE DEL ROL
  const getRoleName = (id) => {
    // Aseguramos comparar números con números o strings con strings
    const idNum = Number(id);
    switch(idNum) {
      case 1: return 'Administrador';
      case 2: return 'Líder Sala';
      case 3: return 'Logística';
      case 4: return 'Conductor'; // <--- IMPORTANTE
      default: return 'Desconocido';
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
       {/* Si usas Sidebar externo en App.jsx, elimina esta línea. Si es interno, déjala */}
       <Sidebar userRole={user?.role || 'admin'} /> 

       <div className="ml-64 w-full p-8 transition-all duration-300"> {/* Margen para el sidebar */}
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="border-b border-slate-200 pb-6">
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
              <User className="text-blue-600" size={32} /> Gestión de Usuarios
            </h1>
            <p className="text-slate-500 mt-1">Administra el acceso y roles del personal.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* --- FORMULARIO --- */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200 h-fit">
              <h2 className="font-bold text-lg mb-4 text-slate-700 border-b pb-2 flex justify-between items-center">
                {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
                {editingId && <button onClick={() => {setEditingId(null); setFormData({ nombre_completo: '', email: '', password: '', rol_id: '3', estado: '1' })}} className="text-xs text-red-500 underline">Cancelar</button>}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="text" name="nombre_completo" value={formData.nombre_completo} onChange={handleChange} className="w-full pl-10 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Ej: Pepito Pérez" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full pl-10 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="correo@empresa.com" required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-3 text-slate-400"/>
                    <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full pl-10 p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="******" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Rol de Acceso</label>
                  <div className="relative">
                    <Shield size={16} className="absolute left-3 top-3 text-slate-400"/>
                    
                    {/* --- AQUÍ ESTABA EL PROBLEMA --- */}
                    <select 
                      name="rol_id" 
                      value={formData.rol_id} 
                      onChange={handleChange} 
                      className="w-full pl-10 p-2 border rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none appearance-none"
                    >
                      <option value="1">Administrador (Control Total)</option>
                      <option value="2">Líder de Sala (Gestión Operativa)</option>
                      <option value="3">Logística (Auxiliar)</option>
                      <option value="4">Conductor (Repartos)</option> {/* ID 4 PARA CONDUCTOR */}
                    </select>
                    {/* ------------------------------- */}

                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleChange} className="w-full p-2 border rounded bg-white">
                    <option value="1">Activo</option>
                    <option value="0">Inactivo (Bloqueado)</option>
                  </select>
                </div>

                <button type="submit" className={`w-full py-2 rounded font-bold text-white flex justify-center items-center gap-2 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                  {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} 
                  {editingId ? 'Actualizar' : 'Crear Usuario'}
                </button>
              </form>
            </div>

            {/* --- LISTA DE USUARIOS --- */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase border-b">
                  <tr>
                    <th className="p-4">Usuario</th>
                    <th className="p-4">Rol</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="p-4">
                        <div className="font-bold text-slate-800">{u.nombre_completo}</div>
                        <div className="text-xs text-slate-400">{u.email}</div>
                      </td>
                      <td className="p-4">
                        {/* Renderizado condicional de badges según el rol */}
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase border ${
                          u.rol_id === 1 ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          u.rol_id === 2 ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          u.rol_id === 4 ? 'bg-orange-50 text-orange-700 border-orange-200' : // Conductor
                          'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {getRoleName(u.rol_id)}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${u.estado === 1 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.estado === 1 ? 'bg-green-600' : 'bg-red-600'}`}></span>
                          {u.estado === 1 ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button onClick={() => handleEdit(u)} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded"><Edit size={16}/></button>
                          <button onClick={() => handleDelete(u.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
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
    </div>
  );
};

export default RegisterUser;
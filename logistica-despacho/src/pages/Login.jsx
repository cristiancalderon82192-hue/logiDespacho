import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import logoCliente from '../assets/rodeo.png'; 

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        
        // 1. EXTRAER EL ROL (Soporta si el backend lo manda suelto o dentro de un objeto 'user')
        const objUsuario = data.user || data.usuario || data;
        const rolOriginal = String(objUsuario.role || objUsuario.rol || objUsuario.id_rol || '');

        // 🚨 ALERTA VISUAL PARA TI (Te dirá exactamente qué llega de la BD)
        alert(`🔍 DEBUG: Tu Base de Datos dice que este usuario es: [ ${rolOriginal} ]`);

        // 2. LIMPIAR EL TEXTO (Quitar tildes, mayúsculas y espacios extra)
        // Ejemplo: "Logística" se convierte en "logistica"
        const rolLimpio = rolOriginal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

        // 3. ASIGNAR EL ROL CORRECTAMENTE
        let rolNormalizado = 'lider_sala'; // Por defecto
        
        if (rolLimpio.includes('admin') || rolLimpio === '1') {
          rolNormalizado = 'admin';
        } 
        // 👇 AQUÍ ESTÁ LA MAGIA: Atrapa "logistica", "logistico", "lider logistica", etc.
        else if (rolLimpio.includes('logistic') || rolLimpio === '3') {
          rolNormalizado = 'logistica'; 
        } 
        else if (rolLimpio.includes('conductor') || rolLimpio === '4') {
          rolNormalizado = 'conductor';
        }

        // 4. GUARDAR DATOS EN EL NAVEGADOR
        const usuarioCorregido = { ...data, role: rolNormalizado };
        
        // Por si tu AuthContext usa el objeto anidado:
        if (usuarioCorregido.user) usuarioCorregido.user.role = rolNormalizado;
        if (usuarioCorregido.usuario) usuarioCorregido.usuario.role = rolNormalizado;

        login(usuarioCorregido); 
        
        // 5. REDIRIGIR AL DASHBOARD CORRECTO
        if (rolNormalizado === 'admin') navigate('/admin-home'); 
        else if (rolNormalizado === 'logistica') navigate('/dashboard-logistica'); 
        else if (rolNormalizado === 'conductor') navigate('/mis-rutas'); 
        else navigate('/dashboard-lider'); 
        
      } else {
        alert("Error: " + data.error);
      }

    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#47B3A8]">
      <div className="flex-1 flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            
            <div className="bg-slate-50 pt-10 pb-6 px-8 flex flex-col items-center border-b border-slate-100">
              <img src={logoCliente} alt="Logo Empresa" className="h-24 w-auto object-contain mb-4 drop-shadow-md hover:scale-105 transition-transform duration-300" />
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bienvenido</h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">A LogiDespacho</p>
              <p className="text-slate-500 text-sm mt-1 font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div className="space-y-5">
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Correo Electrónico</label>
                  <div className="relative group">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#47B3A8] transition-all bg-slate-50" placeholder="usuario@correo.com" required disabled={loading} />
                    <Mail size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">Contraseña</label>
                  <div className="relative group">
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-[#47B3A8] transition-all bg-slate-50" placeholder="••••••••" required disabled={loading} />
                    <Lock size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                  </div>
                </div>
              </div>

              <button type="submit" disabled={loading} className={`w-full text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 ${loading ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-black shadow-slate-900/20 active:translate-y-0'}`}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> VALIDANDO...</> : <>INICIAR SESIÓN <ArrowRight size={18} /></>}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="py-6 flex flex-col items-center justify-center border-t border-slate-900/10">
        <p className="text-slate-800 text-xs font-bold mb-3 opacity-70">© {new Date().getFullYear()} Todos los derechos reservados.</p>
        <div className="flex items-center gap-2 text-slate-800 opacity-90 cursor-default">
          <span className="text-xs font-medium">Desarrollado y licenciado por</span>
          <div className="flex items-center gap-1 font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[#47B3A8]">It</span>Soluciones
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
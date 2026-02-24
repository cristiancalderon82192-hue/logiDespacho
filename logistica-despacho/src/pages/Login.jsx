import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, ArrowRight, Loader2 } from 'lucide-react';
import logoCliente from '../assets/rodeo.png'; // TU LOGO REAL

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- LÓGICA DE CONEXIÓN CON TU BACKEND ---
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
        // Guardamos los datos en el contexto
        login(data);
        
        // Redirigimos según el rol
        if (data.role === 'admin') {
          navigate('/admin-home'); 
        } else {
          navigate('/pedidos-lider'); 
        }
      } else {
        alert("Error: " + data.error);
      }

    } catch (error) {
      console.error("Error de conexión:", error);
      alert("No se pudo conectar con el servidor. Verifica que el backend esté corriendo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    // 👇 CAMBIO AQUÍ: Fondo turquesa exacto de tu sidebar
    <div className="min-h-screen flex flex-col bg-[#47B3A8]">
      
      {/* ================= CONTENEDOR PRINCIPAL ================= */}
      <div className="flex-1 flex items-center justify-center p-4 animate-fadeIn">
        <div className="w-full max-w-md">
          
          {/* ================= TARJETA DE LOGIN ================= */}
          <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100">
            
            {/* CABECERA DE LA TARJETA (Logo Cliente) */}
            <div className="bg-slate-50 pt-10 pb-6 px-8 flex flex-col items-center border-b border-slate-100">
              <img 
                src={logoCliente} 
                alt="Logo Empresa Aliada" 
                className="h-24 w-auto object-contain mb-4 drop-shadow-md hover:scale-105 transition-transform duration-300" 
              />
              <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bienvenido</h2>
              <p className="text-slate-500 text-sm mt-1 font-medium">A LogiDespacho</p>
              <p className="text-slate-500 text-sm mt-1 font-medium">Ingresa tus credenciales para continuar</p>
            </div>

            {/* FORMULARIO */}
            <form onSubmit={handleLogin} className="p-8 space-y-6">
              <div className="space-y-5">
                
                {/* Input Correo */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Correo Electrónico
                  </label>
                  <div className="relative group">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-700 font-medium disabled:opacity-50"
                      placeholder="admin@logidespacho.com"
                      required 
                      disabled={loading}
                    />
                    <Mail size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>

                {/* Input Contraseña */}
                <div>
                  <label className="block text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-2">
                    Contraseña
                  </label>
                  <div className="relative group">
                    <input 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50 focus:bg-white text-slate-700 font-medium disabled:opacity-50"
                      placeholder="••••••••"
                      required 
                      disabled={loading}
                    />
                    <Lock size={18} className="absolute left-4 top-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>

              {/* Botón Ingresar */}
              <button 
                type="submit" 
                disabled={loading}
                className={`w-full text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 ${
                  loading 
                    ? 'bg-blue-400 cursor-not-allowed shadow-none' 
                    : 'bg-slate-900 hover:bg-black shadow-slate-900/20 hover:-translate-y-0.5 active:translate-y-0' // <-- Botón oscuro para contrastar mejor con el turquesa
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> VALIDANDO...
                  </>
                ) : (
                  <>
                    INICIAR SESIÓN <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      </div>

      {/* ================= FOOTER - IT SOLUCIONES ================= */}
      {/* 👇 CAMBIO AQUÍ: Textos oscuros para que se vean bien sobre el fondo claro */}
      <div className="py-6 flex flex-col items-center justify-center border-t border-slate-900/10">
        <p className="text-slate-800 text-xs font-bold mb-3 opacity-70">
          © {new Date().getFullYear()} Todos los derechos reservados.
        </p>
        
        <div className="flex items-center gap-2 text-slate-800 opacity-90 hover:opacity-100 transition-opacity cursor-default">
          <span className="text-xs font-medium">Desarrollado y licenciado por</span>
          
          {/* Logo ItSoluciones */}
          <div className="flex items-center gap-1 font-bold text-white bg-slate-900 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-[#47B3A8]">It</span>Soluciones
          </div>
          
        </div>
      </div>

    </div>
  );
};

export default Login;
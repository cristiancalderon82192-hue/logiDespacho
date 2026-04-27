import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { 
  Mail, Lock, ArrowRight, Loader2, Truck, Box, BarChart3, 
  User, Building, Phone, ArrowLeft, Send, CheckCircle2, Package
} from 'lucide-react';
import logoCliente from '../assets/logo_it_verde.png'; 

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  
  // Estados para Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para el Cambio de Vista y Formulario de Contacto
  const [vistaActual, setVistaActual] = useState('login'); 
  const [loadingContacto, setLoadingContacto] = useState(false);
  const [contactoEnviado, setContactoEnviado] = useState(false);
  const [datosContacto, setDatosContacto] = useState({
    nombre: '', correo: '', telefono: '', empresa: ''
  });

  // --- FUNCIÓN DE LOGIN ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        const objUsuario = data.user || data.usuario || data;
        
        if (String(objUsuario.estado) === '0' || objUsuario.estado === false) {
          alert("❌ ACCESO DENEGADO: Tu cuenta de usuario se encuentra INACTIVA. Por favor, comunícate con el administrador del sistema.");
          setLoading(false);
          return; 
        }

        const rolOriginal = String(objUsuario.role || objUsuario.rol || objUsuario.id_rol || '');
        const rolLimpio = rolOriginal.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
        let rolNormalizado = 'lider_sala'; 
        
        if (rolLimpio.includes('admin') || rolLimpio === '1') rolNormalizado = 'admin';
        else if (rolLimpio.includes('logistic') || rolLimpio === '3') rolNormalizado = 'logistica'; 
        else if (rolLimpio.includes('conductor') || rolLimpio === '4') rolNormalizado = 'conductor';

        const usuarioCorregido = { ...data, role: rolNormalizado };
        if (usuarioCorregido.user) usuarioCorregido.user.role = rolNormalizado;
        if (usuarioCorregido.usuario) usuarioCorregido.usuario.role = rolNormalizado;

        login(usuarioCorregido); 
        
        if (rolNormalizado === 'admin') navigate('/admin-home'); 
        else if (rolNormalizado === 'logistica') navigate('/dashboard-logistica'); 
        else if (rolNormalizado === 'conductor') navigate('/conductor-home'); 
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

  // --- FUNCIÓN DE CONTACTO (SIMULADA) ---
  const handleContacto = async (e) => {
    e.preventDefault();
    setLoadingContacto(true);
    
    setTimeout(() => {
      setLoadingContacto(false);
      setContactoEnviado(true);
      
      setTimeout(() => {
        setContactoEnviado(false);
        setDatosContacto({ nombre: '', correo: '', telefono: '', empresa: '' });
        setVistaActual('login');
      }, 3000);
    }, 1500);
  };

  return (
    <div className="min-h-screen flex w-full bg-slate-50 font-sans overflow-hidden">
      
      {/* ================= SECCIÓN IZQUIERDA (HERO) ================= */}
      <div className="hidden lg:flex w-[55%] relative bg-gradient-to-br from-[#3b9c92] via-[#47B3A8] to-[#1f6b64] items-center justify-center overflow-hidden">
        
        {/* ANIMACIÓN LOGÍSTICA DE FONDO */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <Package className="absolute text-white/[0.07] w-24 h-24 animate-[float_18s_linear_infinite] left-[10%] bottom-[-100px]" style={{ animationDelay: '0s' }} />
          <Package className="absolute text-white/[0.05] w-40 h-40 animate-[float_25s_linear_infinite] left-[40%] bottom-[-150px]" style={{ animationDelay: '7s' }} />
          <Package className="absolute text-white/[0.08] w-16 h-16 animate-[float_15s_linear_infinite] left-[70%] bottom-[-80px]" style={{ animationDelay: '3s' }} />
          <Package className="absolute text-white/[0.06] w-32 h-32 animate-[float_22s_linear_infinite] left-[85%] bottom-[-120px]" style={{ animationDelay: '12s' }} />

          <Truck className="absolute text-white/[0.04] w-64 h-64 animate-[drive_35s_linear_infinite] top-[60%] left-[-300px]" style={{ animationDelay: '2s' }} />
          <Truck className="absolute text-white/[0.03] w-48 h-48 animate-[drive_28s_linear_infinite] top-[15%] left-[-250px]" style={{ animationDelay: '15s' }} />
        </div>

        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-white/10 rounded-full blur-3xl animate-pulse z-0"></div>
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px] z-0"></div>

        <div className="relative z-10 w-full max-w-2xl px-12 text-white flex flex-col justify-center h-full">
          <div className="animate-fade-in-up" style={{ animationDuration: '0.8s' }}>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-md border border-white/30 text-sm font-semibold mb-8 shadow-sm">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-green-400"></span>
              </span>
              Plataforma 100% Cloud
            </div>
            
            <h1 className="text-5xl lg:text-6xl font-extrabold leading-tight mb-6 tracking-tight">
              Gestiona tu logística con <span className="text-[#a2ffec] drop-shadow-lg">inteligencia.</span>
            </h1>
            
            <p className="text-lg lg:text-xl text-teal-50 font-medium opacity-90 mb-10 max-w-xl leading-relaxed">
              La plataforma integral para el control de flota, agendamiento de pedidos y auditoría en tiempo real de itSoluciones.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-5 rounded-2xl hover:-translate-y-2 transition-transform duration-300 cursor-default">
                <Truck className="text-[#a2ffec] mb-3" size={28} />
                <h3 className="font-bold text-lg mb-1">Rutas Optimizadas</h3>
                <p className="text-sm text-teal-100/80">Asignación inteligente y monitoreo de ocupación.</p>
              </div>
              <div className="bg-white/10 backdrop-blur-lg border border-white/20 p-5 rounded-2xl hover:-translate-y-2 transition-transform duration-300 cursor-default delay-100">
                <BarChart3 className="text-[#a2ffec] mb-3" size={28} />
                <h3 className="font-bold text-lg mb-1">Auditoría OTIF</h3>
                <p className="text-sm text-teal-100/80">Reportes financieros y de pedidos perfectos al instante.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ================= SECCIÓN DERECHA (FORMULARIOS) ================= */}
      <div className="w-full lg:w-[45%] flex flex-col items-center justify-center p-6 sm:p-12 relative bg-white">
        <div className="lg:hidden absolute top-0 left-0 w-full h-64 bg-gradient-to-b from-[#47B3A8]/20 to-transparent"></div>

        <div className="w-full max-w-md relative z-10 flex flex-col min-h-[500px] justify-center">
          
          <div className="flex flex-col items-center text-center mb-8">
            {/* 👇 AQUÍ SE AUMENTÓ EL TAMAÑO DEL LOGO (h-28 y p-6) 👇 */}
            <div className="p-6 bg-white rounded-3xl shadow-xl shadow-teal-900/5 mb-6 border border-slate-100 hover:scale-105 transition-transform duration-300">
              <img src={logoCliente} alt="Logo Empresa" className="h-28 w-auto object-contain px-2" />
            </div>
            
            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {vistaActual === 'login' ? 'Bienvenido de nuevo' : 'Solicita una Demo'}
            </h2>
            <p className="text-slate-500 mt-2 font-medium">
              {vistaActual === 'login' ? 'Ingresa a tu panel de control' : 'Déjanos tus datos y te contactaremos pronto'}
            </p>
          </div>

          <div className="relative w-full">
            {/* ------------- FORMULARIO DE LOGIN ------------- */}
            {vistaActual === 'login' && (
              <div className="animate-slide-in-right w-full">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-5">
                    <div className="group">
                      <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-[#47B3A8] transition-colors">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <input 
                          type="email" 
                          value={email} 
                          onChange={(e) => setEmail(e.target.value)} 
                          className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] focus:bg-white bg-slate-50 text-slate-800 font-medium transition-all shadow-sm focus:shadow-md" 
                          placeholder="usuario@correo.com" 
                          required 
                          disabled={loading} 
                        />
                        <Mail size={20} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>
                    </div>

                    <div className="group">
                      <label className="block text-[12px] font-bold text-slate-500 uppercase tracking-wider mb-2 group-focus-within:text-[#47B3A8] transition-colors">
                        Contraseña
                      </label>
                      <div className="relative">
                        <input 
                          type="password" 
                          value={password} 
                          onChange={(e) => setPassword(e.target.value)} 
                          className="w-full pl-12 pr-4 py-3.5 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] focus:bg-white bg-slate-50 text-slate-800 font-medium transition-all shadow-sm focus:shadow-md tracking-widest" 
                          placeholder="••••••••" 
                          required 
                          disabled={loading} 
                        />
                        <Lock size={20} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={loading} 
                    className={`w-full text-white font-bold py-4 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-3 overflow-hidden relative group ${
                      loading ? 'bg-slate-400 cursor-not-allowed shadow-none' : 'bg-slate-900 hover:bg-[#47B3A8] hover:shadow-[#47B3A8]/30 hover:-translate-y-1'
                    }`}
                  >
                    <div className="absolute inset-0 -translate-x-full group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                    {loading ? <><Loader2 size={20} className="animate-spin" /> VERIFICANDO...</> : <><span className="relative z-10">INGRESAR AL SISTEMA</span> <ArrowRight size={20} className="relative z-10 group-hover:translate-x-1 transition-transform" /></>}
                  </button>
                </form>

                <div className="mt-8 text-center">
                  <p className="text-sm text-slate-500">
                    ¿Aún no tienes una cuenta?{' '}
                    <button 
                      onClick={() => setVistaActual('contacto')}
                      className="font-bold text-[#47B3A8] hover:text-[#3b9c92] hover:underline transition-colors focus:outline-none"
                    >
                      Contáctanos
                    </button>
                  </p>
                </div>
              </div>
            )}

            {/* ------------- FORMULARIO DE CONTACTO ------------- */}
            {vistaActual === 'contacto' && (
              <div className="animate-slide-in-left w-full">
                
                {contactoEnviado ? (
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center flex flex-col items-center justify-center animate-fade-in-up">
                    <CheckCircle2 className="text-green-500 mb-4" size={50} />
                    <h3 className="text-xl font-bold text-green-800 mb-2">¡Solicitud Enviada!</h3>
                    <p className="text-green-600 text-sm">Nuestro equipo comercial se pondrá en contacto contigo a la brevedad.</p>
                  </div>
                ) : (
                  <form onSubmit={handleContacto} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                      <div className="relative group">
                        <input type="text" value={datosContacto.nombre} onChange={(e) => setDatosContacto({...datosContacto, nombre: e.target.value})} className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] bg-slate-50 text-slate-800 text-sm transition-all shadow-sm focus:bg-white" placeholder="Nombre completo" required disabled={loadingContacto} />
                        <User size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>

                      <div className="relative group">
                        <input type="text" value={datosContacto.empresa} onChange={(e) => setDatosContacto({...datosContacto, empresa: e.target.value})} className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] bg-slate-50 text-slate-800 text-sm transition-all shadow-sm focus:bg-white" placeholder="Nombre de tu empresa" required disabled={loadingContacto} />
                        <Building size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>

                      <div className="relative group">
                        <input type="email" value={datosContacto.correo} onChange={(e) => setDatosContacto({...datosContacto, correo: e.target.value})} className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] bg-slate-50 text-slate-800 text-sm transition-all shadow-sm focus:bg-white" placeholder="Correo corporativo" required disabled={loadingContacto} />
                        <Mail size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>

                      <div className="relative group">
                        <input type="tel" value={datosContacto.telefono} onChange={(e) => setDatosContacto({...datosContacto, telefono: e.target.value})} className="w-full pl-11 pr-4 py-3 border-2 border-slate-100 rounded-xl outline-none focus:border-[#47B3A8] bg-slate-50 text-slate-800 text-sm transition-all shadow-sm focus:bg-white" placeholder="Teléfono de contacto" required disabled={loadingContacto} />
                        <Phone size={18} className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-[#47B3A8] transition-colors" />
                      </div>
                    </div>

                    <button 
                      type="submit" 
                      disabled={loadingContacto} 
                      className={`w-full text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-all flex justify-center items-center gap-2 mt-2 ${
                        loadingContacto ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#47B3A8] hover:bg-[#3b9c92] hover:-translate-y-1 hover:shadow-[#47B3A8]/40'
                      }`}
                    >
                      {loadingContacto ? <><Loader2 size={18} className="animate-spin" /> ENVIANDO...</> : <><Send size={18} /> ENVIAR SOLICITUD</>}
                    </button>
                  </form>
                )}

                {!contactoEnviado && (
                  <div className="mt-6 text-center">
                    <button 
                      onClick={() => setVistaActual('login')}
                      type="button"
                      className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors focus:outline-none"
                    >
                      <ArrowLeft size={16} /> Volver al inicio de sesión
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-12 pt-6 flex flex-col items-center justify-center border-t border-slate-100">
            <p className="text-slate-400 text-xs font-semibold mb-3">© {new Date().getFullYear()} Todos los derechos reservados.</p>
            <div className="flex items-center gap-2 text-slate-500 cursor-default">
              <span className="text-xs font-medium">Tecnología desarrollada por</span>
              <div className="flex items-center gap-1 font-extrabold text-slate-800 bg-slate-100 px-3 py-1.5 rounded-lg shadow-sm">
                <span className="text-[#47B3A8]">It</span>Soluciones
              </div>
            </div>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes fade-in-up {
          0% { opacity: 0; transform: translateY(20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up { animation: fade-in-up ease-out forwards; }
        
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
        
        @keyframes slide-in-right {
          0% { opacity: 0; transform: translateX(30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-right { animation: slide-in-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes slide-in-left {
          0% { opacity: 0; transform: translateX(-30px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        .animate-slide-in-left { animation: slide-in-left 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }

        @keyframes float {
          0% { transform: translateY(0) rotate(0deg); }
          100% { transform: translateY(-120vh) rotate(360deg); }
        }
        @keyframes drive {
          0% { transform: translateX(0); }
          100% { transform: translateX(65vw); }
        }
      `}</style>
    </div>
  );
};

export default Login;
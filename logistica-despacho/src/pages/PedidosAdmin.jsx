import React, { useState, useEffect } from 'react';
import { 
  Save, Truck, FileText, Calendar, User, Weight, MapPin, Search, 
  ChevronDown, ChevronUp, PlusCircle, DollarSign, BarChart as BarIcon, 
  Phone, X, CheckCircle, Edit, Trash2, RefreshCw 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
// import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PedidosAdmin = () => {
  const { user } = useAuth();

  // --- ESTADOS DE UI ---
  const [showForm, setShowForm] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  // --- CATALOGOS ---
  const [listaClientes, setListaClientes] = useState([]);
  const [listaZonas, setListaZonas] = useState([]);
  const [listaDestinos, setListaDestinos] = useState([]);
  const [listaTiposDoc, setListaTiposDoc] = useState([]); // <--- NUEVO ESTADO PARA TIPOS DE DOC

  // --- FORMULARIO ---
  const initialFormState = {
    id_factura: '', numero_documento: '', tipo_documento: 'Factura', prioridad: 'Media',
    valor_factura: '', fecha_facturacion: new Date().toISOString().split('T')[0], 
    fecha_promesa: '', fecha_agendada: '', hora_registro: '', nota_manual: '',
    nombre_cliente: '', telefono: '', zona_envio: '', destino: '', destino_id: '', 
    peso_b1: 0, peso_b2: 0, peso_b3: 0, peso_b4: 0, peso_b5: 0, peso_b6: 0, peso_b7: 0, peso_b8: 0,
  };
  const [formData, setFormData] = useState(initialFormState);

  // --- FILTROS TABLA ---
  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  const [pedidos, setPedidos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);
  const [datosGrafica, setDatosGrafica] = useState([]);

  // --- CARGA INICIAL (ACTUALIZADA) ---
  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        // Se agrega la petición a /api/tipos-documento
        const [resC, resZ, resD, resT] = await Promise.all([
          fetch('http://localhost:3000/api/clientes'),
          fetch('http://localhost:3000/api/zonas'),
          fetch('http://localhost:3000/api/destinos'),
          fetch('http://localhost:3000/api/tipos-documento') // <--- NUEVA LLAMADA
        ]);
        setListaClientes(await resC.json());
        setListaZonas(await resZ.json());
        setListaDestinos(await resD.json());
        
        // Guardamos los tipos de documento y actualizamos el valor por defecto del formulario
        const tipos = await resT.json();
        setListaTiposDoc(tipos);
        if (tipos.length > 0) {
          setFormData(prev => ({ ...prev, tipo_documento: tipos[0].nombre }));
        }

      } catch (error) { console.error("Error catalogos:", error); }
    };
    fetchCatalogos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/pedidos-rango?inicio=${fechaInicio}&fin=${fechaFin}`);
      setPedidos(await response.json());

      const resDash = await fetch(`http://localhost:3000/api/dashboard?inicio=${fechaInicio}&fin=${fechaFin}`);
      const dataDash = await resDash.json();
      if (dataDash.bodegas) {
        setDatosGrafica(Object.keys(dataDash.bodegas).map(key => ({
            name: key.toUpperCase(), peso: Number(dataDash.bodegas[key])
        })));
      }
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPedidos(); }, [fechaInicio, fechaFin]);

  // --- HANDLERS FORMULARIO ---
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectCliente = (cliente) => {
    setFormData(prev => ({
      ...prev, nombre_cliente: cliente.nombre, telefono: cliente.telefono || prev.telefono
    }));
    setShowClientModal(false); setClientSearchTerm('');
  };

  const handleDestinoChange = (e) => {
    const id = e.target.value;
    const destinoObj = listaDestinos.find(d => d.id.toString() === id);
    if (destinoObj) {
      setFormData(prev => ({
        ...prev, destino: destinoObj.nombre, destino_id: destinoObj.id, zona_envio: destinoObj.zona_nombre || '' 
      }));
    } else {
      setFormData(prev => ({ ...prev, destino_id: '', destino: '', zona_envio: '' }));
    }
  };

  // --- GUARDAR (CREAR O EDITAR) ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const url = editingId 
      ? `http://localhost:3000/api/pedidos/${editingId}` 
      : 'http://localhost:3000/api/pedidos';
    const method = editingId ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, usuario_id: user.id })
      });

      if (response.ok) {
        alert(editingId ? "✅ Pedido Actualizado" : "✅ Pedido Guardado");
        resetForm();
        fetchPedidos();
      } else {
        const errorData = await response.json();
        alert(`❌ Error: ${errorData.error}`);
      }
    } catch (error) { console.error(error); }
  };

  // --- EDICIÓN Y ELIMINACIÓN ---
  const handleEdit = async (pedidoId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`);
      if (!res.ok) throw new Error("No se pudo cargar el pedido");
      
      const data = await res.json();
      const formatearFecha = (fecha) => fecha ? new Date(fecha).toISOString().split('T')[0] : '';
      
      setFormData({
        ...initialFormState,
        ...data,
        fecha_facturacion: formatearFecha(data.fecha_facturacion),
        fecha_promesa: formatearFecha(data.fecha_promesa),
        fecha_agendada: formatearFecha(data.fecha_agendada),
        telefono: data.telefono || '', 
        destino_id: data.destino_id || '' 
      });

      setEditingId(pedidoId);
      setShowForm(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' });

    } catch (error) {
      alert("Error al cargar datos para editar");
      console.error(error);
    }
  };

  const handleDelete = async (pedidoId) => {
    if (!window.confirm("¿Estás seguro de ELIMINAR este pedido? Esta acción no se puede deshacer.")) return;

    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`, { method: 'DELETE' });
      if (res.ok) {
        alert("🗑️ Pedido eliminado");
        fetchPedidos();
      } else {
        alert("Error al eliminar");
      }
    } catch (error) { console.error(error); }
  };

  const resetForm = () => {
    setFormData({
      ...initialFormState,
      tipo_documento: listaTiposDoc.length > 0 ? listaTiposDoc[0].nombre : 'Factura'
    });
    setEditingId(null);
    setShowForm(false);
  };

  const clientesFiltrados = listaClientes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.telefono && c.telefono.includes(clientSearchTerm))
  );

  return (
    <div className="bg-slate-50 min-h-screen p-8 relative">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* ================= FORMULARIO (ACORDEÓN) ================= */}
        <div className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all duration-300 ${editingId ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
          <div onClick={() => setShowForm(!showForm)} className={`px-6 py-4 flex justify-between items-center cursor-pointer transition-colors group ${editingId ? 'bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${showForm ? (editingId ? 'bg-white text-orange-600' : 'bg-blue-600 text-white') : 'bg-slate-800 text-slate-400'}`}>
                {editingId ? <Edit size={20}/> : (showForm ? <Truck size={20} /> : <PlusCircle size={20} />)}
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {editingId ? `Editando Pedido #${editingId}` : 'Registrar Nuevo Despacho'}
                </h2>
                {!showForm && <p className="text-xs text-slate-400">Haz clic para desplegar</p>}
              </div>
            </div>
            <div className="text-white">{showForm ? <ChevronUp size={24} /> : <ChevronDown size={24} />}</div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8 border-t border-slate-100 animate-fadeIn">
              
              {/* GRUPO A: DOCUMENTACIÓN */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><FileText size={18} className="text-blue-600"/> Datos del Documento</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Id_Factura</label><input type="text" name="id_factura" value={formData.id_factura} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-blue-500 outline-none" required /></div>
                  
                  {/* 👇 CAMBIO AQUÍ: Select dinámico leyendo de listaTiposDoc */}
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Tipo Doc</label>
                    <select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} className="w-full border p-2 rounded bg-white">
                      {listaTiposDoc.length === 0 ? (
                        <option>Cargando...</option>
                      ) : (
                        listaTiposDoc.map(t => (
                          <option key={t.id} value={t.nombre}>{t.nombre}</option>
                        ))
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Prioridad</label>
                    <select name="prioridad" value={formData.prioridad} onChange={handleChange} className="w-full border p-2 rounded bg-white">
                      <option>Alta</option><option>Media</option><option>Baja</option>
                    </select>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><DollarSign size={12}/> Valor</label><input type="number" name="valor_factura" value={formData.valor_factura} onChange={handleChange} className="w-full border p-2 rounded focus:ring-2 focus:ring-green-500 outline-none font-semibold text-slate-700"/></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Fecha Fac.</label><input type="date" name="fecha_facturacion" value={formData.fecha_facturacion} onChange={handleChange} className="w-full border p-2 rounded" /></div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Hora Registro</label><input type="time" name="hora_registro" value={formData.hora_registro} onChange={handleChange} className="w-full border p-2 rounded" /></div>
                  
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Fecha Promesa</label>
                    <input type="date" name="fecha_promesa" value={formData.fecha_promesa} onChange={handleChange} className="w-full border p-2 rounded" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-blue-600 uppercase">Fecha De Despacho</label>
                    <input type="date" name="fecha_agendada" value={formData.fecha_agendada} onChange={handleChange} className="w-full border p-2 rounded border-blue-200 focus:ring-blue-500 bg-blue-50" title="Fecha en la que Logística agenda la salida" />
                  </div>

                </div>
              </div>

              {/* GRUPO B: CLIENTE Y UBICACIÓN */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><User size={18} className="text-blue-600"/> Cliente & Destino</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Cliente</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input type="text" name="nombre_cliente" value={formData.nombre_cliente} onChange={handleChange} className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Buscar..." required />
                        <User size={16} className="absolute left-2.5 top-3 text-slate-400"/>
                      </div>
                      <button type="button" onClick={() => setShowClientModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded shadow-sm"><Search size={20} /></button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                    <div className="relative">
                      <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-blue-500 outline-none"/>
                      <Phone size={14} className="absolute left-2.5 top-3 text-slate-400"/>
                    </div>
                  </div>
                  <div><label className="text-xs font-bold text-slate-500 uppercase">Zona</label><input type="text" name="zona_envio" value={formData.zona_envio} readOnly className="w-full border p-2 rounded bg-slate-100 text-slate-500" /></div>
                  <div className="col-span-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Destino</label>
                    <div className="relative">
                      <select name="destino_id" value={formData.destino_id} onChange={handleDestinoChange} className="w-full border p-2 pl-8 rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none" required>
                        <option value="">-- Seleccione --</option>
                        {listaDestinos.map(d => (<option key={d.id} value={d.id}>{d.nombre} {d.zona_nombre ? `(${d.zona_nombre})` : ''}</option>))}
                      </select>
                      <MapPin size={16} className="absolute left-2.5 top-3 text-slate-400"/>
                    </div>
                  </div>
                  <div className="col-span-2"><label className="text-xs font-bold text-slate-500 uppercase">Nota Manual</label><input type="text" name="nota_manual" value={formData.nota_manual} onChange={handleChange} className="w-full border p-2 rounded" /></div>
                </div>
              </div>

              {/* GRUPO C: PESOS */}
              <div className="lg:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Weight size={18} /> Carga (Kg)</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <div key={num}><label className="block text-[10px] font-bold text-slate-400 uppercase text-center">B{num}</label><input type="number" name={`peso_b${num}`} value={formData[`peso_b${num}`]} onChange={handleChange} className="w-full text-center p-1 border rounded focus:border-blue-500 font-bold text-slate-700"/></div>
                  ))}
                </div>
                <div className="mt-4 flex justify-end gap-3">
                  <button type="button" onClick={resetForm} className="text-slate-500 hover:text-slate-700 px-4 py-2 font-bold text-sm">CANCELAR</button>
                  <button type="submit" className={`text-white px-8 py-2 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-transform active:scale-95 ${editingId ? 'bg-orange-500 hover:bg-orange-600' : 'bg-blue-600 hover:bg-blue-700'}`}>
                    {editingId ? <RefreshCw size={18}/> : <Save size={18}/>} {editingId ? 'ACTUALIZAR' : 'GUARDAR'}
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ================= TABLA DE PEDIDOS ================= */}
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-end gap-4 pb-2 border-b border-slate-300">
             <div>
              <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-slate-600" /> Historial</h2>
              <p className="text-xs text-slate-500 mt-1">Del <span className="font-bold">{fechaInicio}</span> al <span className="font-bold">{fechaFin}</span></p>
            </div>
            <div className="flex gap-2 items-center bg-white p-2 rounded-lg shadow-sm border">
              <Calendar size={16} className="text-slate-400"/>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-sm border-none outline-none text-slate-600 font-medium"/>
              <span className="text-slate-300">/</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-sm border-none outline-none text-slate-600 font-medium"/>
              <button onClick={fetchPedidos} className="bg-slate-100 hover:bg-slate-200 p-1 rounded"><Search size={16} className="text-slate-600"/></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-100">
                  <tr>
                    <th className="p-4 font-bold">Doc</th>
                    <th className="p-4 font-bold">Fecha</th>
                    <th className="p-4 font-bold">Cliente</th>
                    <th className="p-4 font-bold">Destino</th>
                    <th className="p-4 font-bold text-center">Peso</th>
                    <th className="p-4 font-bold text-center">Estado</th>
                    <th className="p-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-sm">
                  {loading ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : pedidos.length === 0 ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay datos.</td></tr>
                  ) : (
                    pedidos.map((p) => (
                      <tr key={p.id} className="hover:bg-blue-50 transition-colors">
                        <td className="p-4 font-mono font-bold text-blue-600">{p.id_factura}<div className="text-[10px] text-slate-400 font-sans">{p.tipo_documento}</div></td>
                        <td className="p-4 text-slate-600">{p.fecha_facturacion}</td>
                        <td className="p-4 font-medium text-slate-700">{p.nombre_cliente}<div className="text-[10px] text-slate-400">{p.zona_envio}</div></td>
                        <td className="p-4 text-slate-600 flex items-center gap-1"><MapPin size={14} className="text-slate-400"/> {p.destino}</td>
                        <td className="p-4 text-center font-bold">{Number(p.total_peso).toLocaleString()} kg</td>
                        <td className="p-4 text-center"><span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${p.prioridad === 'Alta' ? 'bg-red-100 text-red-700' : p.prioridad === 'Media' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>{p.prioridad}</span></td>
                        
                        {/* BOTONES DE ACCIÓN */}
                        <td className="p-4 text-center">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => handleEdit(p.id)} className="p-1.5 text-blue-500 hover:bg-blue-100 rounded transition-colors" title="Editar">
                              <Edit size={16} />
                            </button>
                            <button onClick={() => handleDelete(p.id)} className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors" title="Eliminar">
                              <Trash2 size={16} />
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

      {/* MODAL CLIENTES */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
              <h3 className="font-bold flex items-center gap-2"><Search size={20}/> Buscar Cliente</h3>
              <button onClick={() => setShowClientModal(false)} className="hover:bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-4 flex-1 overflow-hidden flex flex-col">
              <input type="text" placeholder="Buscar..." className="w-full border p-3 rounded-lg bg-slate-50 outline-none" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} autoFocus />
              <div className="flex-1 overflow-y-auto border rounded-lg">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 text-xs text-slate-500 uppercase sticky top-0"><tr><th className="p-3">Nombre</th><th className="p-3">Teléfono</th><th className="p-3 text-right">Acción</th></tr></thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {clientesFiltrados.map(c => (
                      <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                        <td className="p-3 font-medium text-slate-700">{c.nombre}</td>
                        <td className="p-3 text-slate-500">{c.telefono || '---'}</td>
                        <td className="p-3 text-right"><button onClick={() => handleSelectCliente(c)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-xs font-bold flex items-center gap-1 ml-auto">Seleccionar <CheckCircle size={12}/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t text-right"><button onClick={() => setShowClientModal(false)} className="px-4 py-2 text-slate-600 font-bold text-sm">Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosAdmin;
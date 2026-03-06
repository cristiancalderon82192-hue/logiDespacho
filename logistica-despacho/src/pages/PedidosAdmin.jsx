import React, { useState, useEffect } from 'react';
import { 
  Save, Truck, FileText, Calendar, User, Weight, MapPin, Search, 
  ChevronDown, ChevronUp, PlusCircle, DollarSign, Phone, X, CheckCircle, 
  Edit, Trash2, RefreshCw, AlertTriangle, Lock, Eye, XCircle, UserPlus, CreditCard 
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const PedidosAdmin = () => {
  const { user } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null); 

  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [newClientData, setNewClientData] = useState({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
  const [savingClient, setSavingClient] = useState(false);

  const [listaClientes, setListaClientes] = useState([]);
  const [listaZonas, setListaZonas] = useState([]);
  const [listaDestinos, setListaDestinos] = useState([]);
  const [listaTiposDoc, setListaTiposDoc] = useState([]);

  const initialFormState = {
    id_factura: '', tipo_documento: 'Factura', prioridad: 'Media',
    valor_factura: '', fecha_facturacion: new Date().toISOString().split('T')[0], 
    fecha_promesa: '', fecha_agendada: '', hora_registro: '', nota_manual: '',
    nombre_cliente: '', telefono: '', zona_envio: '', destino: '', destino_id: '', 
    estado_entrega: 'Pendiente', 
    peso_b1: 0, peso_b2: 0, peso_b3: 0, peso_b4: 0, peso_b5: 0, peso_b6: 0, peso_b7: 0, peso_b8: 0,
  };
  const [formData, setFormData] = useState(initialFormState);

  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  const [pedidos, setPedidos] = useState([]);
  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);

  const isReadOnly = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(formData.estado_entrega);

  useEffect(() => {
    const fetchCatalogos = async () => {
      try {
        const [resC, resZ, resD, resT] = await Promise.all([
          fetch('http://localhost:3000/api/clientes'),
          fetch('http://localhost:3000/api/zonas'),
          fetch('http://localhost:3000/api/destinos'),
          fetch('http://localhost:3000/api/tipos-documento') 
        ]);
        setListaClientes(await resC.json());
        setListaZonas(await resZ.json());
        setListaDestinos(await resD.json());
        const tipos = await resT.json();
        setListaTiposDoc(tipos);
        if (tipos.length > 0) setFormData(prev => ({ ...prev, tipo_documento: tipos[0].nombre }));
      } catch (error) { console.error(error); }
    };
    fetchCatalogos();
  }, []);

  const fetchPedidos = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3000/api/pedidos-rango?inicio=${fechaInicio}&fin=${fechaFin}`);
      setPedidos(await response.json());
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchPedidos(); }, [fechaInicio, fechaFin]);

  const handleChange = (e) => {
    if (isReadOnly) return; 
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectCliente = (cliente) => {
    if (isReadOnly) return;
    setFormData(prev => ({ ...prev, nombre_cliente: cliente.nombre, telefono: cliente.telefono || prev.telefono }));
    setShowClientModal(false); setClientSearchTerm(''); setIsCreatingClient(false);
  };

  const handleDestinoChange = (e) => {
    if (isReadOnly) return;
    const id = e.target.value;
    const destinoObj = listaDestinos.find(d => d.id.toString() === id);
    if (destinoObj) {
      setFormData(prev => ({ ...prev, destino: destinoObj.nombre, destino_id: destinoObj.id, zona_envio: destinoObj.zona_nombre || '' }));
    } else {
      setFormData(prev => ({ ...prev, destino_id: '', destino: '', zona_envio: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly) return;
    const url = editingId ? `http://localhost:3000/api/pedidos/${editingId}` : 'http://localhost:3000/api/pedidos';
    const method = editingId ? 'PUT' : 'POST';
    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, usuario_id: user.id })
      });
      if (response.ok) {
        alert(editingId ? "✅ Pedido Actualizado" : "✅ Pedido Guardado");
        resetForm(); fetchPedidos();
      } else {
        const errorData = await response.json(); alert(`❌ Error: ${errorData.error}`);
      }
    } catch (error) { console.error(error); }
  };

  const handleCreateClient = async (e) => {
    e.preventDefault();
    if (!newClientData.nombre || !newClientData.documento) return alert("Nombre y Cédula obligatorios");
    setSavingClient(true);
    try {
      const response = await fetch('http://localhost:3000/api/clientes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newClientData)
      });
      if (response.ok) {
        alert("✅ Cliente creado");
        const resC = await fetch('http://localhost:3000/api/clientes');
        setListaClientes(await resC.json());
        setFormData(prev => ({ ...prev, nombre_cliente: newClientData.nombre, telefono: newClientData.telefono }));
        setNewClientData({ nombre: '', documento: '', telefono: '', direccion_exacta: '' });
        setIsCreatingClient(false); setShowClientModal(false);
      } else {
        const resData = await response.json(); alert(`❌ Error: ${resData.error}`);
      }
    } catch (error) { alert("Error"); } finally { setSavingClient(false); }
  };

  const handleEdit = async (pedidoId) => {
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`);
      if (!res.ok) throw new Error("No se pudo cargar el pedido");
      const data = await res.json();
      const formatearFecha = (fecha) => fecha ? new Date(fecha).toISOString().split('T')[0] : '';
      setFormData({
        ...initialFormState, ...data,
        fecha_facturacion: formatearFecha(data.fecha_facturacion),
        fecha_promesa: formatearFecha(data.fecha_promesa),
        fecha_agendada: formatearFecha(data.fecha_agendada),
        telefono: data.telefono || '', destino_id: data.destino_id || '' 
      });
      setEditingId(pedidoId); setShowForm(true); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) { alert("Error al cargar datos"); }
  };

  const handleDelete = async (pedidoId) => {
    if (!window.confirm("¿ELIMINAR este pedido?")) return;
    try {
      const res = await fetch(`http://localhost:3000/api/pedidos/${pedidoId}`, { method: 'DELETE' });
      if (res.ok) { alert("🗑️ Eliminado"); fetchPedidos(); } 
    } catch (error) { console.error(error); }
  };

  const resetForm = () => {
    setFormData({ ...initialFormState, tipo_documento: listaTiposDoc.length > 0 ? listaTiposDoc[0].nombre : 'Factura' });
    setEditingId(null); setShowForm(false);
  };

  const clientesFiltrados = listaClientes.filter(c => 
    c.nombre.toLowerCase().includes(clientSearchTerm.toLowerCase()) || (c.telefono && c.telefono.includes(clientSearchTerm)) || (c.documento && c.documento.includes(clientSearchTerm))
  );

  return (
    <div className="bg-slate-50 min-h-screen p-3 md:p-8 w-full max-w-full overflow-x-hidden">
      <div className="max-w-7xl mx-auto space-y-6 md:space-y-8">
        
        {/* ================= FORMULARIO (ACORDEÓN) ================= */}
        <div className={`bg-white rounded-xl shadow-md overflow-hidden border transition-all duration-300 ${isReadOnly ? 'border-slate-300' : editingId ? 'border-orange-400 ring-2 ring-orange-100' : 'border-slate-200'}`}>
          
          <div onClick={() => setShowForm(!showForm)} className={`px-4 md:px-6 py-3 md:py-4 flex justify-between items-center cursor-pointer transition-colors group ${isReadOnly ? 'bg-slate-800' : editingId ? 'bg-orange-600' : 'bg-slate-900 hover:bg-slate-800'}`}>
            <div className="flex items-center gap-3">
              <div className={`p-1.5 md:p-2 rounded-full ${showForm ? (isReadOnly ? 'bg-white text-slate-800' : editingId ? 'bg-white text-orange-600' : 'bg-blue-600 text-white') : 'bg-slate-800 text-slate-400'}`}>
                {isReadOnly ? <Eye size={18} /> : editingId ? <Edit size={18}/> : (showForm ? <Truck size={18} /> : <PlusCircle size={18} />)}
              </div>
              <div>
                <h2 className="text-sm md:text-lg font-bold text-white">
                  {isReadOnly ? `Viendo Pedido #${editingId}` : editingId ? `Editando Pedido #${editingId}` : 'Registrar Nuevo Despacho'}
                </h2>
                {!showForm && <p className="text-[10px] md:text-xs text-slate-400">Haz clic para desplegar</p>}
              </div>
            </div>
            <div className="text-white">{showForm ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="p-4 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 border-t border-slate-100 animate-fadeIn">
              
              {isReadOnly && (
                <div className="col-span-1 lg:col-span-2 bg-slate-100 border border-slate-300 p-3 md:p-4 rounded-xl flex items-center gap-3">
                  <Lock className="text-slate-500 shrink-0" size={20} />
                  <div>
                    <p className="font-bold text-slate-700 text-sm">Formulario Bloqueado</p>
                    <p className="text-[10px] md:text-sm text-slate-600">Este pedido está en estado <b>{formData.estado_entrega}</b>.</p>
                  </div>
                </div>
              )}

              {/* GRUPO A: DOCUMENTACIÓN */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><FileText size={16} className={isReadOnly ? "text-slate-400" : "text-blue-600"}/> Datos del Documento</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  {/* Reemplacé todos los p-2.5 md:p-2 por py-2.5 md:py-2 px-3 para que no borre el espacio en PC */}
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Id_Factura</label><input type="text" name="id_factura" value={formData.id_factura} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 bg-white" required /></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Tipo Doc</label><select name="tipo_documento" value={formData.tipo_documento} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-white disabled:bg-slate-100">{listaTiposDoc.map(t => (<option key={t.id} value={t.nombre}>{t.nombre}</option>))}</select></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Prioridad</label><select name="prioridad" value={formData.prioridad} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-white disabled:bg-slate-100"><option>Alta</option><option>Media</option><option>Baja</option></select></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase flex items-center gap-1"><DollarSign size={10}/> Valor</label><input type="number" name="valor_factura" value={formData.valor_factura} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded focus:ring-2 focus:ring-green-500 outline-none font-semibold text-slate-700 disabled:bg-slate-100 bg-white"/></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Fecha Fac.</label><input type="date" name="fecha_facturacion" value={formData.fecha_facturacion} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Hora Registro</label><input type="time" name="hora_registro" value={formData.hora_registro} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Fecha Promesa</label><input type="date" name="fecha_promesa" value={formData.fecha_promesa} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white" /></div>
                  <div><label className="text-[10px] md:text-xs font-bold text-blue-600 uppercase">Fecha Agendada</label><input type="date" name="fecha_agendada" value={formData.fecha_agendada} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded border-blue-200 bg-blue-50 focus:ring-blue-500 disabled:bg-slate-100" /></div>
                </div>
              </div>

              {/* GRUPO B: CLIENTE Y UBICACIÓN */}
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 border-b pb-2 flex items-center gap-2"><User size={16} className={isReadOnly ? "text-slate-400" : "text-blue-600"}/> Cliente & Destino</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Cliente</label>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="relative flex-1">
                        {/* AQUÍ ESTÁ EL ARREGLO DEL PADDING IZQUIERDO: pl-8 protegido */}
                        <input type="text" name="nombre_cliente" value={formData.nombre_cliente} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 bg-white" placeholder="Buscar o crear..." required />
                        <User size={14} className="absolute left-2.5 top-3 md:top-2.5 text-slate-400"/>
                      </div>
                      {!isReadOnly && <button type="button" onClick={() => setShowClientModal(true)} className="bg-blue-600 text-white py-2.5 px-4 md:py-2 rounded w-full sm:w-auto flex justify-center gap-2 font-bold text-sm shadow-sm"><Search size={16} /> Buscar</button>}
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                    <div className="relative">
                      {/* ARREGLO PADDING IZQUIERDO */}
                      <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 bg-white"/>
                      <Phone size={14} className="absolute left-2.5 top-3 md:top-2.5 text-slate-400"/>
                    </div>
                  </div>
                  <div><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Zona</label><input type="text" name="zona_envio" value={formData.zona_envio} readOnly className="w-full border py-2.5 md:py-2 px-3 text-sm rounded bg-slate-100 text-slate-500" /></div>
                  <div className="sm:col-span-2">
                    <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Destino</label>
                    <div className="relative">
                      {/* ARREGLO PADDING IZQUIERDO */}
                      <select name="destino_id" value={formData.destino_id} onChange={handleDestinoChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 pr-3 pl-8 text-sm rounded bg-white focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100" required><option value="">-- Seleccione --</option>{listaDestinos.map(d => (<option key={d.id} value={d.id}>{d.nombre} {d.zona_nombre ? `(${d.zona_nombre})` : ''}</option>))}</select>
                      <MapPin size={14} className="absolute left-2.5 top-3 md:top-2.5 text-slate-400"/>
                    </div>
                  </div>
                  <div className="sm:col-span-2"><label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Nota Manual</label><input type="text" name="nota_manual" value={formData.nota_manual} onChange={handleChange} disabled={isReadOnly} className="w-full border py-2.5 md:py-2 px-3 text-sm rounded disabled:bg-slate-100 bg-white focus:ring-2 focus:ring-blue-500 outline-none" /></div>
                </div>
              </div>

              {/* GRUPO C: PESOS */}
              <div className="lg:col-span-2 bg-slate-50 p-3 md:p-4 rounded-lg border border-slate-200">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-3 flex items-center gap-2"><Weight size={16} className={isReadOnly ? "text-slate-400" : ""} /> Carga (Kg)</h3>
                <div className="grid grid-cols-4 md:grid-cols-8 gap-2 md:gap-3">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                    <div key={num}><label className="block text-[9px] md:text-[10px] font-bold text-slate-400 uppercase text-center">B{num}</label><input type="number" name={`peso_b${num}`} value={formData[`peso_b${num}`]} onChange={handleChange} disabled={isReadOnly} className="w-full text-center py-2 md:py-1 px-1 border rounded font-bold text-sm text-slate-700 disabled:bg-slate-100 bg-white focus:ring-2 focus:ring-blue-500 outline-none"/></div>
                  ))}
                </div>
                <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2 md:gap-3">
                  <button type="button" onClick={resetForm} className="w-full sm:w-auto text-slate-500 hover:bg-slate-200 bg-slate-100 sm:bg-transparent px-4 py-2.5 md:py-2 rounded font-bold text-sm border sm:border-none">{isReadOnly ? 'CERRAR VISTA' : 'CANCELAR'}</button>
                  {!isReadOnly && <button type="submit" className={`w-full sm:w-auto text-white px-6 py-2.5 md:py-2 rounded-lg font-bold flex justify-center items-center gap-2 shadow-lg transition-transform active:scale-95 ${editingId ? 'bg-orange-500' : 'bg-blue-600'}`}>{editingId ? <RefreshCw size={16}/> : <Save size={16}/>} {editingId ? 'ACTUALIZAR' : 'GUARDAR'}</button>}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ================= TABLA DE PEDIDOS ================= */}
        <div className="space-y-4 md:space-y-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-3 pb-2 border-b border-slate-300">
             <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 flex items-center gap-2"><FileText className="text-slate-600" /> Historial</h2>
            </div>
            <div className="flex w-full md:w-auto items-center gap-2 bg-white p-1.5 md:p-2 rounded-lg shadow-sm border">
              <Calendar size={14} className="text-slate-400 ml-1"/>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="text-xs md:text-sm w-full sm:w-auto border-none outline-none text-slate-600 font-medium bg-transparent"/>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} className="text-xs md:text-sm w-full sm:w-auto border-none outline-none text-slate-600 font-medium bg-transparent"/>
              <button onClick={fetchPedidos} className="bg-slate-100 hover:bg-slate-200 p-1.5 rounded ml-1 transition-colors"><Search size={16} className="text-slate-600"/></button>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden w-full">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left min-w-[900px]">
                <thead className="bg-slate-900 text-[10px] md:text-xs uppercase text-white border-b border-slate-100">
                  <tr>
                    <th className="p-3 md:p-4 font-bold">Doc</th>
                    <th className="p-3 md:p-4 font-bold">Fecha Despacho</th>
                    <th className="p-3 md:p-4 font-bold">Cliente</th>
                    <th className="p-3 md:p-4 font-bold">Destino</th>
                    <th className="p-3 md:p-4 font-bold text-center">Peso</th>
                    <th className="p-3 md:p-4 font-bold text-center">Estado (Logística)</th>
                    <th className="p-3 md:p-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                  {loading ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">Cargando...</td></tr>
                  ) : pedidos.length === 0 ? (
                    <tr><td colSpan="7" className="p-8 text-center text-slate-400">No hay datos en esta fecha.</td></tr>
                  ) : (
                    pedidos.map((p) => {
                      const estaBloqueado = ['En Ruta', 'Entregado', 'Entregado Incompleto', 'Devolución'].includes(p.estado_entrega);

                      return (
                        <tr key={p.id} className={`transition-colors ${estaBloqueado ? 'bg-slate-50' : 'bg-white hover:bg-blue-50'}`}>
                          <td className="p-3 md:p-4 align-middle">
                            <p className="font-mono font-bold text-blue-600 text-sm md:text-lg">{p.id_factura}</p>
                            <p className="text-[9px] md:text-[10px] text-slate-400 font-sans mt-0.5">{p.tipo_documento}</p>
                            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] md:text-[9px] font-bold uppercase border ${p.prioridad === 'Alta' ? 'bg-red-50 text-red-600 border-red-200' : p.prioridad === 'Media' ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>P. {p.prioridad}</span>
                          </td>
                          <td className="p-3 md:p-4 align-middle text-slate-600 font-medium">{p.fecha_agendada}</td>
                          <td className="p-3 md:p-4 align-middle">
                            <p className="font-bold text-slate-700 leading-tight">{p.nombre_cliente}</p>
                            <p className="text-[10px] md:text-[11px] text-slate-500 mt-0.5">Zona: {p.zona_envio}</p>
                          </td>
                          <td className="p-3 md:p-4 align-middle text-slate-800 font-medium flex items-center gap-1 md:gap-1.5 pt-4 md:pt-6"><MapPin size={14} className="text-slate-400 shrink-0"/> {p.destino}</td>
                          <td className="p-3 md:p-4 align-middle text-center font-extrabold text-slate-800">{Number(p.total_peso).toLocaleString()} kg</td>
                          
                          <td className="p-3 md:p-4 align-middle text-center">
                            <div className="flex flex-col items-center gap-1 w-full">
                              {p.estado_entrega === 'Pendiente' && <span className="bg-slate-100 text-slate-600 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-slate-200">Pendiente</span>}
                              {p.estado_entrega === 'Asignado' && <span className="bg-blue-50 text-blue-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-blue-200">Asignado</span>}
                              {p.estado_entrega === 'En Ruta' && <span className="bg-blue-100 text-blue-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-blue-300 flex items-center gap-1"><Truck size={10} className="md:w-3 md:h-3"/> En Ruta</span>}
                              {p.estado_entrega === 'Entregado' && <span className="bg-green-100 text-green-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-green-300 flex items-center gap-1"><CheckCircle size={10} className="md:w-3 md:h-3"/> Entregado</span>}
                              {p.estado_entrega === 'Entregado Incompleto' && <span className="bg-orange-100 text-orange-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-orange-300 flex items-center gap-1"><AlertTriangle size={10} className="md:w-3 md:h-3"/> Incompleto</span>}
                              {p.estado_entrega === 'Devolución' && <span className="bg-red-100 text-red-700 px-2 py-1 md:px-3 md:py-1 rounded-full text-[9px] md:text-xs font-bold border border-red-300 flex items-center gap-1"><X size={10} className="md:w-3 md:h-3"/> Devolución</span>}
                              {p.observaciones_entrega && <span className={`text-[8px] md:text-[9px] px-1.5 py-0.5 rounded w-full truncate block mt-1 ${p.estado_entrega === 'Devolución' ? 'text-red-700 bg-red-50 border border-red-100' : 'text-orange-700 bg-orange-50 border border-orange-100'}`} title={p.observaciones_entrega}>Nota: {p.observaciones_entrega}</span>}
                            </div>
                          </td>
                          
                          <td className="p-3 md:p-4 align-middle text-center">
                            <div className="flex justify-center gap-1.5 md:gap-2">
                              {estaBloqueado ? (
                                <button onClick={() => handleEdit(p.id)} className="flex items-center gap-1 px-2 py-1.5 md:px-3 md:py-1.5 bg-slate-200 text-slate-600 hover:bg-slate-300 rounded-lg text-[10px] md:text-xs font-bold transition-colors">
                                  <Eye size={12} className="md:w-[14px] md:h-[14px]" /> Ver
                                </button>
                              ) : (
                                <>
                                  <button onClick={() => handleEdit(p.id)} className="p-1.5 md:p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-lg transition-colors"><Edit size={14} className="md:w-[16px] md:h-[16px]" /></button>
                                  <button onClick={() => handleDelete(p.id)} className="p-1.5 md:p-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition-colors"><Trash2 size={14} className="md:w-[16px] md:h-[16px]" /></button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAL DE CLIENTES AVANZADO ================= */}
      {showClientModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex justify-center items-center p-3 md:p-4 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="bg-slate-900 p-3 md:p-4 flex justify-between items-center text-white shrink-0">
              <h3 className="font-bold flex items-center gap-2 text-sm md:text-base">
                {isCreatingClient ? <UserPlus size={18}/> : <Search size={18}/>} 
                {isCreatingClient ? 'Registrar Nuevo Cliente' : 'Buscar Cliente'}
              </h3>
              <button onClick={() => { setShowClientModal(false); setIsCreatingClient(false); }} className="hover:bg-white/20 p-1.5 rounded-full"><X size={18}/></button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col">
              {isCreatingClient ? (
                <form onSubmit={handleCreateClient} className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar bg-slate-50">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Nombre Completo *</label>
                      <input type="text" value={newClientData.nombre} onChange={(e) => setNewClientData({...newClientData, nombre: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" required placeholder="Ej: Empresa S.A.S"/>
                    </div>
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Cédula / NIT *</label>
                      <input type="text" value={newClientData.documento} onChange={(e) => setNewClientData({...newClientData, documento: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" required placeholder="Ej: 123456789"/>
                    </div>
                    <div>
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Teléfono</label>
                      <input type="text" value={newClientData.telefono} onChange={(e) => setNewClientData({...newClientData, telefono: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" placeholder="Ej: 3001234567"/>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] md:text-xs font-bold text-slate-500 uppercase">Dirección Exacta</label>
                      <input type="text" value={newClientData.direccion_exacta} onChange={(e) => setNewClientData({...newClientData, direccion_exacta: e.target.value})} className="w-full border p-2.5 rounded text-sm bg-white outline-none focus:border-blue-500" placeholder="Ej: Calle 123..."/>
                    </div>
                  </div>
                  
                  <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-200">
                    <button type="button" onClick={() => setIsCreatingClient(false)} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200 rounded text-sm">Volver a Búsqueda</button>
                    <button type="submit" disabled={savingClient} className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded font-bold shadow flex items-center gap-2 text-sm">{savingClient ? 'Guardando...' : 'Guardar y Seleccionar'} <CheckCircle size={16}/></button>
                  </div>
                </form>
              ) : (
                <div className="p-3 md:p-4 space-y-3 flex-1 overflow-hidden flex flex-col bg-slate-50">
                  <input type="text" placeholder="Buscar por nombre, cédula o teléfono..." className="w-full border p-2.5 md:p-3 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-100 text-sm" value={clientSearchTerm} onChange={(e) => setClientSearchTerm(e.target.value)} autoFocus />
                  
                  <div className="flex-1 overflow-y-auto border rounded-lg bg-white custom-scrollbar">
                    <table className="w-full text-left">
                      <thead className="bg-slate-100 text-[10px] md:text-xs text-slate-500 uppercase sticky top-0 shadow-sm">
                        <tr><th className="p-2 md:p-3">Nombre / Cédula</th><th className="p-2 md:p-3 hidden sm:table-cell">Teléfono</th><th className="p-2 md:p-3 text-right">Acción</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs md:text-sm">
                        {clientesFiltrados.length === 0 ? (
                          <tr><td colSpan="3" className="p-8 text-center text-slate-400">No se encontraron clientes.</td></tr>
                        ) : (
                          clientesFiltrados.map(c => (
                            <tr key={c.id} className="hover:bg-blue-50 transition-colors">
                              <td className="p-2 md:p-3">
                                <span className="font-medium text-slate-700 block line-clamp-1" title={c.nombre}>{c.nombre}</span>
                                <span className="text-[9px] md:text-[10px] text-slate-400 flex items-center gap-1 mt-0.5"><CreditCard size={10} className="text-slate-300" />{c.documento || 'Sin registrar'}</span>
                              </td>
                              <td className="p-2 md:p-3 text-slate-500 hidden sm:table-cell">{c.telefono || '---'}</td>
                              <td className="p-2 md:p-3 text-right">
                                <button onClick={() => handleSelectCliente(c)} className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 md:px-3 md:py-1.5 rounded text-[10px] md:text-xs font-bold flex items-center justify-center gap-1 ml-auto w-full sm:w-auto">
                                  Select <CheckCircle size={10}/>
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {!isCreatingClient && (
              <div className="p-3 md:p-4 bg-slate-100 border-t flex flex-col sm:flex-row justify-between items-center gap-3 shrink-0">
                <button onClick={() => setIsCreatingClient(true)} className="text-blue-600 font-bold text-xs md:text-sm flex items-center justify-center gap-1 hover:text-blue-800 bg-blue-50 px-3 py-2 rounded w-full sm:w-auto">
                  <UserPlus size={16}/> Crear Cliente
                </button>
                <button onClick={() => setShowClientModal(false)} className="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs md:text-sm hover:bg-slate-300 rounded w-full sm:w-auto">
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PedidosAdmin;
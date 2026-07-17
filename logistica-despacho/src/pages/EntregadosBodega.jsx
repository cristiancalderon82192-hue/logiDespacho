import React, { useState, useEffect } from 'react';
import { FileCheck, Download, Calendar, User, Search, Camera, Trash2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { socket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';
import DateRangeSelector from '../components/DateRangeSelector';

const EntregadosBodega = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  
  const obtenerFechaLocal = () => {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const dia = String(fecha.getDate()).padStart(2, '0');
    return `${año}-${mes}-${dia}`;
  };
  const hoy = obtenerFechaLocal();

  const [fechaInicio, setFechaInicio] = useState(hoy);
  const [fechaFin, setFechaFin] = useState(hoy);
  const [filtroFactura, setFiltroFactura] = useState('');

  useEffect(() => {
    const cargarHistorial = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/entregados`);
        if (res.ok) setHistorial(await res.json());
      } catch (e) { /* ignorar errores de red temporales */ }
    };
    cargarHistorial();
    
    // Conexión WebSockets para actualizaciones en tiempo real (adiós setInterval)
    socket.on('actualizacion_bodega', cargarHistorial);
    return () => socket.off('actualizacion_bodega', cargarHistorial);
  }, []);
  const isAdmin = String(user?.role) === '1' || String(user?.role) === '6' || 
                  (user?.rol_nombre && user?.rol_nombre.toLowerCase().includes('admin'));

  const eliminarRegistro = async (id) => {
    if (!window.confirm("¿Estás seguro de eliminar este registro histórico? Esta acción no se puede deshacer.")) return;
    
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/bodega/entregados/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setHistorial(historial.filter(h => h.id !== id));
      } else {
        alert("Error al eliminar el registro.");
      }
    } catch (error) {
      console.error("Error eliminando registro:", error);
      alert("Error de red al intentar eliminar.");
    }
  };

  const descargarPDFSupport = (entrega) => {
    try {
      const doc = new jsPDF();
      const colorHeader = [71, 179, 168]; 
      
      doc.setFillColor(colorHeader[0], colorHeader[1], colorHeader[2]); 
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("SOPORTE DE ENTREGA BODEGA", 105, 18, { align: 'center' });
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Documento / Factura: ${entrega.factura_num}`, 14, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha Entrega: ${new Date(entrega.fecha_entrega).toLocaleString()}`, 14, 52);
      
      autoTable(doc, {
          startY: 60,
          head: [['Despachador']],
          body: [
              [`Nombre: ${entrega.despachador}${entrega.bodega_nombre ? ' - Bodega: ' + entrega.bodega_nombre : ''}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: colorHeader } 
      });

      let itemsDespachados = [];
      try {
        itemsDespachados = JSON.parse(entrega.productos_entregados || '[]');
      } catch (e) {
        console.error("Error parseando productos:", e);
      }

      const bodyProductos = itemsDespachados.map(p => [
        p.codigo || p.codigo_producto || '-',
        p.nombre || p.nombre_producto || '-',
        `${p.cant_a_entregar || p.cantidad_a_entregar_ahora || 0} ${p.unidad || p.unidad_medida || 'UND'}`
      ]);

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Código', 'Producto Entregado', 'Cantidad']],
          body: bodyProductos.length > 0 ? bodyProductos : [['-', 'Sin productos', '-']],
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Firma del Cliente de Recibido:", 14, finalY);
      
      if (entrega.firma_cliente) {
          doc.addImage(entrega.firma_cliente, 'PNG', 14, finalY + 5, 80, 40);
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
      } 

      if (entrega.nombre_recibe || entrega.cedula_recibe) {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(50, 50, 50);
          doc.text(`Recibe: ${entrega.nombre_recibe || 'N/A'} - CC: ${entrega.cedula_recibe || 'N/A'}`, 14, finalY + 50);
      }
      
      doc.save(`Soporte_Bodega_${entrega.factura_num}.pdf`);
    } catch (error) {
      console.error("Error generando PDF:", error);
    }
  };

  const descargarEvidencia = (entrega) => {
    if (!entrega.firma_bodeguero) return;
    const a = document.createElement('a');
    a.href = entrega.firma_bodeguero;
    a.download = `Evidencia_Factura_${entrega.factura_num}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const historialFiltrado = historial.filter(h => {
    // REGLA: Si es lider_sala, SOLO ve los suyos (creado_por_id)
    if (user?.role === 'lider_sala' && h.creado_por_id !== user.id) return false;

    const cumpleFactura = filtroFactura ? h.factura_num?.toLowerCase().includes(filtroFactura.toLowerCase()) : true;
    
    let fecha = '';
    if (h.fecha_entrega) {
      const d = new Date(h.fecha_entrega);
      const año = d.getFullYear();
      const mes = String(d.getMonth() + 1).padStart(2, '0');
      const dia = String(d.getDate()).padStart(2, '0');
      fecha = `${año}-${mes}-${dia}`;
    }
    let cumpleFecha = true;
    if (fechaInicio && fecha) cumpleFecha = cumpleFecha && fecha >= fechaInicio;
    if (fechaFin && fecha) cumpleFecha = cumpleFecha && fecha <= fechaFin;
    
    return cumpleFactura && cumpleFecha;
  });

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-800">Soportes y Material Entregado</h1>
        <p className="text-sm text-slate-500">Historial de soportes PDF firmados</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-col md:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Search size={12}/> Buscar Factura</label>
          <input 
            type="text" 
            placeholder="No. de Factura..." 
            value={filtroFactura} 
            onChange={(e) => setFiltroFactura(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex-[2] w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Rango de Fechas</label>
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-900 text-white"><h2 className="font-bold flex items-center gap-2"><FileCheck size={18}/> Registro Histórico de Despachos</h2></div>
        {/* VISTA ESCRITORIO (TABLA) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase border-b">
                <th className="p-4">Factura No.</th>
                <th className="p-4">Creado Por</th>
                <th className="p-4">Fecha y Hora</th>
                <th className="p-4">Despachador</th>
                <th className="p-4 text-center">Soporte</th>
              </tr>
            </thead>
            <tbody className="text-sm text-slate-700">
              {historialFiltrado.length === 0 ? (
                <tr><td colSpan="5" className="p-8 text-center text-slate-400">Aún no hay registros históricos.</td></tr>
              ) : (
                historialFiltrado.map((h) => (
                  <tr key={h.id} className="border-b hover:bg-slate-50">
                    <td className="p-4 font-bold text-slate-900">{h.factura_num}</td>
                    <td className="p-4 text-slate-500 font-medium">
                      {h.nombre_creador ? (
                        <span className="text-slate-700">{h.nombre_creador}</span>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No registrado</span>
                      )}
                    </td>
                    <td className="p-4"><span className="flex items-center gap-1"><Calendar size={14}/> {new Date(h.fecha_entrega).toLocaleString()}</span></td>
                    <td className="p-4"><span className="flex items-center gap-1"><User size={14}/> {h.despachador}</span></td>
                    <td className="p-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => descargarPDFSupport(h)} className="bg-slate-900 text-white hover:bg-slate-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm">
                          <Download size={12}/> PDF
                        </button>
                        {h.firma_bodeguero && h.firma_bodeguero.length > 50 && (
                          <button onClick={() => descargarEvidencia(h)} className="bg-blue-600 text-white hover:bg-blue-700 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm" title="Descargar foto evidencia">
                            <Camera size={12}/> Foto
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => eliminarRegistro(h.id)} className="bg-red-50 text-red-600 hover:bg-red-600 hover:text-white border border-red-200 hover:border-red-600 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm" title="Eliminar registro">
                            <Trash2 size={12}/>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* VISTA MÓVIL (TARJETAS) */}
        <div className="md:hidden grid grid-cols-1 gap-4 p-4 bg-slate-50">
          {historialFiltrado.length === 0 ? (
            <p className="text-center text-slate-400 p-4">Aún no hay registros históricos.</p>
          ) : (
            historialFiltrado.map((h) => (
              <div key={h.id} className="bg-white border rounded-xl p-4 shadow-sm flex flex-col gap-3 relative">
                <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Factura No.</p>
                  <p className="text-lg font-black text-slate-800">{h.factura_num}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-y-3 gap-x-2 text-sm border-t border-b border-slate-100 py-3 my-1">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">Fecha y Hora Entrega</p>
                    <p className="font-medium text-slate-700 text-xs flex items-center gap-1"><Calendar size={12}/>{new Date(h.fecha_entrega).toLocaleString()}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Creado Por</p>
                      <p className="font-medium text-slate-700 text-xs truncate">
                        {h.nombre_creador ? h.nombre_creador : <span className="italic text-slate-400">No registrado</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Despachador</p>
                      <p className="font-bold text-slate-700 text-xs flex items-center gap-1"><User size={12}/>{h.despachador}</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full mt-1">
                  <button onClick={() => descargarPDFSupport(h)} className="flex-1 bg-slate-900 text-white py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1">
                    <Download size={14}/> PDF
                  </button>
                  {h.firma_bodeguero && h.firma_bodeguero.length > 50 && (
                    <button onClick={() => descargarEvidencia(h)} className="flex-1 bg-blue-600 text-white py-2 rounded-xl text-xs font-bold flex justify-center items-center gap-1">
                      <Camera size={14}/> Foto
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => eliminarRegistro(h.id)} className="bg-red-50 text-red-600 border border-red-200 px-3 rounded-xl flex items-center justify-center transition-colors hover:bg-red-600 hover:text-white">
                      <Trash2 size={16}/>
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
export default EntregadosBodega;
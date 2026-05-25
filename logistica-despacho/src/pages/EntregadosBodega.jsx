import React, { useState, useEffect } from 'react';
import { FileCheck, Download, Calendar, User, Search, Camera } from 'lucide-react';
import { jsPDF } from 'jspdf';
import { socket } from '../utils/socket';
import { useAuth } from '../context/AuthContext';

const EntregadosBodega = () => {
  const { user } = useAuth();
  const [historial, setHistorial] = useState([]);
  
  const date = new Date();
  const defaultInicio = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const defaultFin = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  const [fechaInicio, setFechaInicio] = useState(defaultInicio);
  const [fechaFin, setFechaFin] = useState(defaultFin);
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

  const descargarPDFSupport = (entrega) => {
    const doc = new jsPDF();
    
    doc.setFillColor(71, 179, 168);
    doc.rect(0, 0, 210, 30, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("COMPROBANTE DE ENTREGA EN BODEGA", 15, 20);

    doc.setTextColor(50, 50, 50);
    doc.setFontSize(11);
    doc.text(`Número de Factura: ${entrega.factura_num}`, 15, 45);
    doc.text(`Fecha: ${new Date(entrega.fecha_entrega).toLocaleString()}`, 15, 52);
    doc.text(`Bodeguero: ${entrega.despachador}`, 15, 59);

    doc.setFillColor(30, 41, 59);
    doc.rect(15, 70, 180, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("Código", 18, 75);
    doc.text("Descripción Material", 60, 75);
    doc.text("Cant. Entregada", 155, 75);

    doc.setTextColor(70, 70, 70);
    let itemsDespachados = JSON.parse(entrega.productos_entregados);
    let currentY = 85;

    itemsDespachados.forEach((item) => {
      doc.text(String(item.codigo_producto), 18, currentY);
      doc.text(String(item.nombre_producto), 60, currentY);
      doc.text(`${item.cant_a_entregar} ${item.unidad_medida}`, 155, currentY);
      currentY += 8;
    });

    // Se elimina la firma del bodeguero del PDF
    doc.line(70, 180, 145, 180); // Centrado
    doc.text("Firma Cliente", 95, 185);
    if (entrega.firma_cliente) doc.addImage(entrega.firma_cliente, 'PNG', 70, 145, 75, 32);

    doc.save(`Soporte_${entrega.factura_num}.pdf`);
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
    
    const fecha = h.fecha_entrega ? h.fecha_entrega.split('T')[0] : '';
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
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Fecha Entrega (Desde)</label>
          <input 
            type="date" 
            value={fechaInicio} 
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div className="flex-1 w-full">
          <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-1"><Calendar size={12}/> Fecha Entrega (Hasta)</label>
          <input 
            type="date" 
            value={fechaFin} 
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full border p-2 rounded-lg outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
        <div className="p-5 border-b bg-slate-900 text-white"><h2 className="font-bold flex items-center gap-2"><FileCheck size={18}/> Registro Histórico de Despachos</h2></div>
        <div className="overflow-x-auto">
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
export default EntregadosBodega;
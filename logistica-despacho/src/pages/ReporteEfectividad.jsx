import React, { useState, useEffect } from 'react';
import { Download, FileText, AlertCircle, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteEfectividad = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/efectividad`);
        
        if (!respuesta.ok) throw new Error('Error al cargar los datos de efectividad');
        
        const data = await respuesta.json();
        setDatos(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerDatos();
  }, []);

  const exportarExcel = () => {
    const datosFormateados = datos.map(fila => ({
      'Factura': fila.id_factura,
      'Cliente': fila.cliente,
      'Fecha Promesa': fila.fecha_promesa,
      'Fecha Real Entrega': fila.fecha_real_entrega || 'No entregado aún',
      'Estado Actual': fila.estado_entrega,
      'Nivel de Servicio': fila.nivel_servicio
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Efectividad");
    XLSX.writeFile(libro, "Reporte_Efectividad_Entregas.xlsx");
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Reporte de Efectividad en Entregas", 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString()}`, 14, 30);

    const columnas = ["Factura", "Cliente", "F. Promesa", "F. Entrega Real", "Estado", "Nivel de Servicio"];
    const filas = datos.map(fila => [
      fila.id_factura,
      fila.cliente,
      fila.fecha_promesa,
      fila.fecha_real_entrega || 'N/A',
      fila.estado_entrega,
      fila.nivel_servicio
    ]);

    autoTable(doc, {
      startY: 40,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { fillColor: [71, 179, 168] },
    });

    doc.save("Reporte_Efectividad_Entregas.pdf");
  };

  const colorNivelServicio = (nivel) => {
    if (nivel === 'A Tiempo') return 'bg-green-100 text-green-700 border-green-200';
    if (nivel === 'Atrasado' || nivel === 'Fallido (Devolución)') return 'bg-red-100 text-red-700 border-red-200';
    return 'bg-orange-100 text-orange-700 border-orange-200'; 
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 min-h-[80vh]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8]">
            <AlertCircle size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Efectividad en Entregas</h1>
            <p className="text-sm text-slate-500">Métricas de cumplimiento y tiempos de servicio</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button 
            onClick={exportarExcel}
            disabled={cargando || datos.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm"
          >
            <FileText size={18} />
            Excel
          </button>
          <button 
            onClick={exportarPDF}
            disabled={cargando || datos.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm"
          >
            <Download size={18} />
            PDF
          </button>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500">
          <Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" />
          <p>Evaluando tiempos de entrega...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center">
          {error}
        </div>
      )}

      {!cargando && !error && (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="bg-slate-50 text-slate-600 text-sm uppercase tracking-wider border-b border-slate-200">
                <th className="p-4 font-semibold rounded-tl-lg">Factura</th>
                <th className="p-4 font-semibold">Cliente</th>
                <th className="p-4 font-semibold">Fecha Promesa</th>
                <th className="p-4 font-semibold">Entrega Real</th>
                <th className="p-4 font-semibold">Estado Actual</th>
                <th className="p-4 font-semibold text-center rounded-tr-lg">Nivel de Servicio</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {datos.length > 0 ? (
                datos.map((fila, index) => (
                  <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                    <td className="p-4 font-medium text-slate-800">{fila.id_factura}</td>
                    <td className="p-4 text-slate-600 truncate max-w-[200px]" title={fila.cliente}>{fila.cliente}</td>
                    <td className="p-4 text-slate-600 font-medium">{fila.fecha_promesa}</td>
                    <td className="p-4 text-slate-600">
                      {fila.fecha_real_entrega || <span className="text-slate-400 italic">-- : --</span>}
                    </td>
                    <td className="p-4 text-slate-600">{fila.estado_entrega}</td>
                    <td className="p-4 text-center">
                      <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${colorNivelServicio(fila.nivel_servicio)}`}>
                        {fila.nivel_servicio}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-slate-500">
                    No hay datos de efectividad registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ReporteEfectividad;
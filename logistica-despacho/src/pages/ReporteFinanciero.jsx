import React, { useState, useEffect } from 'react';
import { Download, FileText, DollarSign, Loader2, Wallet, TrendingUp, AlertCircle, Building, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteFinanciero = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [animacionBarra, setAnimacionBarra] = useState(0);

  const fechaActual = new Date();
  const hoyStr = fechaActual.toISOString().split('T')[0];
  const primerDiaMesStr = new Date(fechaActual.getFullYear(), fechaActual.getMonth(), 1).toISOString().split('T')[0];

  const [fechaInicio, setFechaInicio] = useState(primerDiaMesStr);
  const [fechaFin, setFechaFin] = useState(hoyStr);

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  useEffect(() => {
    const obtenerDatos = async () => {
      setCargando(true);
      setError(null);
      setAnimacionBarra(0);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/financiero?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        
        if (!respuesta.ok) throw new Error('Error al cargar los datos financieros');
        
        const data = await respuesta.json();

        // 1. LIMPIEZA INICIAL DE LOS DATOS
        const facturasRaw = data.map(f => ({
          ...f,
          id_factura_raw: f.id_factura ? String(f.id_factura).trim().toUpperCase() : 'SIN-FACTURA',
          valFac: Number(f.valor_factura || 0),
          valRec: Number(f.valor_recaudado || 0)
        }));

        // 2. MAPA DE "PADRES" (Para saber si un sufijo pertenece a una factura original)
        const allIds = new Set(facturasRaw.map(f => f.id_factura_raw));

        const facturasMap = {};

        facturasRaw.forEach(fila => {
          let idFacRaw = fila.id_factura_raw;
          let idFacBase = idFacRaw;

          // 👇 DETECCIÓN DE RAÍZ ULTRA-INTELIGENTE (Padres, Hijos y Nietos) 👇
          // Si tiene guiones, quitamos sufijos de derecha a izquierda hasta encontrar la factura original
          if (idFacBase.includes('-')) {
            let partes = idFacBase.split('-');
            while (partes.length > 1) {
              partes.pop(); // Quitamos el último sufijo
              let posibleBase = partes.join('-');
              
              // Si la base existe en los datos, la guardamos como raíz y seguimos buscando más atrás
              if (allIds.has(posibleBase)) {
                idFacBase = posibleBase; 
              }
            }
          }

          if (!facturasMap[idFacBase]) {
            facturasMap[idFacBase] = {
              ...fila,
              id_factura_base: idFacBase,
              max_positivo: fila.valFac > 0 ? fila.valFac : 0,
              suma_negativos: fila.valFac < 0 ? fila.valFac : 0, 
              valor_recaudado_cruzado: fila.valRec,
              viajes_count: 1,
              conductores_historial: new Set(fila.conductor ? [fila.conductor] : []),
              facturas_asociadas: new Set([idFacRaw]) 
            };
          } else {
            // Si es un "hijo" o "nieto", no duplicamos el valor de la factura, 
            // solo nos interesa el valor máximo (la deuda real original)
            if (fila.valFac > 0) {
              facturasMap[idFacBase].max_positivo = Math.max(facturasMap[idFacBase].max_positivo, fila.valFac);
            } else {
              facturasMap[idFacBase].suma_negativos += fila.valFac;
            }
            
            // SUMA TOTAL: Aquí es donde ocurre la magia del cruce
            facturasMap[idFacBase].valor_recaudado_cruzado += fila.valRec;
            facturasMap[idFacBase].viajes_count += 1;
            
            if (fila.conductor) facturasMap[idFacBase].conductores_historial.add(fila.conductor);
            facturasMap[idFacBase].facturas_asociadas.add(idFacRaw);
          }
        });

        // 3. MATEMÁTICA FINAL Y ESTADOS
        const datosCruzados = Object.values(facturasMap).map(fac => {
          const facturaNeta = fac.max_positivo + fac.suma_negativos;
          const saldo = facturaNeta - fac.valor_recaudado_cruzado;
          
          let estadoFinal = fac.estado_entrega;
          
          // Auditoría del saldo para dictar el estado logístico
          if (fac.viajes_count > 1 || fac.suma_negativos < 0) {
            // Abs resuelve problemas de milésimas en JavaScript (0.0000001)
            if (Math.abs(saldo) < 0.1) estadoFinal = 'SALDADO (Cruzado)';
            else if (saldo <= 0) estadoFinal = 'SALDO A FAVOR';
            else estadoFinal = 'PAGO PARCIAL (Cruzado)';
          }

          return {
            ...fac,
            valor_factura: facturaNeta,
            valor_recaudado: fac.valor_recaudado_cruzado,
            saldo_pendiente: saldo,
            estado_entrega: estadoFinal,
            conductor: Array.from(fac.conductores_historial).join(' + ') || 'Sin asignar',
            id_factura_display: Array.from(fac.facturas_asociadas).join(', ') // Mostrará: "56789, 56789-S61"
          };
        });

        datosCruzados.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setDatos(datosCruzados);

        if (datosCruzados.length > 0) {
          const totalFac = datosCruzados.reduce((acc, curr) => acc + curr.valor_factura, 0);
          const totalRec = datosCruzados.reduce((acc, curr) => acc + curr.valor_recaudado, 0);
          const porcentajeLiquidez = totalFac > 0 ? Math.round((totalRec / totalFac) * 100) : 0;
          setTimeout(() => setAnimacionBarra(porcentajeLiquidez > 100 ? 100 : porcentajeLiquidez), 200);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setCargando(false);
      }
    };

    obtenerDatos();
  }, [fechaInicio, fechaFin]);

  const exportarExcel = () => {
    const datosFormateados = datos.map(fila => ({
      'Factura(s)': fila.id_factura_display,
      'Fecha': fila.fecha,
      'Cliente': fila.cliente,
      'Conductor(es)': fila.conductor || 'Sin asignar',
      'Estado Consolidado': fila.estado_entrega,
      'Viajes Cruzados': fila.viajes_count || 1,
      'Valor Factura (Neto)': Number(fila.valor_factura),
      'Total Recaudado': Number(fila.valor_recaudado),
      'Saldo Pendiente': Number(fila.saldo_pendiente)
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Financiero");
    XLSX.writeFile(libro, `Reporte_Financiero_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    doc.setFontSize(18);
    doc.text("Reporte Financiero y Saldos Cruzados", 14, 22);
    doc.setFontSize(11);
    doc.text(`Rango evaluado: ${fechaInicio} al ${fechaFin}`, 14, 30);

    const columnas = ["Factura(s)", "Fecha", "Cliente", "Conductor", "Estado", "V. Factura", "Recaudado", "Saldo"];
    const filas = datos.map(fila => [
      fila.id_factura_display,
      fila.fecha,
      fila.cliente,
      fila.conductor || 'N/A',
      fila.estado_entrega,
      formatearMoneda(fila.valor_factura),
      formatearMoneda(fila.valor_recaudado),
      formatearMoneda(fila.saldo_pendiente)
    ]);

    autoTable(doc, {
      startY: 40, head: [columnas], body: filas, theme: 'grid',
      headStyles: { fillColor: [71, 179, 168] }, styles: { fontSize: 8 }, 
    });

    doc.save(`Reporte_Financiero_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  const totales = datos.reduce((acc, curr) => ({
    facturado: acc.facturado + Number(curr.valor_factura || 0),
    recaudado: acc.recaudado + Number(curr.valor_recaudado || 0),
    pendiente: acc.pendiente + (Number(curr.saldo_pendiente) > 0 ? Number(curr.saldo_pendiente) : 0)
  }), { facturado: 0, recaudado: 0, pendiente: 0 });

  const sinDatos = datos.length === 0 || totales.facturado === 0;

  const getColorEstado = (estado) => {
    const txt = estado.toUpperCase();
    if (txt.includes('SALDADO') || txt.includes('FAVOR') || (txt.includes('ENTREGADO') && !txt.includes('INCOMPLETO'))) {
      return 'bg-green-100 text-green-700 border border-green-200';
    }
    if (txt.includes('DEVOLUCIÓN')) return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-orange-100 text-orange-700 border border-orange-200';
  };

  return (
    <div className="bg-slate-50 rounded-xl p-3 md:p-6 min-h-[80vh] overflow-x-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8] shadow-sm"><Building size={24} /></div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Estado Financiero</h1>
            <p className="text-sm text-slate-500">Consolidado inteligente de facturación, recaudos y cartera</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-3 py-2 shadow-sm focus-within:border-[#47B3A8] transition-colors">
            <Calendar size={18} className="text-[#47B3A8]" />
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400 uppercase">Desde</span><input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-[110px]"/></div>
            <div className="w-px h-5 bg-slate-300"></div>
            <div className="flex items-center gap-2"><span className="text-xs font-bold text-slate-400 uppercase">Hasta</span><input type="date" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} min={fechaInicio} className="bg-transparent border-none outline-none text-sm text-slate-700 font-bold cursor-pointer w-[110px]"/></div>
          </div>
          <div className="w-px h-8 bg-slate-200 hidden xl:block mx-1"></div>
          <button onClick={exportarExcel} disabled={cargando || sinDatos} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"><FileText size={18} /> Excel</button>
          <button onClick={exportarPDF} disabled={cargando || sinDatos} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"><Download size={18} /> PDF</button>
        </div>
      </div>

      {cargando && (
        <div className="flex flex-col items-center justify-center py-20 text-slate-500"><Loader2 size={40} className="animate-spin text-[#47B3A8] mb-4" /><p>Calculando saldos y cruzando operaciones...</p></div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200 text-center shadow-sm">{error}</div>}

      {!cargando && !error && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
          <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute -right-6 -top-6 text-white/5 group-hover:scale-110 transition-transform duration-500"><Wallet size={120} /></div>
            <div className="relative z-10">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2"><DollarSign size={16} className="text-teal-400" /> Total Facturado</h3>
              <p className={`text-3xl md:text-4xl font-extrabold tracking-tight mt-4 ${sinDatos ? 'text-slate-600' : 'text-white'}`}>{formatearMoneda(totales.facturado)}</p>
              <p className="text-xs text-slate-500 mt-2">Ingreso bruto neto (cruces aplicados)</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><TrendingUp size={16} className={sinDatos ? 'text-slate-400' : 'text-green-500'} /> Ingresos Reales</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${sinDatos ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>{animacionBarra}% Recaudado</span>
              </div>
              <p className={`text-2xl md:text-3xl font-extrabold mt-2 ${sinDatos ? 'text-slate-400' : 'text-slate-800'}`}>{formatearMoneda(totales.recaudado)}</p>
            </div>
            <div className="relative z-10 mt-6"><div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-1500 ease-out relative overflow-hidden ${sinDatos ? 'bg-slate-300' : 'bg-gradient-to-r from-green-400 to-green-600'}`} style={{ width: `${animacionBarra}%` }}><div className="absolute top-0 left-0 bottom-0 w-full bg-white/20 animate-[shimmer_2s_infinite]"></div></div></div></div>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-md border border-slate-200 flex flex-col justify-between relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2"><AlertCircle size={16} className={sinDatos ? 'text-slate-400' : 'text-red-500'} /> Cartera Pendiente</h3>
                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${sinDatos ? 'bg-slate-100 text-slate-500' : 'bg-red-100 text-red-700'}`}>{sinDatos ? '0' : (100 - animacionBarra)}% En deuda</span>
              </div>
              <p className={`text-2xl md:text-3xl font-extrabold mt-2 ${sinDatos ? 'text-slate-400' : 'text-red-600'}`}>{formatearMoneda(totales.pendiente)}</p>
            </div>
            <div className="relative z-10 mt-6"><div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner"><div className={`h-full rounded-full transition-all duration-1500 ease-out relative overflow-hidden ${sinDatos ? 'bg-slate-300' : 'bg-gradient-to-r from-red-400 to-red-600'}`} style={{ width: sinDatos ? '0%' : `${100 - animacionBarra}%` }}><div className="absolute top-0 left-0 bottom-0 w-full bg-white/20 animate-[shimmer_2s_infinite]"></div></div></div></div>
          </div>
        </div>
      )}

      {!cargando && !error && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider border-b border-slate-700">
                  <th className="p-4 font-semibold rounded-tl-lg">Factura(s)</th>
                  <th className="p-4 font-semibold">Fecha (Última)</th>
                  <th className="p-4 font-semibold">Cliente</th>
                  <th className="p-4 font-semibold">Conductor(es)</th>
                  <th className="p-4 font-semibold text-center">Estado Consolidado</th>
                  <th className="p-4 font-semibold text-right">Valor Factura</th>
                  <th className="p-4 font-semibold text-right text-green-300">Recaudado</th>
                  <th className="p-4 font-semibold text-right text-red-300 rounded-tr-lg">Saldo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {datos.length > 0 ? (
                  datos.map((fila, index) => (
                    <tr key={index} className="hover:bg-slate-50 transition-colors text-sm">
                      <td className="p-4 font-bold text-slate-800">
                        {fila.id_factura_display} 
                        {fila.viajes_count > 1 && <span className="ml-2 bg-blue-100 text-blue-700 text-[9px] px-1.5 py-0.5 rounded-full">{fila.viajes_count} Viajes</span>}
                      </td>
                      <td className="p-4 text-slate-600 font-medium">{fila.fecha}</td>
                      <td className="p-4 text-slate-700 font-semibold truncate max-w-[150px]" title={fila.cliente}>{fila.cliente}</td>
                      <td className="p-4 text-slate-600 flex items-center gap-2">{fila.conductor && fila.conductor !== 'Sin asignar' ? (<><div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{fila.conductor.charAt(0)}</div> {fila.conductor}</>) : (<span className="text-slate-400 italic px-2 py-1 bg-slate-100 rounded text-xs">Sin asignar</span>)}</td>
                      <td className="p-4 text-center"><span className={`px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${getColorEstado(fila.estado_entrega)}`}>{fila.estado_entrega}</span></td>
                      <td className="p-4 text-right text-slate-600 font-medium">{formatearMoneda(fila.valor_factura)}</td>
                      <td className="p-4 text-right text-green-700 font-extrabold bg-green-50/30">{formatearMoneda(fila.valor_recaudado)}</td>
                      
                      <td className={`p-4 text-right font-extrabold ${Number(fila.saldo_pendiente) < 0 ? 'text-blue-600 bg-blue-50/30' : Number(fila.saldo_pendiente) > 0 ? 'text-red-600 bg-red-50/30' : 'text-green-600 bg-green-50/30'}`}>
                        {Number(fila.saldo_pendiente) < 0 
                          ? `A Favor: ${formatearMoneda(Math.abs(fila.saldo_pendiente))}`
                          : Number(fila.saldo_pendiente) > 0 
                            ? formatearMoneda(fila.saldo_pendiente) 
                            : <span className="text-slate-400">Saldado</span>}
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr><td colSpan="8" className="p-16 text-center text-slate-500 flex flex-col items-center justify-center"><Wallet size={48} className="text-slate-200 mb-4" /><p className="text-lg font-bold text-slate-600">No hay registros financieros</p></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fade-in-up { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-fade-in-up { animation: fade-in-up 0.5s ease-out forwards; }
        @keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
      `}</style>
    </div>
  );
};

export default ReporteFinanciero;
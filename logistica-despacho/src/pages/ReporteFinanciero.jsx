import React, { useState, useEffect } from 'react';
import { Download, FileText, DollarSign, Loader2, Wallet, TrendingUp, AlertCircle, Building, Calendar } from 'lucide-react';
import DateRangeSelector from '../components/DateRangeSelector';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const ReporteFinanciero = () => {
  const [datos, setDatos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);
  const [animacionBarra, setAnimacionBarra] = useState(0);

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

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor || 0);
  };

  const abortControllerRef = React.useRef(null);

  useEffect(() => {
    const obtenerDatos = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setCargando(true);
      setError(null);
      setAnimacionBarra(0);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const respuesta = await fetch(`${apiUrl}/api/reportes/financiero?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`, {
          signal: abortControllerRef.current.signal
        });
        
        if (!respuesta.ok) throw new Error('Error al cargar los datos financieros');
        
        const data = await respuesta.json();

        // 1. LIMPIEZA INICIAL DE LOS DATOS
        const facturasRaw = data.map(f => ({
          ...f,
          id_factura_raw: f.id_factura ? String(f.id_factura).trim().toUpperCase() : 'SIN-FACTURA',
          valFac: Number(f.valor_factura || 0),
          valRec: Number(f.valor_recaudado || 0)
        }));

        // 2. MAPA DE "PADRES"
        const allIds = new Set(facturasRaw.map(f => f.id_factura_raw));

        const facturasMap = {};

        facturasRaw.forEach(fila => {
          let idFacRaw = fila.id_factura_raw;
          let idFacBase = idFacRaw;

          if (idFacBase.includes('-')) {
            let partes = idFacBase.split('-');
            while (partes.length > 1) {
              partes.pop(); 
              let posibleBase = partes.join('-');
              if (allIds.has(posibleBase)) {
                idFacBase = posibleBase; 
              }
            }
          }

          if (!facturasMap[idFacBase]) {
            const asocs = new Set([idFacRaw]);
            if (fila.doc_mostrador) asocs.add(fila.doc_mostrador);

            facturasMap[idFacBase] = {
              ...fila,
              id_factura_base: idFacBase,
              max_positivo: fila.valFac > 0 ? fila.valFac : 0,
              suma_negativos: fila.valFac < 0 ? fila.valFac : 0, 
              valor_recaudado_cruzado: fila.valRec,
              viajes_count: 1,
              conductores_historial: new Set(fila.conductor ? [fila.conductor] : []),
              facturas_asociadas: asocs 
            };
          } else {
            if (fila.valFac > 0) {
              facturasMap[idFacBase].max_positivo = Math.max(facturasMap[idFacBase].max_positivo, fila.valFac);
            } else {
              facturasMap[idFacBase].suma_negativos += fila.valFac;
            }
            
            facturasMap[idFacBase].valor_recaudado_cruzado += fila.valRec;
            facturasMap[idFacBase].viajes_count += 1;
            
            if (fila.conductor) facturasMap[idFacBase].conductores_historial.add(fila.conductor);
            facturasMap[idFacBase].facturas_asociadas.add(idFacRaw);
            if (fila.doc_mostrador) facturasMap[idFacBase].facturas_asociadas.add(fila.doc_mostrador);
          }
        });

        // 3. MATEMÁTICA FINAL Y ESTADOS
        const datosCruzados = Object.values(facturasMap).map(fac => {
          const facturaNeta = fac.max_positivo + fac.suma_negativos;
          const saldo = facturaNeta - fac.valor_recaudado_cruzado;
          
          let estadoFinal = fac.estado_entrega;
          
          if (fac.viajes_count > 1 || fac.suma_negativos < 0) {
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
            id_factura_display: Array.from(fac.facturas_asociadas).join(', ') 
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
        if (err.name === 'AbortError') return;
        setError(err.message);
      } finally {
        if (abortControllerRef.current && !abortControllerRef.current.signal.aborted) {
          setCargando(false);
        }
      }
    };

    obtenerDatos();
  }, [fechaInicio, fechaFin]);

  // Calculamos los totales de forma global para poder usarlos tanto en UI como en PDF
  const totales = datos.reduce((acc, curr) => ({
    facturado: acc.facturado + Number(curr.valor_factura || 0),
    recaudado: acc.recaudado + Number(curr.valor_recaudado || 0),
    pendiente: acc.pendiente + (Number(curr.saldo_pendiente) > 0 ? Number(curr.saldo_pendiente) : 0)
  }), { facturado: 0, recaudado: 0, pendiente: 0 });

  const sinDatos = datos.length === 0 || totales.facturado === 0;
  // Calculamos en tiempo real si necesitamos pintar la deuda
  const pRecaudo = sinDatos ? 0 : (totales.facturado > 0 ? Math.round((totales.recaudado / totales.facturado) * 100) : 0);

  const exportarExcel = () => {
    const datosFormateados = datos.map(fila => ({
      'Factura(s)': fila.id_factura_display,
      'Fecha': fila.fecha,
      'Cliente': fila.cliente,
      'Conductor(es)': fila.conductor || 'Sin asignar',
      'Estado Consolidado': fila.estado_entrega,
      'Viajes Cruzados': fila.viajes_count || 1,
      'Valor Factura (Neto)': Number(fila.valor_factura),
      'Retiro Mostrador': Number(fila.valor_mostrador || 0),
      'Total Recaudado': Number(fila.valor_recaudado),
      'Saldo Pendiente': Number(fila.saldo_pendiente)
    }));

    const hoja = XLSX.utils.json_to_sheet(datosFormateados);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Financiero");
    XLSX.writeFile(libro, `Reporte_Financiero_${fechaInicio}_al_${fechaFin}.xlsx`);
  };

  // 👇 PDF REDISEÑADO CON TARJETAS ESTILO DASHBOARD 👇
  const exportarPDF = () => {
    const doc = new jsPDF('landscape');
    
    // 1. HEADER (Fondo Oscuro Corporativo)
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, 300, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("Estado Financiero y Cartera", 14, 20);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Rango evaluado: ${fechaInicio} hasta ${fechaFin}`, 14, 30);
    doc.text(`Generado el: ${new Date().toLocaleString()}`, 200, 30);

    // 2. TARJETAS DE INDICADORES (KPIs)
    let startY = 48;
    
    // Tarjeta 1: Total Facturado (Oscura)
    doc.setFillColor(30, 41, 59); // slate-800
    doc.roundedRect(14, startY, 85, 35, 3, 3, 'F');
    doc.setTextColor(148, 163, 184); // slate-400
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("TOTAL FACTURADO", 20, startY + 8);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(`${formatearMoneda(totales.facturado)}`, 20, startY + 22);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Ingreso bruto neto (cruces aplicados)`, 20, startY + 30);

    // Tarjeta 2: Ingresos Reales (Verde)
    doc.setFillColor(240, 253, 244); // green-50
    doc.roundedRect(105, startY, 85, 35, 3, 3, 'F');
    doc.setTextColor(22, 163, 74); // green-600
    doc.setFontSize(10);
    doc.text("INGRESOS REALES", 111, startY + 8);
    doc.setFontSize(20);
    doc.text(`${formatearMoneda(totales.recaudado)}`, 111, startY + 22);
    doc.setFontSize(9);
    doc.text(`${pRecaudo}% Recaudado`, 111, startY + 30);

    // Tarjeta 3: Cartera Pendiente (Rojo)
    doc.setFillColor(254, 242, 242); // red-50
    doc.roundedRect(196, startY, 85, 35, 3, 3, 'F');
    doc.setTextColor(220, 38, 38); // red-600
    doc.setFontSize(10);
    doc.text("CARTERA PENDIENTE", 202, startY + 8);
    doc.setFontSize(20);
    doc.text(`${formatearMoneda(totales.pendiente)}`, 202, startY + 22);
    doc.setFontSize(9);
    doc.text(`${sinDatos ? '0' : (100 - pRecaudo)}% En deuda`, 202, startY + 30);

    // 3. TABLA DE DATOS (Mismo estilo que la UI web)
    const columnas = ["Factura(s)", "Fecha", "Cliente", "Conductor", "Estado", "V. Factura", "Mostrador", "Recaudado", "Saldo"];
    const filas = datos.map(fila => [
      fila.id_factura_display,
      fila.fecha,
      fila.cliente,
      fila.conductor || 'N/A',
      fila.estado_entrega,
      formatearMoneda(fila.valor_factura),
      formatearMoneda(fila.valor_mostrador),
      formatearMoneda(fila.valor_recaudado),
      Number(fila.saldo_pendiente) < 0 ? `A Favor: ${formatearMoneda(Math.abs(fila.saldo_pendiente))}` : formatearMoneda(fila.saldo_pendiente)
    ]);

    autoTable(doc, {
      startY: startY + 45,
      head: [columnas],
      body: filas,
      theme: 'grid',
      headStyles: { 
        fillColor: [15, 23, 42], // Fondo oscuro para el header de la tabla (igual a la UI web)
        textColor: 255, 
        fontStyle: 'bold' 
      },
      styles: { fontSize: 8, cellPadding: 3 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      didParseCell: function(data) {
        if (data.section === 'body') {
          // Valor Factura (Normal)
          if (data.column.index === 5) {
            data.cell.styles.textColor = [71, 85, 105]; // slate-600
          }
          // Mostrador (Naranja)
          if (data.column.index === 6) {
            data.cell.styles.textColor = [234, 88, 12]; // orange-600
          }
          // Recaudado (Verde)
          if (data.column.index === 7) {
            data.cell.styles.textColor = [21, 128, 61]; // green-700
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [240, 253, 244]; // green-50
          }
          // Saldo (Rojo o Verde)
          if (data.column.index === 8) {
             const saldoStr = data.cell.raw;
             if (saldoStr.includes('A Favor') || saldoStr === '$0' || saldoStr === 'Saldado') {
                data.cell.styles.textColor = [37, 99, 235]; // blue-600 o verde, puse azul para saldos a favor
                data.cell.styles.fontStyle = 'bold';
             } else {
                data.cell.styles.textColor = [220, 38, 38]; // red-600
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.fillColor = [254, 242, 242]; // red-50
             }
          }
        }
      }
    });

    doc.save(`Reporte_Financiero_${fechaInicio}_al_${fechaFin}.pdf`);
  };

  const getColorEstado = (estado) => {
    const txt = estado.toUpperCase();
    if (txt.includes('SALDADO') || txt.includes('FAVOR') || (txt.includes('ENTREGADO') && !txt.includes('INCOMPLETO'))) {
      return 'bg-green-100 text-green-700 border border-green-200';
    }
    if (txt.includes('DEVOLUCIÓN')) return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-orange-100 text-orange-700 border border-orange-200';
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 sm:p-6 min-h-[80vh] overflow-x-hidden">
      
      {/* ================= ENCABEZADO Y EXPORTACIÓN RESPONSIVO ================= */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6 pb-6 border-b border-slate-200">
        
        {/* Título y Logo */}
        <div className="flex items-center gap-3">
          <div className="bg-teal-100 p-3 rounded-lg text-[#47B3A8] shadow-sm shrink-0">
            <Building size={24} />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 leading-tight">Estado Financiero</h1>
            <p className="text-xs sm:text-sm text-slate-500">Consolidado inteligente de facturación, recaudos y cartera</p>
          </div>
        </div>

        {/* Controles: Fechas y Exportación (Adaptable a Móvil) */}
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch lg:items-center gap-3 w-full lg:w-auto">
          
          {/* Caja de Fechas */}
          <DateRangeSelector 
            fechaInicio={fechaInicio} 
            setFechaInicio={setFechaInicio} 
            fechaFin={fechaFin} 
            setFechaFin={setFechaFin} 
          />

          <div className="w-px h-8 bg-slate-200 hidden xl:block mx-1"></div>

          {/* Botones de Exportación */}
          <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0">
            <button 
              onClick={exportarExcel} 
              disabled={cargando || sinDatos} 
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"
            >
              <FileText size={18} /> Excel
            </button>
            <button 
              onClick={exportarPDF} 
              disabled={cargando || sinDatos} 
              className="flex-1 sm:flex-none flex justify-center items-center gap-2 px-4 py-2.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 font-medium text-sm shadow-sm"
            >
              <Download size={18} /> PDF
            </button>
          </div>

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
                  <th className="p-4 font-semibold text-right text-orange-300">Retiro Mostrador</th>
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
                      <td className="p-4 text-right text-orange-600 font-medium">{formatearMoneda(fila.valor_mostrador)}</td>
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
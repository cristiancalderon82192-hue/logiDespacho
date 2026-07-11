import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { FileDown, CheckCircle, Package, Truck, AlertCircle } from 'lucide-react';
import { mostrarExito, mostrarError, mostrarInfo, confirmarAccion, alertaModal } from '../utils/alertas';

const ComprobantePublico = () => {
  const { id_factura } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pedido, setPedido] = useState(null);

  useEffect(() => {
    const fetchPedido = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/pedidos/public/${id_factura}`);
        if (!response.ok) {
          throw new Error('No pudimos encontrar este pedido. Verifica el enlace.');
        }
        const data = await response.json();
        setPedido(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPedido();
  }, [id_factura]);

  const descargarComprobante = () => {
    if (!pedido) return;
    
    try {
      const data = pedido;
      const doc = new jsPDF();
      
      let colorHeader = [71, 179, 168]; 
      
      if (data.estado_entrega === 'Entregado Incompleto') {
        colorHeader = [245, 158, 11]; 
      } else if (data.estado_entrega === 'Devolución') {
        colorHeader = [239, 68, 68]; 
      }

      doc.setFillColor(colorHeader[0], colorHeader[1], colorHeader[2]); 
      doc.rect(0, 0, 210, 30, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("COMPROBANTE DE ENTREGA Y CARGA", 105, 18, { align: 'center' });
      
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(12);
      doc.text(`Documento / Factura: ${data.id_factura}`, 14, 45);
      doc.setFont("helvetica", "normal");
      doc.text(`Fecha Agendada: ${data.fecha_agendada || 'N/A'}`, 14, 52);
      doc.setFont("helvetica", "bold");
      
      doc.setTextColor(colorHeader[0], colorHeader[1], colorHeader[2]);
      doc.text(`Estado Actual: ${data.estado_entrega}`, 14, 59);

      autoTable(doc, {
          startY: 65,
          head: [['Datos del Cliente', 'Ubicación']],
          body: [
              [`Nombre: ${data.nombre_cliente}\nTeléfono: ${data.telefono || 'N/A'}`, `Destino: ${data.destino}\nZona: ${data.zona_envio || 'N/A'}`]
          ],
          theme: 'grid',
          headStyles: { fillColor: colorHeader } 
      });

      const bodegas = [];
      let pesoTotalCalculado = 0;

      for(let i=1; i<=8; i++) {
          const pesoBodega = Number(data[`peso_b${i}`] || 0);
          if(pesoBodega > 0) {
              bodegas.push([`Bodega ${i}`, `${pesoBodega} Kg`]);
              pesoTotalCalculado += pesoBodega;
          }
      }
      
      const pesoFinal = (data.total_peso && data.total_peso !== "undefined") ? data.total_peso : pesoTotalCalculado;
      bodegas.push(['PESO TOTAL', `${pesoFinal} Kg`]);

      bodegas.push(['VALOR FACTURA', `$${Number(data.valor_factura || 0).toLocaleString('es-CO')}`]);
      if (data.total_despachado) {
          bodegas.push(['VALOR DESPACHADO', `$${Number(data.total_despachado).toLocaleString('es-CO')}`]);
      }

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Detalle de Carga', 'Valores']],
          body: bodegas,
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      const nombreConductor = data.conductor_nombre || 'No asignado';
      const placaVehiculo = data.vehiculo_placa || 'No asignado';

      autoTable(doc, {
          startY: doc.lastAutoTable.finalY + 10,
          head: [['Conductor', 'Placa Vehículo', 'Observaciones de Entrega']],
          body: [
              [nombreConductor, placaVehiculo, data.observaciones_entrega || data.nota_manual || 'Ninguna']
          ],
          theme: 'grid',
          headStyles: { fillColor: [50, 50, 50] }
      });

      if (data.productos && data.productos.length > 0) {
        const prodData = data.productos.map(p => [
          p.codigo_producto || 'S/N',
          p.descripcion || 'Sin descripción',
          `${p.cantidad_despachada !== null ? p.cantidad_despachada : p.cantidad} ${p.unidad_medida || 'und'}`
        ]);

        autoTable(doc, {
            startY: doc.lastAutoTable.finalY + 10,
            head: [['Código', 'Producto Entregado', 'Cantidad']],
            body: prodData,
            theme: 'grid',
            headStyles: { fillColor: [50, 50, 50] }
        });
      }

      const finalY = doc.lastAutoTable.finalY + 20;
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("Firma de Recibido:", 14, finalY);
      
      if (data.firma_cliente) {
          doc.addImage(data.firma_cliente, 'PNG', 14, finalY + 5, 80, 40);
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
      } else {
          doc.setDrawColor(200, 200, 200);
          doc.rect(14, finalY + 5, 80, 40);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(150, 150, 150);
          doc.text("Sin firma registrada", 30, finalY + 25);
      }

      doc.save(`Comprobante_Entrega_${data.id_factura}.pdf`);

    } catch (error) {
      console.error("Error generando PDF", error);
      mostrarError("Error al generar el comprobante. Por favor, intenta usar otro navegador o dispositivo.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Package className="w-16 h-16 text-blue-500 animate-bounce mb-4" />
        <h2 className="text-xl font-bold text-slate-700">Buscando tu pedido...</h2>
        <p className="text-slate-500 mt-2 text-center">Estamos preparando la información de tu comprobante.</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-lg max-w-md w-full border border-red-100">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-800 mb-2">Ops! Algo salió mal</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <p className="text-sm text-slate-400">Por favor, verifica el enlace que recibiste por WhatsApp.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center p-4 md:p-8 pt-12 md:pt-20">
      <div className="bg-white p-8 md:p-10 rounded-3xl shadow-xl max-w-lg w-full border border-slate-100 text-center animate-fadeIn">
        
        <div className="bg-green-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800 mb-2">¡Pedido Entregado!</h1>
        <p className="text-slate-600 mb-8">
          Hola <b>{pedido.nombre_cliente}</b>, tu pedido con el número de guía <span className="font-mono bg-slate-100 px-2 py-1 rounded font-bold text-slate-700">{pedido.id_factura}</span> ha sido gestionado con éxito.
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 mb-8 text-left border border-slate-100 shadow-inner">
          <h3 className="font-bold text-slate-700 border-b pb-2 mb-3 flex items-center gap-2">
            <Truck size={18} className="text-blue-500"/> Detalles de la Entrega
          </h3>
          <ul className="space-y-3 text-sm text-slate-600">
            <li className="flex justify-between">
              <span className="font-medium text-slate-500">Estado:</span> 
              <span className={`font-bold ${pedido.estado_entrega === 'Entregado Incompleto' ? 'text-orange-600' : 'text-green-600'}`}>
                {pedido.estado_entrega}
              </span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium text-slate-500">Destino:</span> 
              <span className="font-bold text-slate-700 text-right">{pedido.destino}</span>
            </li>
            <li className="flex justify-between">
              <span className="font-medium text-slate-500">Conductor:</span> 
              <span className="font-bold text-slate-700 text-right">{pedido.conductor_nombre || 'No registrado'}</span>
            </li>
          </ul>
        </div>

        <button 
          onClick={descargarComprobante}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-2xl flex justify-center items-center gap-3 transition-all transform hover:scale-[1.02] active:scale-95 shadow-lg shadow-blue-200"
        >
          <FileDown size={24} /> 
          Descargar Comprobante PDF
        </button>

        <p className="mt-8 text-xs text-slate-400 font-medium">
          LogiDespacho © {new Date().getFullYear()} - Sistema de Logística
        </p>
      </div>
    </div>
  );
};

export default ComprobantePublico;

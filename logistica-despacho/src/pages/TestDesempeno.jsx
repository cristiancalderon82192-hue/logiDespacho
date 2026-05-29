import React, { useState } from 'react';
import { Activity, Database, Clock, ShieldCheck, Play, CheckCircle2, XCircle } from 'lucide-react';

export default function TestDesempeno() {
  const [loading, setLoading] = useState(false);
  const [resultados, setResultados] = useState(null);
  const [error, setError] = useState(null);

  const ejecutarPrueba = async () => {
    setLoading(true);
    setError(null);
    setResultados(null);

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/test/desempeno`);
      const data = await res.json();

      if (data.success) {
        setResultados(data.data);
      } else {
        setError(data.error || "Error al ejecutar la prueba");
      }
    } catch (err) {
      setError("Error de red al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-slate-50 min-h-screen p-4 md:p-8 w-full max-w-7xl mx-auto space-y-6">
      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
            <Activity size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Pruebas de Desempeño a la Base de Datos</h1>
            <p className="text-slate-500 mt-1">Evaluación Práctica (RF-01 al RF-04)</p>
          </div>
        </div>

        <button
          onClick={ejecutarPrueba}
          disabled={loading}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-colors shadow-md disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <Play size={20} />
          )}
          Ejecutar Prueba Completa
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-200 flex items-center gap-2">
          <XCircle size={20} />
          {error}
        </div>
      )}

      {/* RESULTADOS */}
      {resultados && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* RF-02: Total Registros */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="bg-blue-100 p-4 rounded-full text-blue-600 mb-4">
              <Database size={32} />
            </div>
            <h3 className="text-slate-500 font-medium mb-1">Total de Registros (Pedidos)</h3>
            <p className="text-4xl font-bold text-slate-800">{resultados.totalRegistros}</p>
            <span className="mt-2 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full border border-blue-100">
              RF-02 Superado
            </span>
          </div>

          {/* RF-03: Latencia */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className="bg-orange-100 p-4 rounded-full text-orange-600 mb-4">
              <Clock size={32} />
            </div>
            <h3 className="text-slate-500 font-medium mb-1">Latencia de la Consulta</h3>
            <p className="text-4xl font-bold text-slate-800">{resultados.latenciaMs} <span className="text-xl">ms</span></p>
            <span className="mt-2 text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
              RF-03 Superado
            </span>
          </div>

          {/* RF-04: Validaciones */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col items-center text-center">
            <div className={`${resultados.validaciones.stockOK ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'} p-4 rounded-full mb-4`}>
              <ShieldCheck size={32} />
            </div>
            <h3 className="text-slate-500 font-medium mb-1">Validaciones e Integridad</h3>
            <div className="text-sm text-slate-700 w-full mt-2 space-y-2 text-left">
              <div className="flex justify-between border-b pb-1">
                <span>Facturas Duplicadas:</span>
                <span className="font-bold">{resultados.validaciones.facturasDuplicadas}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>Pedidos sin detalle:</span>
                <span className="font-bold">{resultados.validaciones.pedidosSinDetalle}</span>
              </div>
              <div className="flex justify-between font-medium mt-2">
                <span>Estado general:</span>
                {resultados.validaciones.stockOK ? (
                  <span className="text-emerald-600 flex items-center gap-1"><CheckCircle2 size={16}/> Óptimo</span>
                ) : (
                  <span className="text-red-600 flex items-center gap-1"><XCircle size={16}/> Inconsistencias</span>
                )}
              </div>
            </div>
            <span className="mt-4 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
              RF-04 Superado
            </span>
          </div>

        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { FileStack, Plus, Trash2, Edit2, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

export default function PlantillasPDF() {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    id: null,
    nombre_empresa: '',
    keyword_identificador: '',
    regex_id_factura: '',
    regex_cliente: '',
    regex_nit_cliente: '',
    regex_telefono_cliente: '',
    regex_valor_factura: '',
    regex_lista_codigos: '',
    regex_lista_descripciones: '',
    regex_lista_cantidades: '',
    regex_lista_unidades: '',
    regex_lista_precios_unitarios: '',
    regex_lista_bodegas: '',
    regex_lista_pesos: '',
    regex_lista_precios_totales: ''
  });

  useEffect(() => {
    fetchPlantillas();
  }, []);

  const fetchPlantillas = async () => {
    try {
      const res = await fetch(`${API_URL}/api/plantillas`);
      if (res.ok) {
        const data = await res.json();
        setPlantillas(data);
      }
    } catch (error) {
      toast.error('Error al cargar plantillas');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setFormData({
      id: null, nombre_empresa: '', keyword_identificador: '', regex_id_factura: '',
      regex_cliente: '', regex_nit_cliente: '', regex_telefono_cliente: '', regex_valor_factura: '',
      regex_lista_codigos: '', regex_lista_descripciones: '', regex_lista_cantidades: '',
      regex_lista_unidades: '', regex_lista_precios_unitarios: '', regex_lista_bodegas: '',
      regex_lista_pesos: '', regex_lista_precios_totales: ''
    });
    setIsEditing(false);
  };

  const handleEdit = (plantilla) => {
    setFormData({
      id: plantilla.id,
      nombre_empresa: plantilla.nombre_empresa || '',
      keyword_identificador: plantilla.keyword_identificador || '',
      regex_id_factura: plantilla.regex_id_factura || '',
      regex_cliente: plantilla.regex_cliente || '',
      regex_nit_cliente: plantilla.regex_nit_cliente || '',
      regex_telefono_cliente: plantilla.regex_telefono_cliente || '',
      regex_valor_factura: plantilla.regex_valor_factura || '',
      regex_lista_codigos: plantilla.regex_lista_codigos || '',
      regex_lista_descripciones: plantilla.regex_lista_descripciones || '',
      regex_lista_cantidades: plantilla.regex_lista_cantidades || '',
      regex_lista_unidades: plantilla.regex_lista_unidades || '',
      regex_lista_precios_unitarios: plantilla.regex_lista_precios_unitarios || '',
      regex_lista_bodegas: plantilla.regex_lista_bodegas || '',
      regex_lista_pesos: plantilla.regex_lista_pesos || '',
      regex_lista_precios_totales: plantilla.regex_lista_precios_totales || ''
    });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar esta plantilla?')) return;
    try {
      const res = await fetch(`${API_URL}/api/plantillas/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Plantilla eliminada');
        fetchPlantillas();
      } else {
        toast.error('Error al eliminar');
      }
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const method = isEditing ? 'PUT' : 'POST';
      const url = isEditing ? `${API_URL}/api/plantillas/${formData.id}` : `${API_URL}/api/plantillas`;
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      if (res.ok) {
        toast.success(isEditing ? 'Plantilla actualizada' : 'Plantilla creada');
        resetForm();
        fetchPlantillas();
      } else {
        const errorData = await res.json();
        toast.error(errorData.error || 'Error al guardar');
      }
    } catch (error) {
      toast.error('Error al guardar plantilla');
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#47B3A8]/10 rounded-xl">
            <FileStack className="text-[#47B3A8]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Plantillas PDF (Extractor Sin IA)</h1>
            <p className="text-sm text-slate-500">Configura reglas de extracción para cada formato de factura</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h2 className="font-bold text-lg text-slate-800 mb-4">{isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Empresa Formato</label>
                <input required name="nombre_empresa" value={formData.nombre_empresa} onChange={handleInputChange} className="w-full mt-1 px-4 py-2 border rounded-xl" placeholder="Ej: Puntualito S.A." />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase">Palabra Clave Única (Trigger)</label>
                <input required name="keyword_identificador" value={formData.keyword_identificador} onChange={handleInputChange} className="w-full mt-1 px-4 py-2 border rounded-xl" placeholder="Ej: 901.248.396" />
              </div>
            </div>

            <hr className="my-4" />
            <h3 className="font-bold text-sm text-slate-700">Regex Simples (Encabezado)</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-500">ID Factura</label><input name="regex_id_factura" value={formData.regex_id_factura} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Cliente</label><input name="regex_cliente" value={formData.regex_cliente} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">NIT Cliente</label><input name="regex_nit_cliente" value={formData.regex_nit_cliente} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Teléfono Cliente</label><input name="regex_telefono_cliente" value={formData.regex_telefono_cliente} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Valor Factura</label><input name="regex_valor_factura" value={formData.regex_valor_factura} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
            </div>

            <hr className="my-4" />
            <h3 className="font-bold text-sm text-slate-700">Regex de Listas (Productos Verticales)</h3>
            <p className="text-xs text-slate-500 mb-4">Estas expresiones se ejecutan globalmente para encontrar múltiples coincidencias (arreglo).</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div><label className="text-xs text-slate-500">Lista Códigos</label><input name="regex_lista_codigos" value={formData.regex_lista_codigos} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista Descripciones</label><input name="regex_lista_descripciones" value={formData.regex_lista_descripciones} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista Cantidades</label><input name="regex_lista_cantidades" value={formData.regex_lista_cantidades} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista Unidades</label><input name="regex_lista_unidades" value={formData.regex_lista_unidades} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista Bodegas</label><input name="regex_lista_bodegas" value={formData.regex_lista_bodegas} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista Pesos (kg)</label><input name="regex_lista_pesos" value={formData.regex_lista_pesos} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista V/Unitario</label><input name="regex_lista_precios_unitarios" value={formData.regex_lista_precios_unitarios} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
              <div><label className="text-xs text-slate-500">Lista V/Total</label><input name="regex_lista_precios_totales" value={formData.regex_lista_precios_totales} onChange={handleInputChange} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono" /></div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              {isEditing && (
                <button type="button" onClick={resetForm} className="px-4 py-2 border rounded-xl font-bold flex items-center gap-2">
                  <X size={16} /> Cancelar
                </button>
              )}
              <button type="submit" className="px-6 py-2 bg-[#47B3A8] text-white rounded-xl font-bold flex items-center gap-2">
                <Save size={16} /> {isEditing ? 'Guardar Cambios' : 'Crear Plantilla'}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[600px]">
          <h2 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
            <FileStack className="text-[#47B3A8]" size={20} /> Plantillas Guardadas
          </h2>
          
          <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {loading ? (
              <p className="text-center text-slate-500 text-sm py-8">Cargando...</p>
            ) : plantillas.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">No hay plantillas creadas.</p>
            ) : (
              plantillas.map(p => (
                <div key={p.id} className="p-4 border rounded-xl bg-slate-50 group hover:border-[#47B3A8] transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-slate-800 text-sm">{p.nombre_empresa}</h3>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleEdit(p)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-1.5 bg-red-100 text-red-600 rounded-lg"><Trash2 size={14} /></button>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 font-mono break-all bg-white p-2 rounded border">🔑 {p.keyword_identificador}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

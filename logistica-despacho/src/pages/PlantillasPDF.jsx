import React, { useState, useEffect } from 'react';
import { FileStack, Plus, Trash2, Edit2, Save, X, Upload, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL;

export default function PlantillasPDF() {
  const [plantillas, setPlantillas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [rawPdfText, setRawPdfText] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [activeField, setActiveField] = useState(null); // Para el Smart Highlighter
  
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formDataFile = new FormData();
    formDataFile.append('pdf', file);

    setIsExtracting(true);
    setRawPdfText('');

    try {
      const res = await fetch(`${API_URL}/api/plantillas/extraer-texto`, {
        method: 'POST',
        body: formDataFile
      });
      const data = await res.json();
      
      if (res.ok) {
        setRawPdfText(data.text);
        toast.success('Texto extraído para pruebas');
      } else {
        toast.error(data.error || 'Error al extraer texto');
      }
    } catch (error) {
      toast.error('Error de red al extraer texto');
    } finally {
      setIsExtracting(false);
      e.target.value = ''; // Reset input
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
    setActiveField(null);
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

  // Live Tester Text Function
  const testRegex = (regexStr, isList) => {
    if (!rawPdfText || !regexStr || regexStr.trim() === '') return null;
    try {
      if (isList) {
        const regex = new RegExp(regexStr, 'gim');
        const matches = [...rawPdfText.matchAll(regex)];
        const results = matches.map(m => (m[1] !== undefined ? m[1] : m[0]).trim());
        if (results.length === 0) return <span className="text-red-500">Sin coincidencias</span>;
        return <span className="text-green-600 font-medium">Atrapados ({results.length}): {results.slice(0,3).join(' | ')}{results.length > 3 ? '...' : ''}</span>;
      } else {
        const regex = new RegExp(regexStr, 'im');
        const match = rawPdfText.match(regex);
        if (!match) return <span className="text-red-500">Sin coincidencia</span>;
        const result = (match[1] !== undefined ? match[1] : match[0]).trim();
        return <span className="text-green-600 font-medium">Atrapado: {result}</span>;
      }
    } catch (e) {
      return <span className="text-red-500">Regex Inválido</span>;
    }
  };

  // Smart Highlighter Renderer
  const renderHighlightedText = () => {
    if (!rawPdfText) return null;
    if (!activeField || !formData[activeField] || formData[activeField].trim() === '') {
      return <pre className="text-[11px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">{rawPdfText}</pre>;
    }

    try {
      const isList = activeField.startsWith('regex_lista_');
      const regexStr = formData[activeField];
      const matches = [];
      let match;
      
      if (isList) {
        const globalRegex = new RegExp(regexStr, 'gim');
        while ((match = globalRegex.exec(rawPdfText)) !== null) {
          const fullMatch = match[0];
          const capturedText = match[1] !== undefined ? match[1] : match[0];
          const localIndex = fullMatch.indexOf(capturedText);
          const absoluteIndex = match.index + (localIndex > -1 ? localIndex : 0);
          
          matches.push({ start: absoluteIndex, end: absoluteIndex + capturedText.length });
          
          if (globalRegex.lastIndex === match.index) {
             globalRegex.lastIndex++;
          }
        }
      } else {
        const regex = new RegExp(regexStr, 'im');
        match = rawPdfText.match(regex);
        if (match) {
          const fullMatch = match[0];
          const capturedText = match[1] !== undefined ? match[1] : match[0];
          const localIndex = fullMatch.indexOf(capturedText);
          const absoluteIndex = match.index + (localIndex > -1 ? localIndex : 0);
          matches.push({ start: absoluteIndex, end: absoluteIndex + capturedText.length });
        }
      }

      if (matches.length === 0) {
        return <pre className="text-[11px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">{rawPdfText}</pre>;
      }

      // Build the highlighted string
      let lastIndex = 0;
      const nodes = [];
      
      matches.forEach((m, i) => {
        if (m.start > lastIndex) {
          nodes.push(<span key={`text-${i}`}>{rawPdfText.substring(lastIndex, m.start)}</span>);
        }
        nodes.push(<mark key={`mark-${i}`} className="bg-yellow-300 text-black px-0.5 rounded shadow-sm font-bold">{rawPdfText.substring(m.start, m.end)}</mark>);
        lastIndex = m.end;
      });
      
      if (lastIndex < rawPdfText.length) {
        nodes.push(<span key={`text-end`}>{rawPdfText.substring(lastIndex)}</span>);
      }

      return <pre className="text-[11px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">{nodes}</pre>;

    } catch (e) {
      return <pre className="text-[11px] font-mono leading-relaxed text-slate-300 whitespace-pre-wrap">{rawPdfText}</pre>;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-[#47B3A8]/10 rounded-xl">
            <FileStack className="text-[#47B3A8]" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-800">Playground de Plantillas PDF</h1>
            <p className="text-sm text-slate-500">Prueba tus reglas de extracción en tiempo real cargando un PDF de muestra</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-lg text-slate-800">{isEditing ? 'Editar Plantilla' : 'Nueva Plantilla'}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Empresa Formato</label>
                  <input required name="nombre_empresa" value={formData.nombre_empresa} onChange={handleInputChange} className="w-full mt-1 px-4 py-2 border rounded-xl" placeholder="Ej: Puntualito S.A." />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">Palabra Clave (Trigger)</label>
                  <input required name="keyword_identificador" value={formData.keyword_identificador} onChange={handleInputChange} className="w-full mt-1 px-4 py-2 border rounded-xl" placeholder="Ej: 901.248.396" />
                </div>
              </div>

              <hr className="my-4" />
              <h3 className="font-bold text-sm text-slate-700">Regex Simples (Encabezado)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold">ID Factura</label>
                  <input name="regex_id_factura" value={formData.regex_id_factura} onChange={handleInputChange} onFocus={() => setActiveField('regex_id_factura')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_id_factura, false)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Cliente</label>
                  <input name="regex_cliente" value={formData.regex_cliente} onChange={handleInputChange} onFocus={() => setActiveField('regex_cliente')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_cliente, false)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">NIT Cliente</label>
                  <input name="regex_nit_cliente" value={formData.regex_nit_cliente} onChange={handleInputChange} onFocus={() => setActiveField('regex_nit_cliente')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_nit_cliente, false)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Teléfono Cliente</label>
                  <input name="regex_telefono_cliente" value={formData.regex_telefono_cliente} onChange={handleInputChange} onFocus={() => setActiveField('regex_telefono_cliente')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_telefono_cliente, false)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Valor Factura</label>
                  <input name="regex_valor_factura" value={formData.regex_valor_factura} onChange={handleInputChange} onFocus={() => setActiveField('regex_valor_factura')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_valor_factura, false)}</div>
                </div>
              </div>

              <hr className="my-4" />
              <h3 className="font-bold text-sm text-slate-700">Regex de Listas (Productos)</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-500 font-bold">Códigos</label>
                  <input name="regex_lista_codigos" value={formData.regex_lista_codigos} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_codigos')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_codigos, true)}</div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs text-slate-500 font-bold">Descripciones</label>
                  <input name="regex_lista_descripciones" value={formData.regex_lista_descripciones} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_descripciones')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_descripciones, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Cantidades</label>
                  <input name="regex_lista_cantidades" value={formData.regex_lista_cantidades} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_cantidades')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_cantidades, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Unidades</label>
                  <input name="regex_lista_unidades" value={formData.regex_lista_unidades} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_unidades')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_unidades, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Bodegas</label>
                  <input name="regex_lista_bodegas" value={formData.regex_lista_bodegas} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_bodegas')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_bodegas, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">Pesos (kg)</label>
                  <input name="regex_lista_pesos" value={formData.regex_lista_pesos} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_pesos')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_pesos, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">V/Unitarios</label>
                  <input name="regex_lista_precios_unitarios" value={formData.regex_lista_precios_unitarios} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_precios_unitarios')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_precios_unitarios, true)}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 font-bold">V/Totales</label>
                  <input name="regex_lista_precios_totales" value={formData.regex_lista_precios_totales} onChange={handleInputChange} onFocus={() => setActiveField('regex_lista_precios_totales')} onBlur={() => setActiveField(null)} className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm font-mono bg-slate-50 focus:ring-2 focus:ring-[#47B3A8] outline-none" />
                  <div className="text-[10px] mt-1 h-3">{testRegex(formData.regex_lista_precios_totales, true)}</div>
                </div>
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
          
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col h-[300px]">
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
                  <div key={p.id} className="p-4 border rounded-xl bg-slate-50 group hover:border-[#47B3A8] transition-colors flex justify-between items-center">
                    <div>
                      <h3 className="font-bold text-slate-800 text-sm">{p.nombre_empresa}</h3>
                      <p className="text-xs text-slate-500 font-mono mt-1">🔑 {p.keyword_identificador}</p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEdit(p)} className="p-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200"><Edit2 size={16} /></button>
                      <button onClick={() => handleDelete(p.id)} className="p-2 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><Trash2 size={16} /></button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA DERECHA: PLAYGROUND INTERACTIVO */}
        <div className="lg:col-span-5 flex flex-col space-y-4">
          <div className="bg-slate-900 rounded-2xl shadow-lg border border-slate-800 p-4 text-white flex flex-col h-full min-h-[600px] sticky top-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <CheckCircle className="text-green-400" size={20} /> Smart Highlighter
              </h2>
              
              <label className="cursor-pointer bg-[#47B3A8] hover:bg-[#3d9c92] transition-colors text-white text-sm font-bold py-2 px-4 rounded-xl flex items-center gap-2">
                <Upload size={16} />
                {isExtracting ? 'Procesando...' : 'Subir PDF'}
                <input type="file" accept="application/pdf" className="hidden" onChange={handleFileUpload} disabled={isExtracting} />
              </label>
            </div>
            
            <div className="flex-1 bg-slate-950 rounded-xl p-4 overflow-auto border border-slate-800 relative">
              {!rawPdfText ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 p-6 text-center">
                  <FileStack size={48} className="mb-4 opacity-20" />
                  <p className="text-sm">Sube un PDF y haz clic en cualquier campo para empezar a resaltar mágicamente la información.</p>
                </div>
              ) : (
                renderHighlightedText()
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

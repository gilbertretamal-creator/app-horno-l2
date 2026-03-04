import { useState, useEffect, useCallback } from 'react';
import { Download, Save, RefreshCw, Search } from 'lucide-react';
import { KilnDiagram } from './components/KilnDiagram';
import { InspectionForm } from './components/InspectionForm';
import { RecentInspections } from './components/RecentInspections';
import { TrendAnalysis } from './components/TrendAnalysis';
import { CalendarPicker } from './components/CalendarPicker';
import { InspectionData, initialData } from './types';
import { supabase } from './lib/supabaseClient';
import { exportToPDF } from './utils/pdfExport';

const STORAGE_KEY = 'kiln_inspection_draft';

function App() {
  const [data, setData] = useState<InspectionData>(initialData);

  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchDate, setSearchDate] = useState<string>('');
  const [recentRecords, setRecentRecords] = useState<{ id: number; fecha: string; tecnico: string }[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [trendRefreshKey, setTrendRefreshKey] = useState(0);

  // Fetch last 5 recent inspections from Supabase
  const fetchRecentRecords = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const { data: rows, error } = await supabase
        .from('inspecciones')
        .select('id, fecha, tecnico')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && rows) {
        // Sort by fecha descending (latest 5), then reverse for oldest→newest display
        const sorted = (rows as any[]).sort((a: any, b: any) => {
          return (a.fecha || '').localeCompare(b.fecha || '');
        });
        setRecentRecords(sorted);
      }
    } catch (e) {
      console.error('Error fetching recent records:', e);
    } finally {
      setIsLoadingRecent(false);
    }
  }, []);

  // Auto-fetch on mount
  useEffect(() => {
    fetchRecentRecords();
  }, [fetchRecentRecords]);

  // Auto-save to local storage on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  const handleChange = (field: keyof InspectionData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    if (window.confirm('¿Está seguro de limpiar el formulario? Se perderán los datos actuales y se volverá al estado inicial.')) {
      setData(initialData);
      setSearchDate('');
      setIsFetching(false);
      setIsSaving(false);
      setIsExporting(false);
      localStorage.clear();
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const dateStr = data.date ? data.date : new Date().toISOString().split('T')[0];
    const filename = `Inspeccion_Horno_L2_${dateStr}.pdf`;

    const success = await exportToPDF('report-container', filename);
    setIsExporting(false);
    if (!success) {
      alert('Error al generar PDF.');
    }
  };

  const handleSaveSupabase = async () => {
    setIsSaving(true);

    // Map data to snake_case for Supabase, matching actual Schema
    const payload: Record<string, any> = {};
    // Explicit Database Mapping schema
    const exactMappings: Record<string, string> = {
      date: 'fecha',
      technician: 'tecnico',
      feed: 'alimentacion',
      rpm: 'rpm',
      observations: 'observaciones',
      // Llantas
      innerI: 'temp_llanta_i',
      innerII: 'temp_llanta_ii',
      innerIII: 'temp_llanta_iii',
      innerIV: 'temp_llanta_iv',
      // Manto Andes
      andesI: 'temp_manto_andes_i',
      andesII: 'temp_manto_andes_ii',
      andesIII: 'temp_manto_andes_iii',
      andesIV: 'temp_manto_andes_iv',
      // Manto Pacifico
      pacificoI: 'temp_manto_pacifico_i',
      pacificoII: 'temp_manto_pacifico_ii',
      pacificoIII: 'temp_manto_pacifico_iii',
      pacificoIV: 'temp_manto_pacifico_iv'
    };

    const textFields = ['date', 'technician', 'feed', 'rpm', 'observations'];

    for (const [key, value] of Object.entries(data)) {
      if (exactMappings[key]) {
        if (textFields.includes(key)) {
          payload[exactMappings[key]] = value;
        } else {
          // Parse numeric values strictly
          payload[exactMappings[key]] = value === '' ? null : Number(value);
        }
      } else if (
        key.startsWith('migration') ||
        key.startsWith('temp') ||
        key.startsWith('empuje')
      ) {
        // Convert camelCase with Roman numerals to snake_case.
        const mappedKey = key.replace(/(I{1,3}|IV|V)(_[A-Z]+)?$/, (match) => '_' + match.toLowerCase());
        payload[mappedKey] = value === '' ? null : Number(value);
      }
    }

    const { error } = await supabase.from('inspecciones').insert([payload]);
    setIsSaving(false);

    if (!error) {
      setData(initialData);
      localStorage.removeItem(STORAGE_KEY);
      fetchRecentRecords(); // Refresh dashboard after save
      setTrendRefreshKey(k => k + 1); // Refresh trends
    } else {
      console.error(error);
      alert('Hubo un problema guardando en Supabase. Revisa la consola para más detalles.');
    }
  };

  // Shared reverse-mapping logic used by both fetch-by-date and load-by-id
  const reverseMappings: Record<string, string> = {
    fecha: 'date',
    tecnico: 'technician',
    alimentacion: 'feed',
    rpm: 'rpm',
    observaciones: 'observations',
    temp_llanta_i: 'innerI',
    temp_llanta_ii: 'innerII',
    temp_llanta_iii: 'innerIII',
    temp_llanta_iv: 'innerIV',
    temp_manto_andes_i: 'andesI',
    temp_manto_andes_ii: 'andesII',
    temp_manto_andes_iii: 'andesIII',
    temp_manto_andes_iv: 'andesIV',
    temp_manto_pacifico_i: 'pacificoI',
    temp_manto_pacifico_ii: 'pacificoII',
    temp_manto_pacifico_iii: 'pacificoIII',
    temp_manto_pacifico_iv: 'pacificoIV'
  };

  const mapRowToFormData = (row: Record<string, any>) => {
    const mappedData: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (key === 'id' || key === 'created_at') continue;
      const safeValue = value != null ? String(value) : '';
      if (reverseMappings[key]) {
        mappedData[reverseMappings[key]] = safeValue;
      } else {
        const originalKey = key.replace(/_(i{1,3}|iv|v)(_[a-z]+)?$/, (match) => match.substring(1).toUpperCase());
        mappedData[originalKey] = safeValue;
      }
    }
    let safeDate = mappedData.date || initialData.date;
    try {
      safeDate = new Date(safeDate).toISOString().split('T')[0];
    } catch { /* keep as-is */ }
    return { ...initialData, ...mappedData, date: safeDate } as InspectionData;
  };

  const handleLoadById = async (id: number) => {
    try {
      const { data: rows, error } = await supabase
        .from('inspecciones')
        .select('*')
        .eq('id', id)
        .limit(1);
      if (error) throw error;
      if (rows && rows.length > 0) {
        setData(mapRowToFormData(rows[0]));
        setSearchDate(''); // Clear calendar selection to avoid confusion
      }
    } catch (err: any) {
      console.error('Error loading record:', err);
      alert(`Error al cargar el registro: ${err.message || 'Error desconocido'}`);
    }
  };

  const handleFetchHistorical = async () => {
    setIsFetching(true);
    try {
      let query = supabase
        .from('inspecciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);
      if (searchDate) {
        query = query.eq('fecha', searchDate);
      }
      const { data: results, error } = await query;
      if (error) throw error;
      if (results && results.length > 0) {
        setData(mapRowToFormData(results[0]));
      } else {
        setData({ ...initialData, date: searchDate || initialData.date });
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      alert(`Error al consultar los datos: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <div className="min-h-screen font-sans text-gray-800 flex justify-center">
      <div className="w-full max-w-7xl bg-white/85 p-4 md:p-8 backdrop-blur-md shadow-2xl min-h-screen">
        <div className="space-y-6">

          {/* Historical Fetch Panel */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-blue-50/90 p-4 rounded-lg border border-blue-200 gap-4 no-print shadow-sm">
            <div className="text-blue-900">
              <span className="font-semibold block md:inline">Consultar Histórico:</span> <span className="text-sm">Recupera la última inspección o filtra por fecha.</span>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <CalendarPicker
                value={searchDate}
                onChange={setSearchDate}
                refreshKey={trendRefreshKey}
              />
              <button
                onClick={handleFetchHistorical}
                disabled={isFetching}
                className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded transition disabled:opacity-50 ${isFetching ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
              >
                <Search size={18} />
                {isFetching ? 'Buscando...' : 'Consultar'}
              </button>
            </div>
          </div>

          {/* Recent Inspections Dashboard */}
          <RecentInspections
            records={recentRecords}
            isLoading={isLoadingRecent}
            onLoad={handleLoadById}
          />

          {/* Trend Analysis Panel */}
          <TrendAnalysis refreshKey={trendRefreshKey} />

          {/* Header acts as Control Panel */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-md border border-gray-200 gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inspección Horno de Cal Arauco L-2</h1>
              <p className="text-sm text-gray-500">Digitalización de Ficha Técnica</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleReset}
                disabled={false} // Always enabled
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
              >
                <RefreshCw size={18} />
                Limpiar Formulario
              </button>
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
              >
                <Download size={18} />
                {isExporting ? 'Generando...' : 'Exportar PDF'}
              </button>
              <button
                onClick={handleSaveSupabase}
                disabled={isSaving || !data.date || !data.technician}
                className={`flex items-center gap-2 px-4 py-2 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${!data.date || !data.technician
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700'
                  }`}
              >
                <Save size={18} />
                {isSaving ? 'Guardando...' : 'Guardar Inspección'}
              </button>
            </div>
            {(!data.date || !data.technician) && (
              <p className="text-xs text-red-500 mt-1 text-right">Complete Fecha y Técnico para habilitar el guardado.</p>
            )}
          </div>

          {/* Report Container (for PDF export) */}
          <div id="report-container" className="bg-white/95 p-2 md:p-6 rounded-xl shadow-2xl border border-gray-200">
            <div className="text-center mb-6 hidden show-on-print">
              <h1 className="text-3xl font-bold uppercase tracking-wider">Inspección Horno de Cal Arauco L-2</h1>
            </div>

            <KilnDiagram data={data} onChange={handleChange} />

            <div className="mt-8">
              <InspectionForm data={data} onChange={handleChange} />
            </div>
            <div className="mt-4 text-right">
              <p className="text-[10px] text-gray-400 italic">Created by Gilbert Retamal Silva</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default App;

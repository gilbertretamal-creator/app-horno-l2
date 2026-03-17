import { useState, useEffect, useCallback, useRef } from 'react';
import { Download, Save, RefreshCw, Search, LogOut, KeyRound, ArrowLeftCircle, Trash2 } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { KilnDiagram } from './components/KilnDiagram';
import { InspectionForm } from './components/InspectionForm';
import { RecentInspections } from './components/RecentInspections';
import { RecentMovements } from './components/RecentMovements';
import { TrendAnalysis } from './components/TrendAnalysis';
import { CalendarPicker } from './components/CalendarPicker';
import { LandingPage } from './components/LandingPage';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { MovementAdjustments } from './components/MovementAdjustments';
import { OfflineIndicator } from './components/OfflineIndicator';
import { showConfirm, useConfirmDialog } from './components/ConfirmDialog';
import { InspectionData, initialData, AjustesMecanicos, initialAjustes, StationAdjustment } from './types';
import { supabase } from './lib/supabaseClient';
import { exportToPDF } from './utils/pdfExport';
import { addOfflineInspection, syncOfflineInspections, getOfflineInspections } from './utils/offlineStore';
import './components/LandingPage.css';
import './App.css';

const STORAGE_KEY = 'kiln_inspection_draft';

type AppView = 'landing' | 'app';

function App() {
  const [view, setView] = useState<AppView>('landing');
  const [isGuest, setIsGuest] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const confirmDialog = useConfirmDialog();

  const [data, setData] = useState<InspectionData>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [searchDate, setSearchDate] = useState<string>('');
  const [recentRecords, setRecentRecords] = useState<{ id: number; fecha: string; turno: string; tecnico: string }[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [trendRefreshKey, setTrendRefreshKey] = useState(0);
  const [visibleStations, setVisibleStations] = useState<boolean[]>([false, false, false, false]);
  const [loadedRecordId, setLoadedRecordId] = useState<number | null>(null);

  const handleToggleStation = (idx: number) => {
    setVisibleStations(prev => {
      const next = [...prev];
      next[idx] = !next[idx];
      return next;
    });
  };

  const handleAjusteChange = (station: 'I' | 'II' | 'III' | 'IV', pos: keyof StationAdjustment, value: string) => {
    setData(prev => ({
      ...prev,
      ajustesMecanicos: {
        ...prev.ajustesMecanicos,
        [station]: { ...prev.ajustesMecanicos[station], [pos]: value }
      }
    }));
  };

  // Check for existing session on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setView('app');
        setIsGuest(false);
      }
    });

    // Handle online sync automatically
    const handleOnlineSync = async () => {
      if (getOfflineInspections().length > 0) {
        console.log("Restored connection, attempting to sync pending inspections...");
        const result = await syncOfflineInspections();
        if (result.success > 0) {
          toast.success(`Se sincronizaron ${result.success} inspecciones pendientes.`);
          fetchRecentRecords();
          setTrendRefreshKey(k => k + 1);
          window.dispatchEvent(new Event('offline-sync-complete'));
        }
        if (result.failed > 0) {
          toast.error(`Falló la sincronización de ${result.failed} registros pendientes.`);
        }
      }
    };

    window.addEventListener('online', handleOnlineSync);
    return () => {
      window.removeEventListener('online', handleOnlineSync);
    };
  }, []);

  // Handle login success
  const handleLoginSuccess = () => {
    setIsGuest(false);
    setView('app');
  };

  // Handle guest access
  const handleGuestAccess = () => {
    setIsGuest(true);
    setView('app');
  };

  // Handle logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    setView('landing');
    setIsGuest(false);
    setData(initialData);
    setSearchDate('');
    setLoadedRecordId(null);
  };

  // Handle exit (guest)
  const handleExit = () => {
    setView('landing');
    setIsGuest(false);
    setData(initialData);
    setSearchDate('');
    setLoadedRecordId(null);
  };

  // Fetch last 5 recent inspections from Supabase
  const fetchRecentRecords = useCallback(async () => {
    setIsLoadingRecent(true);
    try {
      const { data: rows, error } = await supabase
        .from('inspecciones')
        .select('id, fecha, turno, tecnico')
        .order('created_at', { ascending: false })
        .limit(5);
      if (!error && rows) {
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

  // Auto-fetch on mount when in app view
  useEffect(() => {
    if (view === 'app') {
      fetchRecentRecords();
    }
  }, [view, fetchRecentRecords]);

  // Auto-generate structured observations from movement adjustments
  const prevAjustesRef = useRef<string>(JSON.stringify(initialAjustes));
  useEffect(() => {
    const ajustes = data.ajustesMecanicos;
    const ajustesStr = JSON.stringify(ajustes);

    // Only run when ajustes actually changed
    if (ajustesStr === prevAjustesRef.current) return;
    prevAjustesRef.current = ajustesStr;

    const stations = ['I', 'II', 'III', 'IV'] as const;
    const lines: string[] = [];

    for (const st of stations) {
      // Polín Norte = AN (Andes/Norte) + PN (Pac./Norte)
      const anVal = parseFloat(ajustes[st].AN);
      const pnVal = parseFloat(ajustes[st].PN);
      const norteHas = (!isNaN(anVal) && anVal !== 0) || (!isNaN(pnVal) && pnVal !== 0);
      if (norteHas) {
        const parts: string[] = [];
        if (!isNaN(anVal) && anVal !== 0) {
          parts.push(`${anVal > 0 ? 'ingresando' : 'retirando'} ${Math.abs(anVal)}mm lado Andes/Norte`);
        }
        if (!isNaN(pnVal) && pnVal !== 0) {
          parts.push(`${pnVal > 0 ? 'ingresando' : 'retirando'} ${Math.abs(pnVal)}mm lado Pac./Norte`);
        }
        // Spanish grammar: 'y' → 'e' before words starting with 'i' (e.g. 'e ingresando')
        const connector = parts.length === 2 && parts[1].startsWith('i') ? ' e ' : ' y ';
        lines.push(`Se ajusta polín norte de estación ${st}, ${parts.join(connector)}.`);
      }

      // Polín Sur = AS (Andes/Sur) + PS (Pac./Sur)
      const asVal = parseFloat(ajustes[st].AS);
      const psVal = parseFloat(ajustes[st].PS);
      const surHas = (!isNaN(asVal) && asVal !== 0) || (!isNaN(psVal) && psVal !== 0);
      if (surHas) {
        const parts: string[] = [];
        if (!isNaN(asVal) && asVal !== 0) {
          parts.push(`${asVal > 0 ? 'ingresando' : 'retirando'} ${Math.abs(asVal)}mm lado Andes/Sur`);
        }
        if (!isNaN(psVal) && psVal !== 0) {
          parts.push(`${psVal > 0 ? 'ingresando' : 'retirando'} ${Math.abs(psVal)}mm lado Pac./Sur`);
        }
        const connector = parts.length === 2 && parts[1].startsWith('i') ? ' e ' : ' y ';
        lines.push(`Se ajusta polín sur de estación ${st}, ${parts.join(connector)}.`);
      }
    }

    const autoText = lines.length > 0
      ? `AJUSTES MECÁNICOS:\n${lines.join('\n')}`
      : '';

    setData(prev => {
      // Remove any existing auto-generated block (support both old and new markers)
      let cleanObs = prev.observations
        .replace(/\n?\[AJUSTES_INI\][\s\S]*?\[AJUSTES_FIN\]\n?/g, '')
        .replace(/\n?AJUSTES MECÁNICOS:\n(?:Se ajusta polín (?:norte|sur) de estación (?:I|II|III|IV),.*\n?)+/g, '')
        .trim();
      const newObs = autoText ? (cleanObs ? `${cleanObs}\n\n${autoText}` : autoText) : cleanObs;
      if (newObs === prev.observations) return prev;
      return { ...prev, observations: newObs };
    });
  }, [data.ajustesMecanicos]);

  // Auto-save to local storage on change (only for authenticated users)
  useEffect(() => {
    if (!isGuest) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    }
  }, [data, isGuest]);

  const handleChange = (field: keyof InspectionData, value: string) => {
    // Normalize comma to dot for numeric empuje (desplazamiento) fields
    if (typeof field === 'string' && field.startsWith('empuje')) {
      value = value.replace(',', '.');
    }
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleReset = async () => {
    const confirmed = await showConfirm({
      title: 'Limpiar Formulario',
      message: '¿Está seguro de limpiar el formulario? Se perderán los datos actuales y se volverá al estado inicial.',
      confirmText: 'Sí, limpiar',
      cancelText: 'Cancelar',
      type: 'danger'
    });
    if (confirmed) {
      setData(initialData);
      setSearchDate('');
      setIsFetching(false);
      setIsSaving(false);
      setIsExporting(false);
      setLoadedRecordId(null);
      localStorage.clear();
      toast.success('Formulario limpiado correctamente.');
    }
  };

  const handleExportPDF = async () => {
    setIsExporting(true);
    const dateStr = data.date ? data.date : new Date().toISOString().split('T')[0];
    const filename = `Inspeccion_Horno_L2_${dateStr}.pdf`;

    const success = await exportToPDF('report-container', filename);
    setIsExporting(false);
    if (!success) {
      toast.error('Error al generar el PDF. Intente nuevamente.');
    }
  };

  const handleSaveSupabase = async () => {
    setIsSaving(true);

    try {
      const payload: Record<string, any> = {};
      // Include ajustes_mecanicos as JSON
      payload['ajustes_mecanicos'] = data.ajustesMecanicos;
      const exactMappings: Record<string, string> = {
        date: 'fecha',
        turno: 'turno',
        technician: 'tecnico',
        feed: 'alimentacion',
        rpm: 'rpm',
        observations: 'observaciones',
        innerI: 'temp_llanta_i',
        innerII: 'temp_llanta_ii',
        innerIII: 'temp_llanta_iii',
        innerIV: 'temp_llanta_iv',
        andesI: 'temp_manto_andes_i',
        andesII: 'temp_manto_andes_ii',
        andesIII: 'temp_manto_andes_iii',
        andesIV: 'temp_manto_andes_iv',
        pacificoI: 'temp_manto_pacifico_i',
        pacificoII: 'temp_manto_pacifico_ii',
        pacificoIII: 'temp_manto_pacifico_iii',
        pacificoIV: 'temp_manto_pacifico_iv'
      };

      const textFields = ['date', 'turno', 'technician', 'feed', 'rpm', 'observations'];

      for (const [key, value] of Object.entries(data)) {
        if (exactMappings[key]) {
          if (textFields.includes(key)) {
            payload[exactMappings[key]] = value;
          } else {
            payload[exactMappings[key]] = value === '' ? null : Number(value);
          }
        } else if (
          key.startsWith('migration') ||
          key.startsWith('temp') ||
          key.startsWith('empuje')
        ) {
          const mappedKey = key.replace(/(I{1,3}|IV|V)(_[A-Z]+)?$/, (match) => '_' + match.toLowerCase());
          payload[mappedKey] = value === '' ? null : Number(value);
        }
      }

      // Check if a record with the same date already exists
      let existingId: number | null = loadedRecordId;
      if (!existingId && data.date) {
        const { data: existing, error: checkError } = await supabase
          .from('inspecciones')
          .select('id')
          .eq('fecha', data.date)
          .eq('turno', data.turno || 'Día')
          .limit(1);

        if (checkError) {
          console.error('Error checking existing record:', checkError);
          toast.error('Error al verificar registros existentes.');
          return;
        }

        if (existing && existing.length > 0) {
          existingId = existing[0].id;
          const userChoice = await showConfirm({
            title: 'Registro Existente',
            message: `Ya existe una inspección registrada para la fecha ${data.date} (Turno: ${data.turno || 'Día'}). ¿Desea reemplazar el registro existente?`,
            confirmText: 'Reemplazar',
            cancelText: 'Cancelar',
            type: 'warning'
          });

          if (!userChoice) {
            return;
          }
        }
      }

      let error;
      let isOfflineSave = false;

      if (!navigator.onLine) {
         // Force offline save if we know there is no connection
         addOfflineInspection(payload as any);
         window.dispatchEvent(new Event('offline-save'));
         isOfflineSave = true;
      } else {
        if (existingId !== null) {
          // Upsert: include the existing id so Supabase knows which row to replace
          payload['id'] = existingId;
          const result = await supabase
            .from('inspecciones')
            .upsert(payload, { onConflict: 'id' });
          error = result.error;
        } else {
          // Insert new record
          const result = await supabase.from('inspecciones').insert([payload]);
          error = result.error;
        }

        // If fetch failed due to network error despite `navigator.onLine` being true
        if (error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
           console.warn('Network error detected during save. Falling back to offline storage.');
           delete payload['id']; // Remove ID if we are queueing a new insert since offline sync only does inserts currently
           addOfflineInspection(payload as any);
           window.dispatchEvent(new Event('offline-save'));
           error = null; // Clear error since we handled it
           isOfflineSave = true;
        }
      }

      if (!error) {
        setData(initialData);
        setLoadedRecordId(null);
        localStorage.removeItem(STORAGE_KEY);
        
        if (isOfflineSave) {
           toast.warning('Guardado localmente. Se sincronizará automáticamente al recuperar conexión.');
        } else {
           fetchRecentRecords();
           setTrendRefreshKey(k => k + 1);
           toast.success(existingId !== null ? 'Inspección reemplazada exitosamente.' : 'Inspección guardada exitosamente.');
        }
      } else {
        console.error('Supabase save error:', error);
        toast.error('Hubo un problema guardando en Supabase. Revisa la consola para más detalles.');
      }
    } catch (err) {
      console.error('Unexpected error in handleSaveSupabase:', err);
      // Fallback for unexpected fetch errors
      if (err instanceof TypeError && err.message.includes('fetch')) {
         toast.warning('Error de red detectado. Verifica tu conexión.');
      } else {
         toast.error(`Error inesperado al guardar: ${err instanceof Error ? err.message : 'Error desconocido'}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!loadedRecordId) return;

    const confirmed = await showConfirm({
      title: 'Eliminar Inspección',
      message: '¿Está seguro que desea eliminar permanentemente esta inspección? Esta acción no se puede deshacer.',
      confirmText: 'Sí, eliminar',
      cancelText: 'Cancelar',
      type: 'danger'
    });

    if (confirmed) {
      try {
        const { error } = await supabase
          .from('inspecciones')
          .delete()
          .eq('id', loadedRecordId);

        if (error) throw error;

        setData(initialData);
        setSearchDate('');
        setLoadedRecordId(null);
        localStorage.removeItem(STORAGE_KEY);
        fetchRecentRecords();
        setTrendRefreshKey(k => k + 1);
        toast.success('Inspección eliminada exitosamente.');
      } catch (err: any) {
        console.error('Error deleting record:', err);
        toast.error(`Error al eliminar: ${err.message || 'Error desconocido'}`);
      }
    }
  };

  const reverseMappings: Record<string, string> = {
    fecha: 'date',
    turno: 'turno',
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
    let parsedAjustes: AjustesMecanicos = {
      I: { ...initialAjustes.I },
      II: { ...initialAjustes.II },
      III: { ...initialAjustes.III },
      IV: { ...initialAjustes.IV }
    };
    for (const [key, value] of Object.entries(row)) {
      if (key === 'id' || key === 'created_at') continue;
      if (key === 'ajustes_mecanicos') {
        if (value) {
          try {
            const parsed = typeof value === 'string' ? JSON.parse(value) : value;
            if (parsed && typeof parsed === 'object') {
              parsedAjustes = {
                I: { ...parsedAjustes.I, ...(parsed.I || {}) },
                II: { ...parsedAjustes.II, ...(parsed.II || {}) },
                III: { ...parsedAjustes.III, ...(parsed.III || {}) },
                IV: { ...parsedAjustes.IV, ...(parsed.IV || {}) },
              };
            }
          } catch { /* keep initial */ }
        }
        continue;
      }
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
    return { ...initialData, ...mappedData, date: safeDate, ajustesMecanicos: parsedAjustes } as InspectionData;
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
        setSearchDate('');
        setLoadedRecordId(id);
      }
    } catch (err: any) {
      console.error('Error loading record:', err);
      toast.error(`Error al cargar el registro: ${err.message || 'Error desconocido'}`);
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
        setLoadedRecordId(results[0].id);
      } else {
        setData({ ...initialData, date: searchDate || initialData.date });
        setLoadedRecordId(null);
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      toast.error(`Error al consultar los datos: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsFetching(false);
    }
  };

  // ==================== LANDING PAGE VIEW ====================
  if (view === 'landing') {
    return (
      <LandingPage
        onLoginSuccess={handleLoginSuccess}
        onGuestAccess={handleGuestAccess}
      />
    );
  }

  // ==================== APP VIEW ====================
  return (
    <div className="min-h-screen font-sans text-gray-800 flex justify-center">
      <div className="w-full max-w-7xl bg-white/85 p-4 md:p-8 backdrop-blur-md shadow-2xl min-h-screen">
        <div className="space-y-6">

          {/* App Header Bar */}
          <div className="app-header-bar no-print">
            <div className="app-header-bar-left">
              <svg className="app-header-bar-logo" viewBox="0 0 100 100" fill="none">
                <circle cx="50" cy="50" r="48" fill="#16a34a" />
                <circle cx="50" cy="50" r="42" fill="white" />
                <circle cx="50" cy="50" r="38" fill="#16a34a" />
                <polygon points="50,18 35,42 65,42" fill="white" />
                <polygon points="50,30 30,55 70,55" fill="white" />
                <polygon points="50,42 25,68 75,68" fill="white" />
                <rect x="45" y="65" width="10" height="14" fill="white" rx="2" />
              </svg>
              <span className="app-header-bar-title">ARAUCO L-2</span>
              <span className={`app-header-bar-badge ${isGuest ? 'app-header-bar-badge-guest' : 'app-header-bar-badge-tech'}`}>
                {isGuest ? 'Invitado' : 'Técnico'}
              </span>
            </div>
            <div className="app-header-bar-right">
              {!isGuest && (
                <button
                  className="app-header-btn app-header-btn-password"
                  onClick={() => setShowChangePassword(true)}
                >
                  <KeyRound size={14} />
                  Contraseña
                </button>
              )}
              {isGuest ? (
                <button
                  className="app-header-btn app-header-btn-exit"
                  onClick={handleExit}
                >
                  <ArrowLeftCircle size={14} />
                  Exit
                </button>
              ) : (
                <button
                  className="app-header-btn app-header-btn-logout"
                  onClick={handleLogout}
                >
                  <LogOut size={14} />
                  Logout
                </button>
              )}
            </div>
          </div>

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

          {/* Recent Movements */}
          <RecentMovements refreshKey={trendRefreshKey} onLoad={handleLoadById} />

          {/* Trend Analysis Panel */}
          <TrendAnalysis refreshKey={trendRefreshKey} />

          {/* Header acts as Control Panel */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-md border border-gray-200 gap-4 no-print">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Inspección Horno de Cal Arauco L-2</h1>
              <p className="text-sm text-gray-500">Digitalización de Ficha Técnica</p>
            </div>
            <div className="flex flex-wrap gap-3">
              {!isGuest && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition"
                >
                  <RefreshCw size={18} />
                  Limpiar Formulario
                </button>
              )}
              <button
                onClick={handleExportPDF}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition disabled:opacity-50"
              >
                <Download size={18} />
                {isExporting ? 'Generando...' : 'Exportar PDF'}
              </button>
              {!isGuest && (
                <button
                  onClick={handleSaveSupabase}
                  disabled={isSaving || !data.date || !data.technician}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${!data.date || !data.technician
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  <Save size={18} />
                  {isSaving ? 'Guardando...' : (loadedRecordId !== null ? 'Guardar Cambios' : 'Guardar Inspección')}
                </button>
              )}
              {!isGuest && loadedRecordId !== null && (
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition"
                >
                  <Trash2 size={18} />
                  Eliminar Inspección
                </button>
              )}
            </div>
            {!isGuest && (!data.date || !data.technician) && (
              <p className="text-xs text-red-500 mt-1 text-right">Complete Fecha y Técnico para habilitar el guardado.</p>
            )}
          </div>

          {/* Report Container (for PDF export) */}
          <div id="report-container" className="bg-white/95 p-2 md:p-6 rounded-xl shadow-2xl border border-gray-200">
            <div className="text-center mb-6 hidden show-on-print">
              <h1 className="text-3xl font-bold uppercase tracking-wider">Inspección Horno de Cal Arauco L-2</h1>
            </div>

            <KilnDiagram
              data={data}
              onChange={handleChange}
              readOnly={isGuest}
              ajustes={data.ajustesMecanicos}
              visibleStations={visibleStations}
              onAjusteChange={handleAjusteChange}
            />

            {/* Movement Adjustments Toggle Panel */}
            {!isGuest && (
              <MovementAdjustments
                ajustes={data.ajustesMecanicos}
                visibleStations={visibleStations}
                onToggleStation={handleToggleStation}
                readOnly={isGuest}
              />
            )}

            <div className="mt-8">
              <InspectionForm data={data} onChange={handleChange} readOnly={isGuest} />
            </div>
            <div className="mt-4 text-right">
              <p className="text-[10px] text-gray-400 italic">Created by Gilbert Retamal Silva</p>
            </div>
          </div>

        </div>
      </div>

      {/* Change Password Modal */}
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}

      {/* Confirm Dialog */}
      {confirmDialog}

      {/* Offline Indicator */}
      <OfflineIndicator />

      {/* Toast Notifications */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 4000,
          style: {
            fontFamily: 'inherit',
          },
        }}
        richColors
      />
    </div>
  );
}

export default App;

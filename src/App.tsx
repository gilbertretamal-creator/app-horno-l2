import { useState, useEffect, useRef } from 'react';
import { Download, Save, RefreshCw, Search, LogOut, KeyRound, ArrowLeftCircle, Trash2, Table2 } from 'lucide-react';
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
import { exportToCSV } from './utils/csvExport';
import './components/LandingPage.css';
import './App.css';
import { useQuery, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [trendRefreshKey, setTrendRefreshKey] = useState(0);
  const [visibleStations, setVisibleStations] = useState<boolean[]>([false, false, false, false]);
  const [loadedRecordId, setLoadedRecordId] = useState<number | null>(null);
  const [loadedRecordCreatedAt, setLoadedRecordCreatedAt] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'tecnico' | 'supervisor' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isInitializedRef = useRef(false);
  // ── Track last known session identity to avoid redundant setState ──
  const lastUserIdRef = useRef<string | null>(null);
  const lastAccessTokenRef = useRef<string | null>(null);

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

  // ====== AUTH INITIALIZATION ======
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (session && session.user) {
          const { data: perfil, error: perfilError } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', session.user.id)
            .single();

          // PGRST116 = row not found (user exists but no profile yet)
          if (perfilError && perfilError.code !== 'PGRST116') throw perfilError;

          if (isMounted) {
            setView('app');
            setIsGuest(false);
            setUserRole(perfil?.rol || 'tecnico');
            // Record this session identity
            lastUserIdRef.current = session.user.id;
            lastAccessTokenRef.current = session.access_token;
          }
        } else {
          if (isMounted) {
            setView('landing');
            setUserRole(null);
          }
        }
      } catch (error) {
        console.error('Error crítico de Auth:', error);
        if (isMounted) {
          setView('landing');
          setUserRole(null);
        }
      } finally {
        if (isMounted) {
          isInitializedRef.current = true;
          setIsLoading(false); // LIBERA EL LOADER
        }
      }
    };

    initAuth();

    // Listener reactive: ONLY handles changes AFTER initialization
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Skip the initial INITIAL_SESSION event to avoid race condition with initAuth
      if (!isInitializedRef.current) return;

      // Handle token expiry / forced logout cleanly
      if (event === 'SIGNED_OUT' || !session) {
        if (isMounted) {
          setUserRole(null);
          setView('landing');
          setIsGuest(false);
          setData(initialData);
          setLoadedRecordId(null);
          setLoadedRecordCreatedAt(null);
        }
        return;
      }

      // TOKEN_REFRESHED: session is still valid but token rotated.
      // GUARD: Only update state if the user identity actually changed.
      // This prevents the re-render storm on every token rotation.
      if (event === 'TOKEN_REFRESHED') {
        const sameUser = lastUserIdRef.current === session.user.id;
        const sameToken = lastAccessTokenRef.current === session.access_token;
        if (sameUser && sameToken) return; // Nothing changed – skip all setState
        lastAccessTokenRef.current = session.access_token;
        try {
          const { data: perfil } = await supabase
            .from('perfiles')
            .select('rol')
            .eq('id', session.user.id)
            .single();
          if (isMounted && perfil) setUserRole(perfil.rol as any);
        } catch { /* keep existing role */ }
        return;
      }

      // SIGNED_IN: nueva sesión posterior (ej: login desde LandingPage)
      try {
        const { data: perfil, error } = await supabase
          .from('perfiles')
          .select('rol')
          .eq('id', session.user.id)
          .single();
        if (error && error.code !== 'PGRST116') throw error;
        if (isMounted) {
          setUserRole(perfil?.rol || 'tecnico');
          setView('app');
          setIsGuest(false);
        }
      } catch (e) {
        console.error('Error al obtener rol en onAuthStateChange:', e);
        if (isMounted) setUserRole('tecnico');
      }
    });

    // ====== ONLINE SYNC ======
    const handleOnlineSync = async () => {
      if (getOfflineInspections().length > 0) {
        console.log('Restored connection, attempting to sync pending inspections...');
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
      isMounted = false;
      window.removeEventListener('online', handleOnlineSync);
      authListener.subscription.unsubscribe();
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
    setLoadedRecordCreatedAt(null);
  };

  // Handle exit (guest)
  const handleExit = () => {
    setView('landing');
    setIsGuest(false);
    setData(initialData);
    setSearchDate('');
    setLoadedRecordId(null);
    setLoadedRecordCreatedAt(null);
  };

  // Fetch last 5 recent inspections using React Query
  const { data: recentRecords = [], isLoading: isLoadingRecent, isError: isErrorRecent } = useQuery({
    queryKey: ['inspecciones', 'recent'],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from('inspecciones')
        .select('id, fecha, turno, tecnico')
        .order('created_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!rows) return [];
      return (rows as any[]).sort((a: any, b: any) =>
        (a.fecha || '').localeCompare(b.fecha || '')
      );
    },
    enabled: view === 'app' // Only fetch when in the main app view
  });

  const fetchRecentRecords = () => {
    queryClient.invalidateQueries({ queryKey: ['inspecciones', 'recent'] });
  };

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
      setLoadedRecordCreatedAt(null);
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

  const handleExportCSV = async () => {
    try {
      const { data: rows, error } = await supabase
        .from('inspecciones')
        .select('*')
        .order('fecha', { ascending: false });
      if (error) throw error;
      if (!rows || rows.length === 0) {
        toast.info('No hay registros para exportar.');
        return;
      }
      exportToCSV(rows);
      toast.success(`${rows.length} registros exportados a CSV correctamente.`);
    } catch (err: any) {
      console.error('Error al exportar CSV:', err);
      toast.error('No se pudo exportar el historial. Verifica tu conexión.');
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
          .select('id, created_at')
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

          const existingCreatedAt = existing[0].created_at;
          const isExistingOlderThan24h = existingCreatedAt && (new Date().getTime() - new Date(existingCreatedAt).getTime()) > 24 * 60 * 60 * 1000;

          if (isExistingOlderThan24h && userRole !== 'supervisor') {
            toast.error('Edición bloqueada: El registro supera las 24 horas y solo un supervisor puede reemplazarlo.');
            setIsSaving(false);
            return;
          }

          const userChoice = await showConfirm({
            title: 'Registro Existente',
            message: `Ya existe una inspección registrada para la fecha ${data.date} (Turno: ${data.turno || 'Día'}). ¿Desea reemplazar el registro existente?`,
            confirmText: 'Reemplazar',
            cancelText: 'Cancelar',
            type: 'warning'
          });

          if (!userChoice) {
            setIsSaving(false);
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
        setLoadedRecordCreatedAt(null);
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
        const { data: deletedRow, error } = await supabase
          .from('inspecciones')
          .delete()
          .eq('id', loadedRecordId)
          .select();

        if (error) throw error;
        
        if (!deletedRow || deletedRow.length === 0) {
          throw new Error('No se pudo eliminar el registro. Es posible que no tengas los permisos necesarios (RLS).');
        }

        setData(initialData);
        setSearchDate('');
        setLoadedRecordId(null);
        setLoadedRecordCreatedAt(null);
        localStorage.removeItem(STORAGE_KEY);
        // Force refresh recent records
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
        setLoadedRecordCreatedAt(rows[0].created_at);
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
        setLoadedRecordCreatedAt(results[0].created_at);
      } else {
        setData({ ...initialData, date: searchDate || initialData.date });
        setLoadedRecordId(null);
        setLoadedRecordCreatedAt(null);
      }
    } catch (err: any) {
      console.error('Error fetching data from Supabase:', err);
      toast.error(`Error al consultar los datos: ${err.message || 'Error desconocido'}`);
    } finally {
      setIsFetching(false);
    }
  };

  // ==================== RENDER GATE ====================
  // 1. Loading: block all rendering until auth is fully resolved
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-800">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-lg font-semibold animate-pulse text-green-700">Cargando sistema...</div>
      </div>
    );
  }

  // 2. Not authenticated → Landing Page
  if (view === 'landing') {
    return (
      <LandingPage
        onLoginSuccess={handleLoginSuccess}
        onGuestAccess={handleGuestAccess}
      />
    );
  }

  // ==================== APP VIEW ====================
  const isOlderThan24h = loadedRecordCreatedAt
    ? (new Date().getTime() - new Date(loadedRecordCreatedAt).getTime()) > 24 * 60 * 60 * 1000
    : false;

  const isEditBlocked = loadedRecordId !== null && isOlderThan24h && userRole !== 'supervisor';
  const isSupervisorMode = loadedRecordId !== null && isOlderThan24h && userRole === 'supervisor';

  const effectiveReadOnly = isGuest || isEditBlocked;

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
            isError={isErrorRecent}
            onLoad={handleLoadById}
          />

          {/* Recent Movements */}
          <RecentMovements refreshKey={trendRefreshKey} onLoad={handleLoadById} />

          {/* Trend Analysis Panel */}
          <TrendAnalysis refreshKey={trendRefreshKey} />

          {/* Header acts as Control Panel */}
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-md border border-gray-200 gap-4 no-print">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-800">Inspección Horno de Cal Arauco L-2</h1>
              <p className="text-sm text-gray-500">Digitalización de Ficha Técnica</p>
              {!isGuest && isEditBlocked && (
                <div className="mt-2 text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-2 border border-red-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Edición bloqueada: El registro supera las 24 horas. Contacte a un supervisor.
                </div>
              )}
              {!isGuest && isSupervisorMode && (
                <div className="mt-2 text-sm text-purple-700 bg-purple-50 px-3 py-1.5 rounded-md font-medium inline-flex items-center gap-2 border border-purple-200">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  Modo Supervisor Activo (Editando historial antiguo)
                </div>
              )}
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
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded transition"
                title="Descarga el historial completo de inspecciones en formato Excel (CSV)"
              >
                <Table2 size={18} />
                Exportar CSV
              </button>
              {!isGuest && (
                <button
                  onClick={handleSaveSupabase}
                  disabled={isSaving || !data.date || !data.technician || isEditBlocked}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed ${!data.date || !data.technician || isEditBlocked
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
                  disabled={isEditBlocked}
                  className={`flex items-center gap-2 px-4 py-2 text-white rounded transition ${isEditBlocked ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
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
              readOnly={effectiveReadOnly}
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
                readOnly={effectiveReadOnly}
              />
            )}

            <div className="mt-8">
              <InspectionForm data={data} onChange={handleChange} readOnly={effectiveReadOnly} />
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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

type Station = 'I' | 'II' | 'III' | 'IV';
type ViewMode = 'mantos' | 'llantas' | 'descansos' | 'migraciones';

interface TrendAnalysisProps {
    refreshKey: number;
}

const COLORS = {
    blue: '#2563eb',
    red: '#dc2626',
    emerald: '#059669',
    amber: '#d97706',
};

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ refreshKey }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [station, setStation] = useState<Station>('I');
    const [viewMode, setViewMode] = useState<ViewMode>('mantos');
    const [rawData, setRawData] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set());

    const fetchTrends = useCallback(async () => {
        setIsLoading(true);
        try {
            const { data: rows, error } = await supabase
                .from('inspecciones')
                .select('*')
                .order('fecha', { ascending: true })
                .limit(15);

            if (error) throw error;
            setRawData(rows || []);
        } catch (e) {
            console.error('Error fetching trends:', e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) fetchTrends();
    }, [isOpen, refreshKey, fetchTrends]);

    // Derive chart data and line config based on view + station
    const { chartData, lines, seriesAverages } = useMemo(() => {
        if (rawData.length === 0) return { chartData: [], lines: [], seriesAverages: null };

        const stationLower = station.toLowerCase();

        if (viewMode === 'mantos') {
            const andesKey = `temp_manto_andes_${stationLower}`;
            const pacKey = `temp_manto_pacifico_${stationLower}`;
            const mapped = rawData.map(r => ({
                fecha: r.fecha || '—',
                turno: r.turno || 'Día',
                tecnico: r.tecnico || '—',
                andes: r[andesKey] != null ? Number(r[andesKey]) : null,
                pacifico: r[pacKey] != null ? Number(r[pacKey]) : null,
            }));
            const validAndes = mapped.map(d => d.andes).filter(v => v != null) as number[];
            const validPac = mapped.map(d => d.pacifico).filter(v => v != null) as number[];
            const averages = {
                'Andes': validAndes.length > 0 ? (validAndes.reduce((a, b) => a + b, 0) / validAndes.length).toFixed(1) : null,
                'Pacífico': validPac.length > 0 ? (validPac.reduce((a, b) => a + b, 0) / validPac.length).toFixed(1) : null,
            };
            return {
                chartData: mapped,
                lines: [
                    { key: 'andes', name: `Manto Andes ${station}`, color: COLORS.blue },
                    { key: 'pacifico', name: `Manto Pacífico ${station}`, color: COLORS.red },
                ],
                seriesAverages: averages,
            };
        }

        if (viewMode === 'llantas') {
            const mapped = rawData.map(r => ({
                fecha: r.fecha || '—',
                turno: r.turno || 'Día',
                tecnico: r.tecnico || '—',
                llantaI: r.temp_llanta_i != null ? Number(r.temp_llanta_i) : null,
                llantaII: r.temp_llanta_ii != null ? Number(r.temp_llanta_ii) : null,
                llantaIII: r.temp_llanta_iii != null ? Number(r.temp_llanta_iii) : null,
                llantaIV: r.temp_llanta_iv != null ? Number(r.temp_llanta_iv) : null,
            }));
            const cI = mapped.map(d => d.llantaI).filter(v => v != null) as number[];
            const cII = mapped.map(d => d.llantaII).filter(v => v != null) as number[];
            const cIII = mapped.map(d => d.llantaIII).filter(v => v != null) as number[];
            const cIV = mapped.map(d => d.llantaIV).filter(v => v != null) as number[];
            const averages = {
                'I': cI.length > 0 ? (cI.reduce((a, b) => a + b, 0) / cI.length).toFixed(1) : null,
                'II': cII.length > 0 ? (cII.reduce((a, b) => a + b, 0) / cII.length).toFixed(1) : null,
                'III': cIII.length > 0 ? (cIII.reduce((a, b) => a + b, 0) / cIII.length).toFixed(1) : null,
                'IV': cIV.length > 0 ? (cIV.reduce((a, b) => a + b, 0) / cIV.length).toFixed(1) : null,
            };
            return {
                chartData: mapped,
                lines: [
                    { key: 'llantaI', name: 'Llanta I', color: COLORS.blue },
                    { key: 'llantaII', name: 'Llanta II', color: COLORS.red },
                    { key: 'llantaIII', name: 'Llanta III', color: COLORS.emerald },
                    { key: 'llantaIV', name: 'Llanta IV', color: COLORS.amber },
                ],
                seriesAverages: averages,
            };
        }

        if (viewMode === 'migraciones') {
            const mapped = rawData.map(r => ({
                fecha: r.fecha || '—',
                turno: r.turno || 'Día',
                tecnico: r.tecnico || '—',
                migI: r.migration_i != null ? Number(r.migration_i) : null,
                migII: r.migration_ii != null ? Number(r.migration_ii) : null,
                migIII: r.migration_iii != null ? Number(r.migration_iii) : null,
                migIV: r.migration_iv != null ? Number(r.migration_iv) : null,
            }));
            const calcs = {
                I: mapped.map(d => d.migI).filter(v => v != null) as number[],
                II: mapped.map(d => d.migII).filter(v => v != null) as number[],
                III: mapped.map(d => d.migIII).filter(v => v != null) as number[],
                IV: mapped.map(d => d.migIV).filter(v => v != null) as number[],
            };
            const averages = {
                'I': calcs.I.length > 0 ? (calcs.I.reduce((a, b) => a + b, 0) / calcs.I.length).toFixed(1) : null,
                'II': calcs.II.length > 0 ? (calcs.II.reduce((a, b) => a + b, 0) / calcs.II.length).toFixed(1) : null,
                'III': calcs.III.length > 0 ? (calcs.III.reduce((a, b) => a + b, 0) / calcs.III.length).toFixed(1) : null,
                'IV': calcs.IV.length > 0 ? (calcs.IV.reduce((a, b) => a + b, 0) / calcs.IV.length).toFixed(1) : null,
            };
            return {
                chartData: mapped,
                lines: [
                    { key: 'migI', name: 'Migración I', color: COLORS.blue },
                    { key: 'migII', name: 'Migración II', color: COLORS.red },
                    { key: 'migIII', name: 'Migración III', color: COLORS.emerald },
                    { key: 'migIV', name: 'Migración IV', color: COLORS.amber },
                ],
                seriesAverages: averages
            };
        }

        // viewMode === 'descansos'
        // DB columns: temp_i_tl, temp_i_tr, temp_ii_tl, etc.
        const prefixMap: Record<Station, string> = { I: 'temp_i', II: 'temp_ii', III: 'temp_iii', IV: 'temp_iv' };
        const prefix = prefixMap[station];
        const mapped = rawData.map(r => ({
            fecha: r.fecha || '—',
            turno: r.turno || 'Día',
            tecnico: r.tecnico || '—',
            andesSur: r[`${prefix}_tl`] != null ? Number(r[`${prefix}_tl`]) : null,
            pacSur: r[`${prefix}_tr`] != null ? Number(r[`${prefix}_tr`]) : null,
            andesNorte: r[`${prefix}_bl`] != null ? Number(r[`${prefix}_bl`]) : null,
            pacNorte: r[`${prefix}_br`] != null ? Number(r[`${prefix}_br`]) : null,
        }));
        const cAS = mapped.map(d => d.andesSur).filter(v => v != null) as number[];
        const cPS = mapped.map(d => d.pacSur).filter(v => v != null) as number[];
        const cAN = mapped.map(d => d.andesNorte).filter(v => v != null) as number[];
        const cPN = mapped.map(d => d.pacNorte).filter(v => v != null) as number[];

        const averages = {
            'A/Sur': cAS.length > 0 ? (cAS.reduce((a, b) => a + b, 0) / cAS.length).toFixed(1) : null,
            'P/Sur': cPS.length > 0 ? (cPS.reduce((a, b) => a + b, 0) / cPS.length).toFixed(1) : null,
            'A/Norte': cAN.length > 0 ? (cAN.reduce((a, b) => a + b, 0) / cAN.length).toFixed(1) : null,
            'P/Norte': cPN.length > 0 ? (cPN.reduce((a, b) => a + b, 0) / cPN.length).toFixed(1) : null,
        };

        return {
            chartData: mapped,
            lines: [
                { key: 'andesSur', name: `Andes/Sur ${station}`, color: COLORS.blue },
                { key: 'pacSur', name: `Pac./Sur ${station}`, color: COLORS.red },
                { key: 'andesNorte', name: `Andes/Norte ${station}`, color: COLORS.emerald },
                { key: 'pacNorte', name: `Pac./Norte ${station}`, color: COLORS.amber },
            ],
            seriesAverages: averages,
        };
    }, [rawData, station, viewMode]);

    // Reset all lines to visible when lines config changes
    useEffect(() => {
        setVisibleLines(new Set(lines.map(l => l.key)));
    }, [lines]);

    const toggleLine = (key: string) => {
        setVisibleLines(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length > 0) {
            const tecnico = payload[0]?.payload?.tecnico || '—';
            const turno = payload[0]?.payload?.turno || 'Día';
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{label} - Turno {turno}</p>
                    <p className="text-gray-500 mb-2">Técnico: {tecnico}</p>
                    {payload.map((entry: any, i: number) => (
                        <p key={i} style={{ color: entry.color }}>
                            {entry.name}: <span className="font-bold">{entry.value ?? '—'} {viewMode === 'migraciones' ? 'mm' : '°C'}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    const VIEW_LABELS: Record<ViewMode, string> = {
        mantos: 'Mantos',
        llantas: 'Llantas',
        descansos: 'Descansos',
        migraciones: 'Migraciones',
    };

    return (
        <div className="no-print">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 transition text-sm font-medium w-full justify-between"
            >
                <span className="flex items-center gap-2">
                    <TrendingUp size={16} />
                    Análisis de Tendencias
                </span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="mt-2 bg-white rounded-lg shadow-md border border-gray-200 p-4">
                    {/* View Mode Selector */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="text-sm font-semibold text-gray-600">Vista:</span>
                        {(['mantos', 'llantas', 'descansos', 'migraciones'] as ViewMode[]).map(v => (
                            <button
                                key={v}
                                onClick={() => setViewMode(v)}
                                className={`px-3 py-1 rounded text-xs font-medium transition ${viewMode === v
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                    }`}
                            >
                                {VIEW_LABELS[v]}
                            </button>
                        ))}
                    </div>

                    {/* Station Selector + Delta */}
                    <div className="flex flex-wrap items-center gap-3 mb-4">
                        {viewMode !== 'llantas' && viewMode !== 'migraciones' && (
                            <>
                                <span className="text-sm font-semibold text-gray-600">Estación:</span>
                                {(['I', 'II', 'III', 'IV'] as Station[]).map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setStation(s)}
                                        className={`px-3 py-1 rounded text-sm font-medium transition ${station === s
                                            ? 'bg-emerald-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </>
                        )}
                        {seriesAverages && (
                            <div className="ml-auto flex flex-wrap gap-2">
                                {Object.entries(seriesAverages).map(([label, avg]) => avg !== null ? (
                                    <div key={label} className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1">
                                        <span className="text-[10px] font-semibold text-blue-700">Prom. {label}:</span>
                                        <span className="text-xs font-bold text-blue-800">{avg} {viewMode === 'migraciones' ? 'mm' : '°C'}</span>
                                    </div>
                                ) : null)}
                            </div>
                        )}
                    </div>

                    {/* Line Toggle Checkboxes */}
                    {chartData.length > 0 && (
                        <div className="flex flex-wrap items-center gap-4 mb-3 px-1">
                            {lines.map(line => (
                                <label key={line.key} className="flex items-center gap-1.5 cursor-pointer select-none">
                                    <input
                                        type="checkbox"
                                        checked={visibleLines.has(line.key)}
                                        onChange={() => toggleLine(line.key)}
                                        className="w-3.5 h-3.5 rounded accent-current cursor-pointer"
                                        style={{ accentColor: line.color }}
                                    />
                                    <span className="text-xs font-medium" style={{ color: line.color }}>{line.name}</span>
                                </label>
                            ))}
                        </div>
                    )}

                    {/* Chart */}
                    {isLoading ? (
                        <p className="text-center text-sm text-gray-400 py-8">Cargando datos...</p>
                    ) : chartData.length === 0 ? (
                        <p className="text-center text-sm text-gray-400 py-8">Sin datos disponibles.</p>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="fecha"
                                    tick={{ fontSize: 11 }}
                                    angle={-30}
                                    textAnchor="end"
                                    height={50}
                                />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    label={{ value: viewMode === 'migraciones' ? 'mm' : '°C', position: 'insideLeft', offset: 10, style: { fontSize: 12 } }}
                                />
                                <Tooltip content={<CustomTooltip />} />
                                {lines.filter(line => visibleLines.has(line.key)).map(line => (
                                    <Line
                                        key={line.key}
                                        type="monotone"
                                        dataKey={line.key}
                                        name={line.name}
                                        stroke={line.color}
                                        strokeWidth={2}
                                        dot={{ r: 4, fill: line.color }}
                                        activeDot={{ r: 6 }}
                                        connectNulls
                                    />
                                ))}
                            </LineChart>
                        </ResponsiveContainer>
                    )}
                </div>
            )}
        </div>
    );
};

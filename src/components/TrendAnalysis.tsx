import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import { supabase } from '../lib/supabaseClient';

type Station = 'I' | 'II' | 'III' | 'IV';
type ViewMode = 'mantos' | 'llantas' | 'descansos';

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
    const { chartData, lines, delta } = useMemo(() => {
        if (rawData.length === 0) return { chartData: [], lines: [], delta: null };

        const stationLower = station.toLowerCase();

        if (viewMode === 'mantos') {
            const andesKey = `temp_manto_andes_${stationLower}`;
            const pacKey = `temp_manto_pacifico_${stationLower}`;
            const mapped = rawData.map(r => ({
                fecha: r.fecha || '—',
                tecnico: r.tecnico || '—',
                andes: r[andesKey] != null ? Number(r[andesKey]) : null,
                pacifico: r[pacKey] != null ? Number(r[pacKey]) : null,
            }));
            const deltas = mapped
                .filter(d => d.andes != null && d.pacifico != null)
                .map(d => Math.abs(d.andes! - d.pacifico!));
            const avgDelta = deltas.length > 0 ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10 : null;
            return {
                chartData: mapped,
                lines: [
                    { key: 'andes', name: `Manto Andes ${station}`, color: COLORS.blue },
                    { key: 'pacifico', name: `Manto Pacífico ${station}`, color: COLORS.red },
                ],
                delta: avgDelta,
            };
        }

        if (viewMode === 'llantas') {
            const mapped = rawData.map(r => ({
                fecha: r.fecha || '—',
                tecnico: r.tecnico || '—',
                llantaI: r.temp_llanta_i != null ? Number(r.temp_llanta_i) : null,
                llantaII: r.temp_llanta_ii != null ? Number(r.temp_llanta_ii) : null,
                llantaIII: r.temp_llanta_iii != null ? Number(r.temp_llanta_iii) : null,
                llantaIV: r.temp_llanta_iv != null ? Number(r.temp_llanta_iv) : null,
            }));
            const deltas = mapped.map(d => {
                const vals = [d.llantaI, d.llantaII, d.llantaIII, d.llantaIV].filter(v => v != null) as number[];
                return vals.length >= 2 ? Math.max(...vals) - Math.min(...vals) : null;
            }).filter(v => v != null) as number[];
            const avgDelta = deltas.length > 0 ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10 : null;
            return {
                chartData: mapped,
                lines: [
                    { key: 'llantaI', name: 'Llanta I', color: COLORS.blue },
                    { key: 'llantaII', name: 'Llanta II', color: COLORS.red },
                    { key: 'llantaIII', name: 'Llanta III', color: COLORS.emerald },
                    { key: 'llantaIV', name: 'Llanta IV', color: COLORS.amber },
                ],
                delta: avgDelta,
            };
        }

        // viewMode === 'descansos'
        // DB columns: temp_i_tl, temp_i_tr, temp_ii_tl, etc.
        const prefixMap: Record<Station, string> = { I: 'temp_i', II: 'temp_ii', III: 'temp_iii', IV: 'temp_iv' };
        const prefix = prefixMap[station];
        const mapped = rawData.map(r => ({
            fecha: r.fecha || '—',
            tecnico: r.tecnico || '—',
            andesSur: r[`${prefix}_tl`] != null ? Number(r[`${prefix}_tl`]) : null,
            pacSur: r[`${prefix}_tr`] != null ? Number(r[`${prefix}_tr`]) : null,
            andesNorte: r[`${prefix}_bl`] != null ? Number(r[`${prefix}_bl`]) : null,
            pacNorte: r[`${prefix}_br`] != null ? Number(r[`${prefix}_br`]) : null,
        }));
        const deltas = mapped.map(d => {
            const pairs: [number | null, number | null][] = [[d.andesSur, d.pacSur], [d.andesNorte, d.pacNorte]];
            const diffs = pairs.filter(([a, b]) => a != null && b != null).map(([a, b]) => Math.abs(a! - b!));
            return diffs.length > 0 ? diffs.reduce((a, b) => a + b, 0) / diffs.length : null;
        }).filter(v => v != null) as number[];
        const avgDelta = deltas.length > 0 ? Math.round((deltas.reduce((a, b) => a + b, 0) / deltas.length) * 10) / 10 : null;

        return {
            chartData: mapped,
            lines: [
                { key: 'andesSur', name: `Andes/Sur ${station}`, color: COLORS.blue },
                { key: 'pacSur', name: `Pac./Sur ${station}`, color: COLORS.red },
                { key: 'andesNorte', name: `Andes/Norte ${station}`, color: COLORS.emerald },
                { key: 'pacNorte', name: `Pac./Norte ${station}`, color: COLORS.amber },
            ],
            delta: avgDelta,
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
            return (
                <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3 text-xs">
                    <p className="font-semibold text-gray-700 mb-1">{label}</p>
                    <p className="text-gray-500 mb-2">Técnico: {tecnico}</p>
                    {payload.map((entry: any, i: number) => (
                        <p key={i} style={{ color: entry.color }}>
                            {entry.name}: <span className="font-bold">{entry.value ?? '—'} °C</span>
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
                        {(['mantos', 'llantas', 'descansos'] as ViewMode[]).map(v => (
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
                        {viewMode !== 'llantas' && (
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
                        {delta !== null && (
                            <div className={`${viewMode !== 'llantas' ? 'ml-auto' : ''} flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1`}>
                                <span className="text-xs font-semibold text-amber-700">Δ Promedio:</span>
                                <span className="text-sm font-bold text-amber-800">{delta} °C</span>
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
                                    label={{ value: '°C', position: 'insideLeft', offset: 10, style: { fontSize: 12 } }}
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

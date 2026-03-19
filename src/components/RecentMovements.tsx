import React, { useState } from 'react';
import { ChevronDown, Wrench } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useQuery } from '@tanstack/react-query';

interface MovementRecord {
    id: number;
    fecha: string;
    turno: string;
    tecnico: string;
    ajustes_mecanicos: any;
}

interface RecentMovementsProps {
    refreshKey: number;
    onLoad: (id: number) => void;
}

export const RecentMovements: React.FC<RecentMovementsProps> = ({ refreshKey, onLoad }) => {
    const [isOpen, setIsOpen] = useState(false);

    const { data: records = [], isLoading, isError } = useQuery<MovementRecord[]>({
        queryKey: ['inspecciones', 'movements', refreshKey],
        queryFn: async () => {
            const { data: rows, error } = await supabase
                .from('inspecciones')
                .select('id, fecha, turno, tecnico, ajustes_mecanicos')
                .not('ajustes_mecanicos', 'is', null)
                .order('fecha', { ascending: false })
                .limit(30);

            if (error) throw error;
            if (!rows) return [];

            // Filter records that actually have non-empty adjustment values
            const filteredRows = rows.filter((row: any) => {
                const ajustes = typeof row.ajustes_mecanicos === 'string'
                    ? JSON.parse(row.ajustes_mecanicos)
                    : row.ajustes_mecanicos;
                return Object.values(ajustes).some((station: any) =>
                    Object.values(station).some((v: any) => {
                        const num = parseFloat(String(v));
                        return !isNaN(num) && num !== 0;
                    })
                );
            });
            return filteredRows.slice(0, 5);
        }
    });

    const countStations = (ajustes: any): number => {
        if (!ajustes) return 0;
        const data = typeof ajustes === 'string' ? JSON.parse(ajustes) : ajustes;
        let count = 0;
        for (const station of Object.values(data)) {
            const hasValues = Object.values(station as any).some((v: any) => {
                const num = parseFloat(String(v));
                return !isNaN(num) && num !== 0;
            });
            if (hasValues) count++;
        }
        return count;
    };

    return (
        <div className="relative no-print">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg border border-amber-200 transition text-sm font-medium w-full justify-between"
            >
                <span className="flex items-center gap-1.5">
                    <Wrench size={14} />
                    Movimientos Recientes ({records.length})
                </span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                    {isLoading ? (
                        <p className="text-xs text-gray-400 text-center py-3">Cargando...</p>
                    ) : isError ? (
                        <p className="text-xs text-red-500 text-center py-3">Error al cargar datos.</p>
                    ) : records.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Sin ajustes mecánicos registrados.</p>
                    ) : (
                        records.map((rec) => (
                            <button
                                key={rec.id}
                                onClick={() => { onLoad(rec.id); setIsOpen(false); }}
                                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-amber-50 transition border-b border-gray-100 last:border-b-0 text-left"
                            >
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-semibold text-gray-700">{rec.fecha ? `${rec.fecha} - Turno ${rec.turno || 'Día'}` : '—'}</span>
                                    <span className="text-xs text-gray-400">|</span>
                                    <span className="text-xs text-gray-500">{rec.tecnico || '—'}</span>
                                </div>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-semibold">
                                    <Wrench size={10} />
                                    {countStations(rec.ajustes_mecanicos)} est.
                                </span>
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

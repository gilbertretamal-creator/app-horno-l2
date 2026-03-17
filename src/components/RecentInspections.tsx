import React, { useState } from 'react';
import { ChevronDown, Upload } from 'lucide-react';

interface RecentRecord {
    id: number;
    fecha: string;
    turno: string;
    tecnico: string;
}

interface RecentInspectionsProps {
    records: RecentRecord[];
    isLoading: boolean;
    isError?: boolean;
    onLoad: (id: number) => void;
}

export const RecentInspections: React.FC<RecentInspectionsProps> = ({ records, isLoading, isError, onLoad }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative no-print">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition text-sm font-medium w-full justify-between"
            >
                <span>📋 Inspecciones Recientes ({records.length})</span>
                <ChevronDown size={16} className={`transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-auto">
                    {isLoading ? (
                        <p className="text-xs text-gray-400 text-center py-3">Cargando...</p>
                    ) : isError ? (
                        <p className="text-xs text-red-500 text-center py-3">Error al cargar registros recientes.</p>
                    ) : records.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-3">Sin registros.</p>
                    ) : (
                        records.map((rec) => (
                            <button
                                key={rec.id}
                                onClick={() => { onLoad(rec.id); setIsOpen(false); }}
                                className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-blue-50 transition border-b border-gray-100 last:border-b-0 text-left"
                            >
                                <div>
                                    <span className="text-xs font-semibold text-gray-700">{rec.fecha ? `${rec.fecha} - Turno ${rec.turno || 'Día'}` : '—'}</span>
                                    <span className="text-xs text-gray-400 mx-2">|</span>
                                    <span className="text-xs text-gray-500">{rec.tecnico || '—'}</span>
                                </div>
                                <Upload size={13} className="text-blue-500 flex-shrink-0" />
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

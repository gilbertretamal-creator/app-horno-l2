import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

interface CalendarPickerProps {
    value: string;
    onChange: (date: string) => void;
    refreshKey?: number;
}

const DAYS_ES = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do'];
const MONTHS_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const CalendarPicker: React.FC<CalendarPickerProps> = ({ value, onChange, refreshKey = 0 }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewYear, setViewYear] = useState(new Date().getFullYear());
    const [viewMonth, setViewMonth] = useState(new Date().getMonth());
    const [inspectionDates, setInspectionDates] = useState<Set<string>>(new Set());
    const [adjustmentDates, setAdjustmentDates] = useState<Set<string>>(new Set());
    const containerRef = useRef<HTMLDivElement>(null);

    // Fetch all distinct inspection dates from Supabase
    const fetchInspectionDates = useCallback(async () => {
        try {
            const { data: rows, error } = await supabase
                .from('inspecciones')
                .select('fecha, ajustes_mecanicos');
            if (!error && rows) {
                const dates = new Set<string>();
                const adjDates = new Set<string>();
                rows.forEach((r: any) => {
                    if (r.fecha) {
                        let dateStr: string;
                        try {
                            const d = new Date(r.fecha);
                            dateStr = d.toISOString().split('T')[0];
                        } catch {
                            dateStr = String(r.fecha);
                        }
                        dates.add(dateStr);
                        // Check if this date has mechanical adjustments
                        if (r.ajustes_mecanicos) {
                            try {
                                const ajustes = typeof r.ajustes_mecanicos === 'string'
                                    ? JSON.parse(r.ajustes_mecanicos) : r.ajustes_mecanicos;
                                const hasValues = Object.values(ajustes).some((station: any) =>
                                    Object.values(station).some((v: any) => {
                                        const num = parseFloat(String(v));
                                        return !isNaN(num) && num !== 0;
                                    })
                                );
                                if (hasValues) adjDates.add(dateStr);
                            } catch { /* ignore parse errors */ }
                        }
                    }
                });
                setInspectionDates(dates);
                setAdjustmentDates(adjDates);
            }
        } catch (e) {
            console.error('Error fetching inspection dates:', e);
        }
    }, []);

    useEffect(() => {
        fetchInspectionDates();
    }, [fetchInspectionDates, refreshKey]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    // When value changes, navigate calendar to that month
    useEffect(() => {
        if (value) {
            const d = new Date(value + 'T00:00:00');
            if (!isNaN(d.getTime())) {
                setViewYear(d.getFullYear());
                setViewMonth(d.getMonth());
            }
        }
    }, [value]);

    const goToPrevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(y => y - 1);
        } else {
            setViewMonth(m => m - 1);
        }
    };

    const goToNextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(y => y + 1);
        } else {
            setViewMonth(m => m + 1);
        }
    };

    const handleSelectDate = (day: number) => {
        const mm = String(viewMonth + 1).padStart(2, '0');
        const dd = String(day).padStart(2, '0');
        const dateStr = `${viewYear}-${mm}-${dd}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    // Build the calendar grid
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1).getDay();
    // Convert Sunday=0 to Monday-based: Mon=0, Tue=1, ..., Sun=6
    const startOffset = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: (number | null)[] = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);
    // Pad to fill last row
    while (cells.length % 7 !== 0) cells.push(null);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return '';
        try {
            const d = new Date(dateStr + 'T00:00:00');
            return `${d.getDate()} ${MONTHS_ES[d.getMonth()].substring(0, 3)} ${d.getFullYear()}`;
        } catch {
            return dateStr;
        }
    };

    return (
        <div ref={containerRef} className="relative flex-1 md:w-auto">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-2 p-2 border border-blue-300 rounded bg-white text-left focus:ring-1 focus:ring-blue-500 outline-none hover:bg-blue-50 transition"
            >
                <Calendar size={16} className="text-blue-500 shrink-0" />
                <span className={value ? 'text-gray-800' : 'text-gray-400'}>
                    {value ? formatDisplayDate(value) : 'Seleccionar fecha...'}
                </span>
            </button>

            {/* Dropdown Calendar */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-xl p-3 w-[280px] animate-in">
                    {/* Header: Month/Year Navigation */}
                    <div className="flex items-center justify-between mb-2">
                        <button
                            type="button"
                            onClick={goToPrevMonth}
                            className="p-1 rounded hover:bg-gray-100 transition"
                        >
                            <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <span className="text-sm font-semibold text-gray-800">
                            {MONTHS_ES[viewMonth]} {viewYear}
                        </span>
                        <button
                            type="button"
                            onClick={goToNextMonth}
                            className="p-1 rounded hover:bg-gray-100 transition"
                        >
                            <ChevronRight size={18} className="text-gray-600" />
                        </button>
                    </div>

                    {/* Day-of-week headers */}
                    <div className="grid grid-cols-7 gap-0 mb-1">
                        {DAYS_ES.map(d => (
                            <div key={d} className="text-center text-[10px] font-semibold text-gray-400 py-1">
                                {d}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7 gap-0">
                        {cells.map((day, idx) => {
                            if (day === null) {
                                return <div key={`empty-${idx}`} className="h-8" />;
                            }

                            const mm = String(viewMonth + 1).padStart(2, '0');
                            const dd = String(day).padStart(2, '0');
                            const dateStr = `${viewYear}-${mm}-${dd}`;
                            const hasInspection = inspectionDates.has(dateStr);
                            const hasAdjustment = adjustmentDates.has(dateStr);
                            const isSelected = dateStr === value;
                            const isToday = dateStr === todayStr;

                            return (
                                <button
                                    key={dateStr}
                                    type="button"
                                    onClick={() => handleSelectDate(day)}
                                    className={`
                                        h-8 w-8 mx-auto flex items-center justify-center rounded-full text-xs font-medium transition-all
                                        ${isSelected
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : hasAdjustment
                                                ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-500 font-bold hover:bg-amber-200'
                                                : hasInspection
                                                    ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-400 font-bold hover:bg-blue-200'
                                                    : isToday
                                                        ? 'bg-gray-100 text-gray-900 font-bold hover:bg-gray-200'
                                                        : 'text-gray-700 hover:bg-gray-100'
                                        }
                                    `}
                                    title={hasAdjustment ? 'Inspección con ajuste mecánico' : hasInspection ? 'Inspección registrada' : ''}
                                >
                                    {day}
                                </button>
                            );
                        })}
                    </div>

                    {/* Legend */}
                    <div className="mt-2 pt-2 border-t border-gray-100 flex items-center gap-3 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-blue-100 ring-2 ring-blue-400" />
                            Con inspección
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-amber-100 ring-2 ring-amber-500" />
                            Con ajuste
                        </span>
                        <span className="flex items-center gap-1">
                            <span className="inline-block w-3 h-3 rounded-full bg-blue-600" />
                            Seleccionado
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};

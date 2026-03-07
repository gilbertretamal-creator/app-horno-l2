import React from 'react';
import { Wrench } from 'lucide-react';
import { AjustesMecanicos, StationAdjustment } from '../types';

interface MovementAdjustmentsProps {
    ajustes: AjustesMecanicos;
    visibleStations: boolean[];
    onToggleStation: (idx: number) => void;
    readOnly?: boolean;
}

const STATIONS = ['I', 'II', 'III', 'IV'] as const;
const POSITIONS: (keyof StationAdjustment)[] = ['AN', 'AS', 'PN', 'PS'];

export const MovementAdjustments: React.FC<MovementAdjustmentsProps> = ({ ajustes, visibleStations, onToggleStation, readOnly = false }) => {
    const hasAnyAdjustment = STATIONS.some(s =>
        POSITIONS.some(p => {
            const v = parseFloat(ajustes[s][p]);
            return !isNaN(v) && v !== 0;
        })
    );

    // Inline styles to avoid Tailwind v4 reset conflicts
    const panelStyle: React.CSSProperties = {
        marginTop: '1rem',
        border: '2px solid #d1d5db',
        borderRadius: '0.75rem',
        background: '#f9fafb',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
    };

    const headerStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.75rem 1rem',
        background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
        borderBottom: '1px solid #e5e7eb',
    };

    const toggleRowStyle: React.CSSProperties = {
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        padding: '0.75rem 1rem',
    };

    const toggleLabelStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        userSelect: 'none',
    };

    const toggleSwitchStyle = (on: boolean): React.CSSProperties => ({
        position: 'relative',
        width: '44px',
        height: '24px',
        minHeight: '24px',
        borderRadius: '12px',
        background: on ? '#009A44' : '#9ca3af',
        transition: 'background 0.25s ease',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: on
            ? 'inset 0 1px 3px rgba(0,0,0,0.1), 0 0 6px rgba(0,154,68,0.3)'
            : 'inset 0 1px 3px rgba(0,0,0,0.15)',
        display: 'block',
    });

    const toggleKnobStyle = (on: boolean): React.CSSProperties => ({
        position: 'absolute',
        top: '2px',
        left: '2px',
        width: '20px',
        height: '20px',
        borderRadius: '50%',
        background: 'white',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
        transition: 'transform 0.25s ease',
        transform: on ? 'translateX(20px)' : 'translateX(0)',
    });

    return (
        <div className="no-print" style={panelStyle}>
            <div style={headerStyle}>
                <Wrench size={18} style={{ color: '#7c3aed' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                    Ajustes de Movimiento — Polines de Carga
                </span>
                {hasAnyAdjustment && (
                    <span style={{
                        marginLeft: 'auto',
                        fontSize: '0.65rem',
                        fontWeight: 700,
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        background: '#dcfce7',
                        color: '#15803d',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                    }}>
                        Activo
                    </span>
                )}
            </div>
            <div style={toggleRowStyle}>
                {STATIONS.map((station, idx) => (
                    <label key={station} style={toggleLabelStyle}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                            Estación {station}
                        </span>
                        <div
                            style={toggleSwitchStyle(visibleStations[idx])}
                            onClick={() => !readOnly && onToggleStation(idx)}
                        >
                            <div style={toggleKnobStyle(visibleStations[idx])} />
                        </div>
                    </label>
                ))}
            </div>
        </div>
    );
};

import React from 'react';
import { Wrench, Settings2 } from 'lucide-react';
import { AjustesMecanicos, StationAdjustment } from '../types';

interface MovementAdjustmentsProps {
    ajustes: AjustesMecanicos;
    visibleStations: boolean[];
    onToggleStation: (idx: number) => void;
    onRoceChange: (roce: 'Descarga' | 'Neutro' | 'Alimentacion' | null) => void;
    readOnly?: boolean;
}

const STATIONS = ['I', 'II', 'III', 'IV'] as const;
const POSITIONS: (keyof StationAdjustment)[] = ['AN', 'AS', 'PN', 'PS'];

export const MovementAdjustments: React.FC<MovementAdjustmentsProps> = ({ ajustes, visibleStations, onToggleStation, onRoceChange, readOnly = false }) => {
    const hasAnyAdjustment = STATIONS.some(s =>
        POSITIONS.some(p => {
            const vStr = String(ajustes[s][p] || '');
            const v = parseFloat(vStr.replace(',', '.'));
            return !isNaN(v) && v !== 0;
        })
    );
    const hasRoce = !!ajustes.roceAxial;

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

    const toggleSwitchStyle = (on: boolean, isBlue = false): React.CSSProperties => ({
        position: 'relative',
        width: '44px',
        height: '24px',
        minHeight: '24px',
        borderRadius: '12px',
        background: on ? (isBlue ? '#0ea5e9' : '#009A44') : '#9ca3af',
        transition: 'background 0.25s ease',
        cursor: 'pointer',
        flexShrink: 0,
        boxShadow: on
            ? `inset 0 1px 3px rgba(0,0,0,0.1), 0 0 6px ${isBlue ? 'rgba(14,165,233,0.3)' : 'rgba(0,154,68,0.3)'}`
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
        <div className="no-print flex flex-col md:flex-row gap-4 mt-4">
            <div style={{ ...panelStyle, marginTop: 0, flex: '1 1 auto' }}>
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

            <div style={{ ...panelStyle, marginTop: 0, flex: '0 0 auto', minWidth: '320px' }}>
                <div style={headerStyle}>
                    <Settings2 size={18} style={{ color: '#0ea5e9' }} />
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>
                        Roce Polín Axial
                    </span>
                    {hasRoce && (
                        <span style={{
                            marginLeft: 'auto',
                            fontSize: '0.65rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            background: '#e0f2fe',
                            color: '#0369a1',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                        }}>
                            Activo
                        </span>
                    )}
                </div>
                <div style={{ ...toggleRowStyle, justifyContent: 'space-between' }}>
                    {(['Descarga', 'Neutro', 'Alimentacion'] as const).map((roce) => {
                        const isSelected = ajustes.roceAxial === roce;
                        const label = roce === 'Alimentacion' ? 'Alimentación' : roce;
                        return (
                            <label key={roce} style={toggleLabelStyle}>
                                <div
                                    style={toggleSwitchStyle(isSelected, true)}
                                    onClick={() => !readOnly && onRoceChange(roce)}
                                >
                                    <div style={toggleKnobStyle(isSelected)} />
                                </div>
                                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#4b5563' }}>
                                    {label}
                                </span>
                            </label>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

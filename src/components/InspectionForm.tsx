import React from 'react';
import { InspectionData } from '../types';

interface InspectionFormProps {
    data: InspectionData;
    onChange: (field: keyof InspectionData, value: string) => void;
    readOnly?: boolean;
}

export const InspectionForm: React.FC<InspectionFormProps> = ({ data, onChange, readOnly = false }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Normalize comma to dot for empuje (desplazamiento) fields
        const normalizedValue = name.startsWith('empuje') ? value.replace(',', '.') : value;
        onChange(name as keyof InspectionData, normalizedValue);
    };


    return (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <h2 className="text-xl font-bold mb-6 text-gray-800 border-b pb-2">Datos de Inspección</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">FECHA:</label>
                    <input
                        type="date"
                        name="date"
                        value={data.date}
                        onChange={handleChange}
                        readOnly={readOnly}
                        autoComplete="off"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">TURNO:</label>
                    <select
                        name="turno"
                        value={data.turno || 'Día'}
                        onChange={(e) => onChange('turno', e.target.value)}
                        disabled={readOnly}
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                    >
                        <option value="Día">Día</option>
                        <option value="Noche">Noche</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">TÉCNICO:</label>
                    <select
                        name="technician"
                        value={data.technician}
                        onChange={(e) => onChange('technician', e.target.value)}
                        disabled={readOnly}
                        autoComplete="off"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none bg-white"
                    >
                        <option value="">Seleccionar técnico...</option>
                        <option value="Gilbert Retamal Silva">Gilbert Retamal Silva</option>
                        <option value="Jonathan de la Rosa Navarrete">Jonathan de la Rosa Navarrete</option>
                        <option value="Hector Reyes Cruz">Hector Reyes Cruz</option>
                        <option value="Juan Carlos Reyes Asenjo">Juan Carlos Reyes Asenjo</option>
                        <option value="Remigio Gutierrez Stuardo">Remigio Gutierrez Stuardo</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">ALIMENTACIÓN (L/min):</label>
                    <input
                        type="text"
                        name="feed"
                        value={data.feed}
                        onChange={handleChange}
                        readOnly={readOnly}
                        placeholder="Ej: 1400 + 1 ton"
                        autoComplete="off"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">RPM:</label>
                    <input
                        type="number"
                        step="0.01"
                        name="rpm"
                        value={data.rpm}
                        onChange={handleChange}
                        readOnly={readOnly}
                        placeholder="Ej: 3.5"
                        autoComplete="off"
                        className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                </div>
            </div>

            <h3 className="text-lg font-semibold mb-4 text-gray-800">Migración de Llantas (mm)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(['I', 'II', 'III', 'IV'] as const).map((tire) => {
                    const fieldName = `migration${tire}` as keyof InspectionData;
                    const value = data[fieldName] as string;
                    const numValue = parseFloat(value);
                    const isTooLow = !isNaN(numValue) && value.trim() !== '' && numValue < 10;
                    const isTooHigh = !isNaN(numValue) && value.trim() !== '' && numValue > 25;
                    const hasWarning = isTooLow || isTooHigh;

                    return (
                        <div key={tire}>
                            <label className={`block text-sm font-semibold mb-1 ${hasWarning ? 'text-red-600' : 'text-gray-700'}`}>
                                Migración llanta {tire}:
                            </label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    name={fieldName}
                                    value={value}
                                    onChange={handleChange}
                                    readOnly={readOnly}
                                    placeholder="0.0"
                                    autoComplete="off"
                                    className={`w-full p-2 border rounded outline-none pr-8
                    ${hasWarning
                                            ? 'border-red-500 text-red-600 focus:ring-red-500 focus:border-red-500 bg-red-50'
                                            : 'border-gray-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500'}`}
                                />
                                <span className={`absolute right-3 top-2 text-sm ${hasWarning ? 'text-red-500' : 'text-gray-400'}`}>
                                    mm
                                </span>
                            </div>
                            {isTooLow && (
                                <p className="text-xs text-red-600 mt-1 font-medium">¡Alerta! Fuera de rango (&lt; 10 mm)</p>
                            )}
                            {isTooHigh && (
                                <p className="text-xs text-red-600 mt-1 font-medium">¡Alerta! Fuera de rango (&gt; 25 mm)</p>
                            )}
                        </div>
                    );
                })}
            </div>

            <h3 className="text-lg font-semibold mt-8 mb-4 text-gray-800">Temperaturas de Llanta y Manto (°C)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {(['I', 'II', 'III', 'IV'] as const).map((tire) => {
                    const innerFieldName = `inner${tire}` as keyof InspectionData;
                    const innerValue = data[innerFieldName] as string;

                    return (
                        <div key={`temp_${tire}`} className="bg-gray-50 p-4 rounded border border-gray-200">
                            <h4 className="font-semibold text-center mb-3 text-gray-700">Estación {tire}</h4>

                            <div className="mb-4 pb-4 border-b border-gray-200">
                                <label className="block text-sm font-semibold mb-1 text-gray-700">Llanta Horno:</label>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="relative">
                                        <input
                                            type="number"
                                            step="0.1"
                                            name={innerFieldName}
                                            value={innerValue}
                                            readOnly
                                            tabIndex={-1}
                                            onChange={handleChange}
                                            placeholder="0.0"
                                            className="w-full p-2 text-sm border border-black font-bold rounded outline-none pr-8 bg-gray-100 cursor-default text-gray-800"
                                        />
                                        <span className="absolute right-3 top-2 text-sm text-gray-500 font-normal">°C</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="relative">
                                        <label className="block text-xs text-gray-500 mb-1">Manto andes</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name={`andes${tire}`}
                                            value={data[`andes${tire}` as keyof InspectionData] as string}
                                            readOnly
                                            tabIndex={-1}
                                            onChange={handleChange}
                                            placeholder="0.0"
                                            className="w-full p-2 text-sm border border-black font-bold rounded outline-none pr-8 bg-gray-100 cursor-default text-gray-800"
                                        />
                                        <span className="absolute right-3 top-6 text-sm text-gray-500 font-normal">°C</span>
                                    </div>
                                    <div className="relative">
                                        <label className="block text-xs text-gray-500 mb-1">Manto pacifico</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name={`pacifico${tire}`}
                                            value={data[`pacifico${tire}` as keyof InspectionData] as string}
                                            readOnly
                                            tabIndex={-1}
                                            onChange={handleChange}
                                            placeholder="0.0"
                                            className="w-full p-2 text-sm border border-black font-bold rounded outline-none pr-8 bg-gray-100 cursor-default text-gray-800"
                                        />
                                        <span className="absolute right-3 top-6 text-sm text-gray-500 font-normal">°C</span>
                                    </div>
                                </div>
                            </div>

                            {(() => {
                                return <label className="block text-sm font-semibold mb-2 text-gray-700">Descanso estación {tire}:</label>;
                            })()}
                            <div className="grid grid-cols-2 gap-2">
                                {(['TL', 'TR', 'BL', 'BR'] as const).map((pos) => {
                                    const fieldName = `temp${tire}_${pos}` as keyof InspectionData;
                                    const value = data[fieldName] as string;
                                    const labels: Record<string, string> = {
                                        'TL': 'Andes/Sur',
                                        'TR': 'Pac./Sur',
                                        'BL': 'Andes/Norte',
                                        'BR': 'Pac./Norte'
                                    };

                                    return (
                                        <div key={fieldName}>
                                            <label className="block text-xs text-gray-500 mb-1">{labels[pos]}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name={fieldName}
                                                    value={value}
                                                    readOnly
                                                    tabIndex={-1}
                                                    onChange={handleChange}
                                                    placeholder="0.0"
                                                    className="w-full p-1 text-sm border border-black font-bold rounded outline-none pr-6 bg-gray-50 cursor-default text-gray-800"
                                                />
                                                <span className="absolute right-1 top-1 text-xs text-gray-400 font-normal">°C</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Nuevos campos de Desplazamientos */}
                            <label className="block text-sm font-semibold mt-6 mb-2 text-gray-700">Desplazamientos:</label>
                            <div className="grid grid-cols-2 gap-2">
                                {(['TL', 'TR', 'BL', 'BR'] as const).map((pos) => {
                                    const fieldName = `empuje${tire}_${pos}` as keyof InspectionData;
                                    const value = data[fieldName] as string;
                                    const labels: Record<string, string> = {
                                        'TL': 'Andes/Sur',
                                        'TR': 'Pac./Sur',
                                        'BL': 'Andes/Norte',
                                        'BR': 'Pac./Norte'
                                    };

                                    return (
                                        <div key={`empuje_${fieldName}`}>
                                            <label className="block text-xs text-gray-500 mb-1">{labels[pos]}</label>
                                            <div className="relative">
                                                <input
                                                    type="number"
                                                    step="0.1"
                                                    name={fieldName}
                                                    value={value}
                                                    readOnly
                                                    tabIndex={-1}
                                                    onChange={handleChange}
                                                    placeholder="0.0"
                                                    className="w-full p-1 text-sm border border-black font-bold rounded outline-none pr-8 bg-gray-100 cursor-default text-gray-800"
                                                />
                                                <span className="absolute right-2 top-1 text-xs text-blue-600 font-medium">mm</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Sección de Observaciones */}
            <div className="mt-8 pt-6 border-t border-gray-200">
                <label className="block text-lg font-semibold mb-3 text-gray-800">Observaciones:</label>
                <textarea
                    name="observations"
                    value={data.observations}
                    onChange={(e) => onChange('observations', e.target.value)}
                    readOnly={readOnly}
                    placeholder="Escriba aquí cualquier observación adicional de la inspección..."
                    autoComplete="off"
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-gray-50 text-gray-700"
                />
            </div>
        </div>
    );
};

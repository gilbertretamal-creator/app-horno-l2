import React from 'react';
import { InspectionData } from '../types';

interface KilnDiagramProps {
    data: InspectionData;
    onChange: (field: keyof InspectionData, value: string) => void;
    readOnly?: boolean;
}

const Arrow = ({ x, y, direction, width }: { x: number, y: number, direction: 'left' | 'right', width: number }) => {
    const h = 8; // half height of arrow body
    const headW = 18;
    const headH = 16;

    if (direction === 'right') {
        const startX = x - width / 2;
        const endX = x + width / 2;
        return (
            <path d={`M ${startX} ${y - h} L ${endX - headW} ${y - h} L ${endX - headW} ${y - headH} L ${endX} ${y} L ${endX - headW} ${y + headH} L ${endX - headW} ${y + h} L ${startX} ${y + h} Z`} fill="red" stroke="black" strokeWidth="2" />
        );
    } else {
        const startX = x + width / 2;
        const endX = x - width / 2;
        return (
            <path d={`M ${startX} ${y - h} L ${endX + headW} ${y - h} L ${endX + headW} ${y - headH} L ${endX} ${y} L ${endX + headW} ${y + headH} L ${endX + headW} ${y + h} L ${startX} ${y + h} Z`} fill="red" stroke="black" strokeWidth="2" />
        );
    }
};

export const KilnDiagram: React.FC<KilnDiagramProps> = ({ data, onChange, readOnly = false }) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        // Normalize comma to dot for empuje (desplazamiento) fields
        const normalizedValue = name.startsWith('empuje') ? value.replace(',', '.') : value;
        onChange(name as keyof InspectionData, normalizedValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
        if (!allowedKeys.includes(e.key)) return;

        e.preventDefault();

        const currentInput = e.currentTarget;
        const currentRect = currentInput.getBoundingClientRect();
        const currentCenter = {
            x: currentRect.left + currentRect.width / 2,
            y: currentRect.top + currentRect.height / 2
        };

        const inputs = Array.from(document.querySelectorAll('.diagram-input')) as HTMLInputElement[];

        let bestMatch: HTMLInputElement | null = null;
        let bestScore = Infinity;

        inputs.forEach(input => {
            if (input === currentInput) return;

            const rect = input.getBoundingClientRect();
            const center = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2
            };

            const dx = center.x - currentCenter.x;
            const dy = center.y - currentCenter.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Angle in degrees (-180 to 180)
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);

            let isCandidate = false;
            let alignmentPenalty = 0;

            switch (e.key) {
                case 'ArrowRight':
                    isCandidate = dx > 0 && Math.abs(angle) < 60; // Wider angle to catch adjacent tires
                    alignmentPenalty = Math.abs(dy);
                    break;
                case 'ArrowLeft':
                    isCandidate = dx < 0 && Math.abs(angle) > 120;
                    alignmentPenalty = Math.abs(dy);
                    break;
                case 'ArrowUp':
                    isCandidate = dy < 0 && angle > -150 && angle < -30;
                    alignmentPenalty = Math.abs(dx);
                    break;
                case 'ArrowDown':
                    isCandidate = dy > 0 && angle > 30 && angle < 150;
                    alignmentPenalty = Math.abs(dx);
                    break;
            }

            if (isCandidate) {
                // Weight alignment heavily to prefer straight lines over diagonals
                const score = distance + (alignmentPenalty * 3);
                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = input;
                }
            }
        });

        if (bestMatch) {
            (bestMatch as HTMLInputElement).focus();
            setTimeout(() => (bestMatch as HTMLInputElement).select(), 0);
        }
    };

    const getArrowDirection = (valL: string, valR: string): 'left' | 'right' | null => {
        const numL = parseFloat(valL);
        const numR = parseFloat(valR);
        if (isNaN(numL) || isNaN(numR) || numL === numR) return null;
        return numL < numR ? 'right' : 'left';
    };

    return (
        <div className="w-full flex justify-center py-8 relative">
            <svg viewBox="-20 -60 920 400" className="w-full max-w-5xl h-auto drop-shadow-xl overflow-visible">
                {/* Main Kiln Body - Gradient Orange */}
                <defs>
                    <linearGradient id="kilnGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#f97316" />
                        <stop offset="50%" stopColor="#ea580c" />
                        <stop offset="100%" stopColor="#c2410c" />
                    </linearGradient>
                    <linearGradient id="tireGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#9ca3af" />
                        <stop offset="50%" stopColor="#6b7280" />
                        <stop offset="100%" stopColor="#4b5563" />
                    </linearGradient>
                    <linearGradient id="rollerGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#e5e7eb" />
                        <stop offset="50%" stopColor="#d1d5db" />
                        <stop offset="100%" stopColor="#9ca3af" />
                    </linearGradient>
                </defs>

                <rect x="20" y="80" width="860" height="100" fill="url(#kilnGradient)" stroke="#7c2d12" strokeWidth="2" />

                {/* Rotation Arrow */}
                <path d="M 230 185 C 230 230, 270 230, 270 185 L 265 185 L 275 170 L 285 185 L 280 185 C 280 245, 220 245, 220 185 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

                {/* Feed Arrows */}
                <path d="M 870 130 L 810 130 L 810 125 L 790 135 L 810 145 L 810 140 L 870 140 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                <path d="M 110 130 L 50 130 L 50 125 L 30 135 L 50 145 L 50 140 L 110 140 Z" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

                {/* Thrust Rollers (on Tire III) */}
                <circle cx="530" cy="130" r="12" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />
                <circle cx="575" cy="130" r="12" fill="#fef08a" stroke="#ca8a04" strokeWidth="1" />

                {/* Tires and Rollers */}
                {[
                    { x: 150, label: 'I', key: 'tempI', innerKey: 'innerI', empuje: 'empujeI' },
                    { x: 350, label: 'II', key: 'tempII', innerKey: 'innerII', empuje: 'empujeII' },
                    { x: 550, label: 'III', key: 'tempIII', innerKey: 'innerIII', empuje: 'empujeIII' },
                    { x: 750, label: 'IV', key: 'tempIV', innerKey: 'innerIV', empuje: 'empujeIV' }
                ].map((tire, idx) => {
                    // @ts-expect-error: dynamic key access
                    const topDir = getArrowDirection(data[`${tire.empuje}_TL`], data[`${tire.empuje}_TR`]);
                    // @ts-expect-error: dynamic key access
                    const botDir = getArrowDirection(data[`${tire.empuje}_BL`], data[`${tire.empuje}_BR`]);

                    return (
                        <g key={idx}>
                            {/* Tire */}
                            <rect x={tire.x - 12} y="45" width="24" height="170" fill="url(#tireGradient)" stroke="#374151" strokeWidth="2" />
                            <text x={tire.x} y="135" fill="black" fontSize="14" fontWeight="bold" textAnchor="middle">{tire.label}</text>

                            {/* Top Roller Assembly */}
                            <rect x={tire.x - 25} y="20" width="50" height="35" fill="url(#rollerGradient)" stroke="#4b5563" strokeWidth="1" />
                            <rect x={tire.x - 35} y="30" width="10" height="15" fill="#fef08a" stroke="#ca8a04" />
                            <rect x={tire.x + 25} y="30" width="10" height="15" fill="#fef08a" stroke="#ca8a04" />
                            <rect x={tire.x - 45} y="25" width="10" height="25" fill="#e5e7eb" stroke="#9ca3af" />
                            <rect x={tire.x + 35} y="25" width="10" height="25" fill="#e5e7eb" stroke="#9ca3af" />

                            {/* Bottom Roller Assembly */}
                            <rect x={tire.x - 25} y="205" width="50" height="35" fill="url(#rollerGradient)" stroke="#4b5563" strokeWidth="1" />
                            <rect x={tire.x - 35} y="215" width="10" height="15" fill="#fef08a" stroke="#ca8a04" />
                            <rect x={tire.x + 25} y="215" width="10" height="15" fill="#fef08a" stroke="#ca8a04" />
                            <rect x={tire.x - 45} y="210" width="10" height="25" fill="#e5e7eb" stroke="#9ca3af" />
                            <rect x={tire.x + 35} y="210" width="10" height="25" fill="#e5e7eb" stroke="#9ca3af" />

                            {/* Outer Temperature Boxes */}
                            <foreignObject x={tire.x - 40} y="-15" width="35" height="25">
                                <input
                                    type="text"
                                    name={`${tire.key}_TL`}
                                    value={data[`${tire.key}_TL` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[2px] border-black text-center text-xs outline-none bg-white font-bold p-0"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            <foreignObject x={tire.x + 5} y="-15" width="35" height="25">
                                <input
                                    type="text"
                                    name={`${tire.key}_TR`}
                                    value={data[`${tire.key}_TR` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[2px] border-black text-center text-xs outline-none bg-white font-bold p-0"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            <foreignObject x={tire.x - 40} y="250" width="35" height="25">
                                <input
                                    type="text"
                                    name={`${tire.key}_BL`}
                                    value={data[`${tire.key}_BL` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[2px] border-black text-center text-xs outline-none bg-white font-bold p-0"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            <foreignObject x={tire.x + 5} y="250" width="35" height="25">
                                <input
                                    type="text"
                                    name={`${tire.key}_BR`}
                                    value={data[`${tire.key}_BR` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[2px] border-black text-center text-xs outline-none bg-white font-bold p-0"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            {/* Inner Shell Temperature Box */}
                            <foreignObject x={tire.x - 20} y="150" width="40" height="25">
                                <input
                                    type="text"
                                    name={tire.innerKey}
                                    value={data[tire.innerKey as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[3px] border-black text-center text-xs outline-none bg-white font-bold px-1"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            {/* Andes Box (Left side of tire) */}
                            <foreignObject x={tire.x - 45} y="85" width="40" height="25">
                                <input
                                    type="text"
                                    name={`andes${tire.label}`}
                                    value={data[`andes${tire.label}` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[3px] border-black text-center text-xs outline-none bg-white font-bold px-1"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            {/* Pacifico Box (Right side of tire) */}
                            <foreignObject x={tire.x + 5} y="85" width="40" height="25">
                                <input
                                    type="text"
                                    name={`pacifico${tire.label}`}
                                    value={data[`pacifico${tire.label}` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    className="diagram-input w-full h-full border-[3px] border-black text-center text-xs outline-none bg-white font-bold px-1"
                                    placeholder="..."
                                    autoComplete="off"
                                />
                            </foreignObject>

                            {/* Thrust/Empuje Boxes (Left and Right of Rollers) - Using Writing Mode Vertical */}
                            {/* Top Left */}
                            <foreignObject x={tire.x - 67} y="20" width="22" height="35">
                                <input
                                    type="text"
                                    name={`${tire.empuje}_TL`}
                                    value={data[`${tire.empuje}_TL` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                    className="diagram-input w-full h-full border-[3px] border-blue-800 text-center text-xs outline-none bg-blue-50 font-bold p-0"
                                    placeholder="mm"
                                    autoComplete="off"
                                />
                            </foreignObject>
                            {/* Top Right */}
                            <foreignObject x={tire.x + 45} y="20" width="22" height="35">
                                <input
                                    type="text"
                                    name={`${tire.empuje}_TR`}
                                    value={data[`${tire.empuje}_TR` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                    className="diagram-input w-full h-full border-[3px] border-blue-800 text-center text-xs outline-none bg-blue-50 font-bold p-0"
                                    placeholder="mm"
                                    autoComplete="off"
                                />
                            </foreignObject>
                            {/* Bottom Left */}
                            <foreignObject x={tire.x - 67} y="205" width="22" height="35">
                                <input
                                    type="text"
                                    name={`${tire.empuje}_BL`}
                                    value={data[`${tire.empuje}_BL` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                    className="diagram-input w-full h-full border-[3px] border-blue-800 text-center text-xs outline-none bg-blue-50 font-bold p-0"
                                    placeholder="mm"
                                    autoComplete="off"
                                />
                            </foreignObject>
                            {/* Bottom Right */}
                            <foreignObject x={tire.x + 45} y="205" width="22" height="35">
                                <input
                                    type="text"
                                    name={`${tire.empuje}_BR`}
                                    value={data[`${tire.empuje}_BR` as keyof InspectionData]}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    readOnly={readOnly}
                                    style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}
                                    className="diagram-input w-full h-full border-[3px] border-blue-800 text-center text-xs outline-none bg-blue-50 font-bold p-0"
                                    placeholder="mm"
                                    autoComplete="off"
                                />
                            </foreignObject>

                            {/* Direction Arrows - Lifted/Dropped to avoid boxes */}
                            {topDir && <Arrow x={tire.x} y={-35} direction={topDir} width={90} />}
                            {botDir && <Arrow x={tire.x} y={300} direction={botDir} width={90} />}

                        </g>
                    );
                })}
            </svg>
        </div>
    );
};

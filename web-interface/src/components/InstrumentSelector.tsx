import { Music, Wind, Music2 } from 'lucide-react';
import type { InstrumentId } from '../audio/types';
import './InstrumentSelector.css';

const instruments = [
    { id: 'violin' as InstrumentId, name: 'Violin', icon: Music, color: 'var(--color-primary)' },
    { id: 'flute' as InstrumentId, name: 'Flute', icon: Wind, color: 'var(--color-accent)', disabled: true },
    { id: 'cello' as InstrumentId, name: 'Cello', icon: Music2, color: 'var(--color-success)', disabled: true },
];

interface InstrumentSelectorProps {
    value: InstrumentId;
    onChange: (id: InstrumentId) => void;
}

export function InstrumentSelector({ value, onChange }: InstrumentSelectorProps) {
    return (
        <div className="card instrument-card">
            <div className="card-header">
                <div className="card-title">
                    <Music size={20} className="text-accent" />
                    <h3>Instrument</h3>
                </div>
            </div>

            <div className="instrument-grid">
                {instruments.map((inst) => (
                    <button
                        key={inst.id}
                        className={`instrument-option ${value === inst.id ? 'active' : ''} ${inst.disabled ? 'disabled-inst' : ''}`}
                        onClick={() => onChange(inst.id)}
                        style={{ '--active-color': inst.color } as React.CSSProperties}
                    >
                        <div className="instrument-icon">
                            <inst.icon size={24} />
                        </div>
                        <span className="instrument-name">{inst.name}</span>
                        {inst.disabled && <span className="coming-soon">Soon</span>}
                        {value === inst.id && <div className="active-indicator"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
}

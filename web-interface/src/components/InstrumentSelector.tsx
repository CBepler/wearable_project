import { Music, Piano } from 'lucide-react';
import type { InstrumentId } from '../audio/types';
import './InstrumentSelector.css';

interface InstrumentDef {
    id: InstrumentId;
    name: string;
    icon: typeof Music;
    color: string;
    mode: 'analog' | 'digital';
    disabled?: boolean;
}

const instruments: InstrumentDef[] = [
    { id: 'violin', name: 'Violin', icon: Music, color: 'var(--color-primary)', mode: 'analog' },
    { id: 'piano', name: 'Piano', icon: Piano, color: 'var(--color-accent)', mode: 'digital' },
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
                        onClick={() => !inst.disabled && onChange(inst.id)}
                        style={{ '--active-color': inst.color } as React.CSSProperties}
                    >
                        <div className="instrument-icon">
                            <inst.icon size={24} />
                        </div>
                        <span className="instrument-name">{inst.name}</span>
                        <span className="instrument-mode-hint">{inst.mode}</span>
                        {inst.disabled && <span className="coming-soon">Soon</span>}
                        {value === inst.id && <div className="active-indicator" />}
                    </button>
                ))}
            </div>
        </div>
    );
}

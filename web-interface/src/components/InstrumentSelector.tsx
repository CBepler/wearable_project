import { useState } from 'react';
import { Music, Guitar, Drum } from 'lucide-react'; // Assuming available icons
import './InstrumentSelector.css';

const instruments = [
    { id: 'guitar', name: 'Guitar', icon: Guitar, color: 'var(--color-primary)' },
    { id: 'piano', name: 'Piano', icon: Music, color: 'var(--color-accent)' }, // Using Music generic for Piano if specific unavailable
    { id: 'drums', name: 'Drums', icon: Drum, color: 'var(--color-success)' }, // Using a generic icon if Drum not available, let's check imports
];

export function InstrumentSelector() {
    const [selectedId, setSelectedId] = useState('guitar');

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
                        className={`instrument-option ${selectedId === inst.id ? 'active' : ''}`}
                        onClick={() => setSelectedId(inst.id)}
                        style={{ '--active-color': inst.color } as React.CSSProperties}
                    >
                        <div className="instrument-icon">
                            {/* Render icon component */}
                            <inst.icon size={24} />
                        </div>
                        <span className="instrument-name">{inst.name}</span>
                        {selectedId === inst.id && <div className="active-indicator"></div>}
                    </button>
                ))}
            </div>
        </div>
    );
}

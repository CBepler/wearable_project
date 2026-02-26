import { Volume2, Hand } from 'lucide-react';
import type { DisplayParams, SensorMode } from '../audio/types';
import { FINGER_NAMES, FINGER_COLORS } from '../audio/types';
import './SoundOutputDisplay.css';

interface SoundOutputDisplayProps {
    params: DisplayParams | undefined;
    isPlaying: boolean;
    sensorMode: SensorMode;
}

interface MeterConfig {
    label: string;
    value: number;
    displayValue: string;
    min: number;
    max: number;
    color: string;
}

const DEFAULT_DISPLAY: DisplayParams = {
    note: '—', frequency: 0, volumePct: 0,
    pan: 0, tremoloPct: 0, brightnessPct: 0,
    activeFingers: [false, false, false, false, false],
};

export function SoundOutputDisplay({ params, isPlaying, sensorMode }: SoundOutputDisplayProps) {
    const p = params ?? DEFAULT_DISPLAY;

    // ── Analog meters ────────────────────────────────────────────────
    const analogMeters: MeterConfig[] = [
        {
            label: 'Note',
            value: p.frequency,
            displayValue: `${p.note}  (${p.frequency} Hz)`,
            min: 130, max: 1047,
            color: 'var(--color-primary)',
        },
        {
            label: 'Volume',
            value: p.volumePct,
            displayValue: `${p.volumePct}%`,
            min: 0, max: 100,
            color: 'var(--color-success)',
        },
        {
            label: 'Pan',
            value: p.pan + 1,
            displayValue: p.pan < -0.05 ? `L ${Math.abs(p.pan * 100).toFixed(0)}%` : p.pan > 0.05 ? `R ${(p.pan * 100).toFixed(0)}%` : 'Center',
            min: 0, max: 2,
            color: 'var(--color-warning)',
        },
        {
            label: 'Tremolo',
            value: p.tremoloPct,
            displayValue: `${p.tremoloPct}%`,
            min: 0, max: 100,
            color: 'var(--color-primary)',
        },
        {
            label: 'Brightness',
            value: p.brightnessPct,
            displayValue: `${p.brightnessPct}%`,
            min: 0, max: 100,
            color: 'var(--color-accent)',
        },
    ];

    return (
        <div className="card sound-output-card">
            <div className="card-header">
                <div className="card-title">
                    <Volume2 size={20} className="text-primary" />
                    <h3>Sound Output</h3>
                </div>
                <span className={`output-status ${isPlaying ? 'active' : ''}`}>
                    {isPlaying ? '● ACTIVE' : '○ IDLE'}
                </span>
            </div>

            {sensorMode === 'analog' ? (
                <div className="meters-grid">
                    {analogMeters.map((m) => {
                        const pct = ((m.value - m.min) / (m.max - m.min)) * 100;
                        return (
                            <div className="meter" key={m.label}>
                                <div className="meter-header">
                                    <span className="meter-label">{m.label}</span>
                                    <span className="meter-value" style={{ color: m.color }}>{m.displayValue}</span>
                                </div>
                                <div className="meter-bar-bg">
                                    <div
                                        className={`meter-bar-fill ${isPlaying ? 'animate' : ''}`}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, pct))}%`,
                                            backgroundColor: m.color,
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="digital-output">
                    <div className="digital-note-display">
                        <span className="digital-note-label">Active Note</span>
                        <span className="digital-note-value">{p.note}</span>
                    </div>
                    <div className="finger-keys">
                        <Hand size={18} className="text-muted" />
                        {FINGER_NAMES.map((name, i) => (
                            <div
                                key={name}
                                className={`finger-key ${p.activeFingers[i] ? 'active' : ''}`}
                                style={{
                                    '--finger-color': FINGER_COLORS[name],
                                } as React.CSSProperties}
                            >
                                <span className="finger-key-label">{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                                <span className="finger-key-note">{['C4', 'D4', 'E4', 'G4', 'A4'][i]}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

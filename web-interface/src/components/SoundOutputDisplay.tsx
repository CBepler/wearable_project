import { Volume2 } from 'lucide-react';
import type { DisplayParams } from '../audio/types';
import './SoundOutputDisplay.css';

interface SoundOutputDisplayProps {
    params: DisplayParams | undefined;
    isPlaying: boolean;
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
    detune: 0, pan: 0, tremoloPct: 0, brightnessPct: 0,
};

export function SoundOutputDisplay({ params, isPlaying }: SoundOutputDisplayProps) {
    const p = params ?? DEFAULT_DISPLAY;

    const meters: MeterConfig[] = [
        {
            label: 'Note',
            value: p.frequency,
            displayValue: `${p.note}  (${p.frequency} Hz)`,
            min: 130,
            max: 1047,
            color: 'var(--color-primary)',
        },
        {
            label: 'Volume',
            value: p.volumePct,
            displayValue: `${p.volumePct}%`,
            min: 0,
            max: 100,
            color: 'var(--color-success)',
        },
        {
            label: 'Detune',
            value: p.detune + 100,
            displayValue: `${p.detune > 0 ? '+' : ''}${p.detune}¢`,
            min: 0,
            max: 200,
            color: 'var(--color-accent)',
        },
        {
            label: 'Pan',
            value: p.pan + 1,
            displayValue: p.pan < -0.05 ? `L ${Math.abs(p.pan * 100).toFixed(0)}%` : p.pan > 0.05 ? `R ${(p.pan * 100).toFixed(0)}%` : 'Center',
            min: 0,
            max: 2,
            color: 'var(--color-warning)',
        },
        {
            label: 'Tremolo',
            value: p.tremoloPct,
            displayValue: `${p.tremoloPct}%`,
            min: 0,
            max: 100,
            color: 'var(--color-primary)',
        },
        {
            label: 'Brightness',
            value: p.brightnessPct,
            displayValue: `${p.brightnessPct}%`,
            min: 0,
            max: 100,
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

            <div className="meters-grid">
                {meters.map((m) => {
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
        </div>
    );
}

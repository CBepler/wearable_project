import { Volume2 } from 'lucide-react';
import type { SoundParams } from '../audio/types';
import './SoundOutputDisplay.css';

interface SoundOutputDisplayProps {
    params: SoundParams;
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

export function SoundOutputDisplay({ params, isPlaying }: SoundOutputDisplayProps) {
    const meters: MeterConfig[] = [
        {
            label: 'Frequency',
            value: params.frequency,
            displayValue: `${params.frequency.toFixed(0)} Hz`,
            min: 130,
            max: 1047,
            color: 'var(--color-primary)',
        },
        {
            label: 'Volume',
            value: params.gain,
            displayValue: `${(params.gain * 100).toFixed(0)}%`,
            min: 0,
            max: 1,
            color: 'var(--color-success)',
        },
        {
            label: 'Detune',
            value: params.detune + 100, // shift to 0–200 range for the bar
            displayValue: `${params.detune > 0 ? '+' : ''}${params.detune.toFixed(0)}¢`,
            min: 0,
            max: 200,
            color: 'var(--color-accent)',
        },
        {
            label: 'Pan',
            value: params.pan + 1, // shift to 0–2 range
            displayValue: params.pan < -0.05 ? `L ${Math.abs(params.pan * 100).toFixed(0)}%` : params.pan > 0.05 ? `R ${(params.pan * 100).toFixed(0)}%` : 'Center',
            min: 0,
            max: 2,
            color: 'var(--color-warning)',
        },
        {
            label: 'Tremolo',
            value: params.tremoloRate,
            displayValue: `${params.tremoloRate.toFixed(1)} Hz`,
            min: 0,
            max: 15,
            color: 'var(--color-primary)',
        },
        {
            label: 'Filter',
            value: params.filterCutoff,
            displayValue: `${params.filterCutoff.toFixed(0)} Hz`,
            min: 200,
            max: 8000,
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

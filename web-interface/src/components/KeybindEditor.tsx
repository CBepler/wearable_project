import { useState } from 'react';
import { Settings2, RotateCcw } from 'lucide-react';
import * as Tone from 'tone';
import type { KeybindConfig, AnalogKeybinds, DigitalKeybinds, SensorSource, AnalogParam, SensorMode, FingerName } from '../audio/types';
import { ANALOG_PARAMS, ALL_SENSOR_SOURCES, FINGER_NAMES, FINGER_COLORS, DEFAULT_KEYBIND_CONFIG } from '../audio/types';
import './KeybindEditor.css';

interface KeybindEditorProps {
    config: KeybindConfig;
    onChange: (config: KeybindConfig) => void;
    sensorMode: SensorMode;
}

const PARAM_LABELS: Record<AnalogParam, string> = {
    pitch: 'Pitch',
    volume: 'Volume',
    brightness: 'Brightness',
    tremolo: 'Tremolo',
    pan: 'Pan',
};

const SOURCE_LABELS: Record<SensorSource, string> = {
    thumb: 'Thumb',
    index: 'Index',
    middle: 'Middle',
    ring: 'Ring',
    pinky: 'Pinky',
    roll: 'Roll',
    pitch: 'Pitch',
    yaw: 'Yaw',
};

function AnalogBindings({ binds, onChange }: { binds: AnalogKeybinds; onChange: (b: AnalogKeybinds) => void }) {
    return (
        <div className="keybind-section">
            <h4 className="keybind-section-title">Sensor &rarr; Parameter</h4>
            {ANALOG_PARAMS.map(param => (
                <div className="keybind-row" key={param}>
                    <span className="keybind-param-label">{PARAM_LABELS[param]}</span>
                    <span className="keybind-arrow">&larr;</span>
                    <select
                        className="keybind-select"
                        value={binds[param]}
                        onChange={e => onChange({ ...binds, [param]: e.target.value as SensorSource })}
                    >
                        {ALL_SENSOR_SOURCES.map(src => (
                            <option key={src} value={src}>{SOURCE_LABELS[src]}</option>
                        ))}
                    </select>
                </div>
            ))}
        </div>
    );
}

function DigitalBindings({ binds, onChange }: { binds: DigitalKeybinds; onChange: (b: DigitalKeybinds) => void }) {
    const [editValues, setEditValues] = useState<Record<FingerName, string>>(() =>
        Object.fromEntries(FINGER_NAMES.map(f => [f, binds[f].join(', ')])) as Record<FingerName, string>
    );

    const commit = (finger: FingerName) => {
        const raw = editValues[finger];
        const notes = raw.split(',').map(s => s.trim()).filter(Boolean);
        const valid = notes.filter(n => {
            try { Tone.Frequency(n).toFrequency(); return true; }
            catch { return false; }
        });
        if (valid.length > 0) {
            onChange({ ...binds, [finger]: valid });
            setEditValues(prev => ({ ...prev, [finger]: valid.join(', ') }));
        } else {
            setEditValues(prev => ({ ...prev, [finger]: binds[finger].join(', ') }));
        }
    };

    return (
        <div className="keybind-section">
            <h4 className="keybind-section-title">Finger &rarr; Notes</h4>
            {FINGER_NAMES.map(finger => (
                <div className="keybind-row" key={finger}>
                    <span className="keybind-finger-label" style={{ color: FINGER_COLORS[finger] }}>
                        {finger.charAt(0).toUpperCase() + finger.slice(1)}
                    </span>
                    <span className="keybind-arrow">&rarr;</span>
                    <input
                        className="keybind-note-input"
                        value={editValues[finger]}
                        onChange={e => setEditValues(prev => ({ ...prev, [finger]: e.target.value }))}
                        onBlur={() => commit(finger)}
                        onKeyDown={e => e.key === 'Enter' && commit(finger)}
                        placeholder="e.g. C4, E4, G4"
                    />
                </div>
            ))}
            <p className="keybind-hint">Comma-separated for chords</p>
        </div>
    );
}

export function KeybindEditor({ config, onChange, sensorMode }: KeybindEditorProps) {
    const handleReset = () => onChange(DEFAULT_KEYBIND_CONFIG);

    return (
        <div className="card keybind-card">
            <div className="card-header">
                <div className="card-title">
                    <Settings2 size={20} className="text-primary" />
                    <h3>Keybinds</h3>
                </div>
                <button className="keybind-reset-btn" onClick={handleReset} title="Reset to defaults">
                    <RotateCcw size={14} />
                </button>
            </div>

            {sensorMode === 'analog' ? (
                <AnalogBindings
                    binds={config.analog}
                    onChange={analog => onChange({ ...config, analog })}
                />
            ) : (
                <DigitalBindings
                    binds={config.digital}
                    onChange={digital => onChange({ ...config, digital })}
                />
            )}
        </div>
    );
}

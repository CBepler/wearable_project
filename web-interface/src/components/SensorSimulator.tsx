import { useState, useCallback, useRef, useEffect } from 'react';
import { Hand, Play, Square, RotateCcw } from 'lucide-react';
import type { SensorData, SensorMode, FingerName, OrientationName, CalibrationConfig } from '../audio/types';
import { DEFAULT_SENSOR_DATA, FINGER_NAMES, FINGER_COLORS, ORIENTATION_NAMES, ORIENTATION_COLORS } from '../audio/types';
import './SensorSimulator.css';

interface SliderConfig {
    key: FingerName;
    label: string;
    emoji: string;
    color: string;
}

interface OrientationSliderConfig {
    key: OrientationName;
    label: string;
    emoji: string;
    color: string;
}

const FINGER_SLIDERS: SliderConfig[] = FINGER_NAMES.map((name) => ({
    key: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    emoji: { thumb: '👍', index: '👆', middle: '🖕', ring: '💍', pinky: '🤙' }[name],
    color: FINGER_COLORS[name],
}));

const ORIENTATION_SLIDERS: OrientationSliderConfig[] = ORIENTATION_NAMES.map((name) => ({
    key: name,
    label: name.charAt(0).toUpperCase() + name.slice(1),
    emoji: { roll: '🔄', pitch: '↕️', yaw: '↔️' }[name],
    color: ORIENTATION_COLORS[name],
}));

interface SensorSimulatorProps {
    sensorData: SensorData;
    onSensorChange: (data: SensorData) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    sensorMode: SensorMode;
    calibration: CalibrationConfig;
}

export function SensorSimulator({
    sensorData,
    onSensorChange,
    isPlaying,
    onTogglePlay,
    sensorMode,
    calibration,
}: SensorSimulatorProps) {
    const handleSliderChange = useCallback(
        (key: FingerName | OrientationName, value: number) => {
            onSensorChange({ ...sensorData, [key]: value });
        },
        [sensorData, onSensorChange],
    );

    const handleReset = useCallback(() => {
        onSensorChange({ ...DEFAULT_SENSOR_DATA });
    }, [onSensorChange]);

    const [hoveredSlider, setHoveredSlider] = useState<string | null>(null);

    // rAF-throttled updates for smooth dragging
    const rafRef = useRef<number | null>(null);
    const pendingUpdate = useRef<{ key: FingerName | OrientationName; value: number } | null>(null);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const scheduleUpdate = useCallback(
        (key: FingerName | OrientationName, value: number) => {
            pendingUpdate.current = { key, value };
            if (rafRef.current === null) {
                rafRef.current = requestAnimationFrame(() => {
                    rafRef.current = null;
                    if (pendingUpdate.current) {
                        handleSliderChange(pendingUpdate.current.key, pendingUpdate.current.value);
                        pendingUpdate.current = null;
                    }
                });
            }
        },
        [handleSliderChange],
    );

    const renderSlider = (cfg: SliderConfig) => {
        const value = sensorData[cfg.key];
        const pct = value * 100;
        const isOn = sensorMode === 'digital' && value >= calibration.digitalThreshold;

        return (
            <div
                className={`sim-slider-row ${hoveredSlider === cfg.key ? 'hovered' : ''}`}
                key={cfg.key}
                onMouseEnter={() => setHoveredSlider(cfg.key)}
                onMouseLeave={() => setHoveredSlider(null)}
            >
                <label className="sim-slider-label" style={{ color: cfg.color }}>
                    <span className="sim-finger-emoji">{cfg.emoji}</span>
                    {cfg.label}
                </label>
                <div className="sim-slider-track-wrap">
                    {sensorMode === 'digital' && (
                        <div
                            className="sim-threshold-line"
                            style={{ left: `${calibration.digitalThreshold * 100}%` }}
                        />
                    )}
                    <input
                        type="range"
                        min={0}
                        max={1}
                        step={0.01}
                        value={value}
                        onChange={(e) => scheduleUpdate(cfg.key, Number(e.target.value))}
                        className="sim-range-slider"
                        style={{
                            backgroundSize: `${pct}% 100%`,
                            '--slider-color': cfg.color,
                        } as React.CSSProperties}
                    />
                </div>
                <div className="sim-value-area">
                    {sensorMode === 'digital' && (
                        <span className={`sim-digital-dot ${isOn ? 'on' : 'off'}`} style={{ backgroundColor: isOn ? cfg.color : undefined }} />
                    )}
                    <span className="sim-value-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                        {(value * 100).toFixed(0)}%
                    </span>
                </div>
            </div>
        );
    };

    const renderOrientationSlider = (cfg: OrientationSliderConfig) => {
        const value = sensorData[cfg.key];
        const pct = ((value + 180) / 360) * 100;

        return (
            <div
                className={`sim-slider-row ${hoveredSlider === cfg.key ? 'hovered' : ''}`}
                key={cfg.key}
                onMouseEnter={() => setHoveredSlider(cfg.key)}
                onMouseLeave={() => setHoveredSlider(null)}
            >
                <label className="sim-slider-label" style={{ color: cfg.color }}>
                    <span className="sim-finger-emoji">{cfg.emoji}</span>
                    {cfg.label}
                </label>
                <div className="sim-slider-track-wrap">
                    <input
                        type="range"
                        min={-180}
                        max={180}
                        step={1}
                        value={value}
                        onChange={(e) => scheduleUpdate(cfg.key, Number(e.target.value))}
                        className="sim-range-slider"
                        style={{
                            backgroundSize: `${pct}% 100%`,
                            '--slider-color': cfg.color,
                        } as React.CSSProperties}
                    />
                </div>
                <div className="sim-value-area">
                    <span className="sim-value-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                        {value}°
                    </span>
                </div>
            </div>
        );
    };

    return (
        <div className="card sim-card">
            <div className="card-header">
                <div className="card-title">
                    <Hand size={20} className="text-primary" />
                    <h3>Sensor Simulator</h3>
                </div>
                <div className="sim-actions">
                    <span className={`sim-mode-badge ${sensorMode}`}>
                        {sensorMode === 'analog' ? '~ Analog' : '⏻ Digital'}
                    </span>
                    <button
                        className={`sim-play-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={onTogglePlay}
                        title={isPlaying ? 'Stop' : 'Play'}
                    >
                        {isPlaying ? <Square size={14} /> : <Play size={14} />}
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>
                    <button className="sim-reset-btn" onClick={handleReset} title="Reset to defaults">
                        <RotateCcw size={14} />
                    </button>
                </div>
            </div>

            <div className="sim-body">
                <div className="sim-group">
                    <h4 className="sim-group-title">Finger Bend</h4>
                    {FINGER_SLIDERS.map(renderSlider)}
                </div>
                <div className="sim-group">
                    <h4 className="sim-group-title">Orientation</h4>
                    {ORIENTATION_SLIDERS.map(renderOrientationSlider)}
                </div>
            </div>
        </div>
    );
}

import { useState, useCallback, useRef, useEffect } from 'react';
import { Sliders, Play, Square, RotateCcw } from 'lucide-react';
import type { SensorData } from '../audio/types';
import { DEFAULT_SENSOR_DATA } from '../audio/types';
import './SensorSimulator.css';

interface SliderConfig {
    key: keyof SensorData;
    label: string;
    min: number;
    max: number;
    step: number;
    unit: string;
    color: string;
}

const ACCEL_SLIDERS: SliderConfig[] = [
    { key: 'accelX', label: 'X', min: -20, max: 20, step: 0.1, unit: 'm/s²', color: 'var(--color-primary)' },
    { key: 'accelY', label: 'Y', min: -20, max: 20, step: 0.1, unit: 'm/s²', color: 'var(--color-accent)' },
    { key: 'accelZ', label: 'Z', min: -20, max: 20, step: 0.1, unit: 'm/s²', color: 'var(--color-success)' },
];

const ROTATION_SLIDERS: SliderConfig[] = [
    { key: 'roll', label: 'Roll', min: -180, max: 180, step: 1, unit: '°', color: 'var(--color-primary)' },
    { key: 'pitch', label: 'Pitch', min: -180, max: 180, step: 1, unit: '°', color: 'var(--color-accent)' },
    { key: 'yaw', label: 'Yaw', min: -180, max: 180, step: 1, unit: '°', color: 'var(--color-success)' },
];

interface SensorSimulatorProps {
    sensorData: SensorData;
    onSensorChange: (data: SensorData) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
}

export function SensorSimulator({
    sensorData,
    onSensorChange,
    isPlaying,
    onTogglePlay,
}: SensorSimulatorProps) {
    const handleSliderChange = useCallback(
        (key: keyof SensorData, value: number) => {
            onSensorChange({ ...sensorData, [key]: value });
        },
        [sensorData, onSensorChange],
    );

    const handleReset = useCallback(() => {
        onSensorChange({ ...DEFAULT_SENSOR_DATA });
    }, [onSensorChange]);

    // Track which slider label is being hovered for glow effect
    const [hoveredSlider, setHoveredSlider] = useState<string | null>(null);

    // Refs for smooth dragging — updates state at rAF rate
    const rafRef = useRef<number | null>(null);
    const pendingUpdate = useRef<{ key: keyof SensorData; value: number } | null>(null);

    useEffect(() => {
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, []);

    const scheduleUpdate = useCallback(
        (key: keyof SensorData, value: number) => {
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
        const pct = ((value - cfg.min) / (cfg.max - cfg.min)) * 100;

        return (
            <div
                className={`sim-slider-row ${hoveredSlider === cfg.key ? 'hovered' : ''}`}
                key={cfg.key}
                onMouseEnter={() => setHoveredSlider(cfg.key)}
                onMouseLeave={() => setHoveredSlider(null)}
            >
                <label className="sim-slider-label" style={{ color: cfg.color }}>
                    {cfg.label}
                </label>
                <div className="sim-slider-track-wrap">
                    <input
                        type="range"
                        min={cfg.min}
                        max={cfg.max}
                        step={cfg.step}
                        value={value}
                        onChange={(e) => scheduleUpdate(cfg.key, Number(e.target.value))}
                        className="sim-range-slider"
                        style={{
                            backgroundSize: `${pct}% 100%`,
                            '--slider-color': cfg.color,
                        } as React.CSSProperties}
                    />
                </div>
                <span className="sim-value-badge" style={{ borderColor: cfg.color, color: cfg.color }}>
                    {value.toFixed(cfg.step < 1 ? 1 : 0)}{cfg.unit}
                </span>
            </div>
        );
    };

    return (
        <div className="card sim-card">
            <div className="card-header">
                <div className="card-title">
                    <Sliders size={20} className="text-primary" />
                    <h3>Sensor Simulator</h3>
                </div>
                <div className="sim-actions">
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
                    <h4 className="sim-group-title">Acceleration</h4>
                    {ACCEL_SLIDERS.map(renderSlider)}
                </div>

                <div className="sim-group">
                    <h4 className="sim-group-title">Rotation</h4>
                    {ROTATION_SLIDERS.map(renderSlider)}
                </div>
            </div>
        </div>
    );
}

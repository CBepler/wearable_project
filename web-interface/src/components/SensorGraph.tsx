import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import type { SensorData } from '../audio/types';
import './SensorGraph.css';

const MAX_POINTS = 60;

interface DataPoint {
    time: number;
    v1: number;
    v2: number;
    v3: number;
}

type ViewMode = 'accel' | 'rotation';

interface SensorGraphProps {
    sensorData: SensorData;
}

export function SensorGraph({ sensorData }: SensorGraphProps) {
    const [viewMode, setViewMode] = useState<ViewMode>('accel');
    const [chartData, setChartData] = useState<DataPoint[]>([]);
    const tickRef = useRef(0);

    // Append a new data point every ~100 ms
    useEffect(() => {
        const id = setInterval(() => {
            tickRef.current += 1;
            const t = tickRef.current;

            setChartData((prev) => {
                const point: DataPoint =
                    viewMode === 'accel'
                        ? { time: t, v1: sensorData.accelX, v2: sensorData.accelY, v3: sensorData.accelZ }
                        : { time: t, v1: sensorData.roll, v2: sensorData.pitch, v3: sensorData.yaw };

                const next = [...prev, point];
                return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
            });
        }, 100);

        return () => clearInterval(id);
    }, [sensorData, viewMode]);

    // Reset chart data when switching views
    useEffect(() => {
        setChartData([]);
        tickRef.current = 0;
    }, [viewMode]);

    const labels =
        viewMode === 'accel'
            ? { v1: 'Accel X', v2: 'Accel Y', v3: 'Accel Z', unit: 'm/s²' }
            : { v1: 'Roll', v2: 'Pitch', v3: 'Yaw', unit: '°' };

    return (
        <div className="card sensor-graph-card">
            <div className="card-header">
                <div className="card-title">
                    <Activity size={20} className="text-primary" />
                    <h3>Motion Data</h3>
                </div>
                <div className="card-actions">
                    <div className="view-toggle">
                        <button
                            className={`toggle-btn ${viewMode === 'accel' ? 'active' : ''}`}
                            onClick={() => setViewMode('accel')}
                        >
                            Accel
                        </button>
                        <button
                            className={`toggle-btn ${viewMode === 'rotation' ? 'active' : ''}`}
                            onClick={() => setViewMode('rotation')}
                        >
                            Rotation
                        </button>
                    </div>
                    <span className="live-badge">LIVE</span>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="time" hide={true} />
                        <YAxis
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                                borderRadius: 'var(--radius-md)',
                            }}
                        />
                        <Line type="monotone" dataKey="v1" name={labels.v1} stroke="var(--color-primary)" strokeWidth={2} dot={false} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="v2" name={labels.v2} stroke="var(--color-accent)" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="v3" name={labels.v3} stroke="var(--color-success)" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                    <span>{labels.v1}</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-accent)' }}></span>
                    <span>{labels.v2}</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-success)' }}></span>
                    <span>{labels.v3}</span>
                </div>
            </div>
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import type { SensorData } from '../audio/types';
import { FINGER_NAMES, FINGER_COLORS, ORIENTATION_NAMES, ORIENTATION_COLORS } from '../audio/types';
import './SensorGraph.css';

const MAX_POINTS = 60;

interface DataPoint {
    time: number;
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
    roll: number;
    pitch: number;
    yaw: number;
}

interface SensorGraphProps {
    sensorData: SensorData;
}

export function SensorGraph({ sensorData }: SensorGraphProps) {
    const [chartData, setChartData] = useState<DataPoint[]>([]);
    const tickRef = useRef(0);

    // Append a new data point every ~100 ms
    useEffect(() => {
        const id = setInterval(() => {
            tickRef.current += 1;
            const t = tickRef.current;

            setChartData((prev) => {
                const point: DataPoint = {
                    time: t,
                    thumb: sensorData.thumb,
                    index: sensorData.index,
                    middle: sensorData.middle,
                    ring: sensorData.ring,
                    pinky: sensorData.pinky,
                    roll: (sensorData.roll + 180) / 360,
                    pitch: (sensorData.pitch + 180) / 360,
                    yaw: (sensorData.yaw + 180) / 360,
                };

                const next = [...prev, point];
                return next.length > MAX_POINTS ? next.slice(next.length - MAX_POINTS) : next;
            });
        }, 100);

        return () => clearInterval(id);
    }, [sensorData]);

    return (
        <div className="card sensor-graph-card">
            <div className="card-header">
                <div className="card-title">
                    <Activity size={20} className="text-primary" />
                    <h3>Sensor Data</h3>
                </div>
                <div className="card-actions">
                    <span className="live-badge">LIVE</span>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis dataKey="time" hide={true} />
                        <YAxis
                            stroke="var(--color-text-muted)"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            domain={[0, 1]}
                            ticks={[0, 0.25, 0.5, 0.75, 1]}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'var(--color-surface)',
                                borderColor: 'var(--color-border)',
                                color: 'var(--color-text)',
                                borderRadius: 'var(--radius-md)',
                            }}
                            formatter={(value: number | undefined, name?: string) => {
                                if (value == null) return '—';
                                const orientationKeys = ['Roll', 'Pitch', 'Yaw'];
                                if (name && orientationKeys.includes(name)) {
                                    return `${Math.round(value * 360 - 180)}°`;
                                }
                                return `${(value * 100).toFixed(0)}%`;
                            }}
                        />
                        {FINGER_NAMES.map((name) => (
                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                name={name.charAt(0).toUpperCase() + name.slice(1)}
                                stroke={FINGER_COLORS[name]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                        {ORIENTATION_NAMES.map((name) => (
                            <Line
                                key={name}
                                type="monotone"
                                dataKey={name}
                                name={name.charAt(0).toUpperCase() + name.slice(1)}
                                stroke={ORIENTATION_COLORS[name]}
                                strokeWidth={2}
                                strokeDasharray="4 2"
                                dot={false}
                                activeDot={{ r: 5 }}
                            />
                        ))}
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="legend">
                {FINGER_NAMES.map((name) => (
                    <div className="legend-item" key={name}>
                        <span className="legend-color" style={{ backgroundColor: FINGER_COLORS[name] }} />
                        <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    </div>
                ))}
                {ORIENTATION_NAMES.map((name) => (
                    <div className="legend-item" key={name}>
                        <span className="legend-color" style={{ backgroundColor: ORIENTATION_COLORS[name] }} />
                        <span>{name.charAt(0).toUpperCase() + name.slice(1)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

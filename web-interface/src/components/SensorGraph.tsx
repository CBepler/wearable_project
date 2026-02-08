import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { Activity } from 'lucide-react';
import './SensorGraph.css';

// Mock data generator for initial display
const generateMockData = () => {
    const data = [];
    for (let i = 0; i < 50; i++) {
        data.push({
            time: i,
            x: Math.sin(i * 0.2) * 50 + (Math.random() - 0.5) * 10,
            y: Math.cos(i * 0.2) * 50 + (Math.random() - 0.5) * 10,
            z: Math.sin(i * 0.1) * 30 + (Math.random() - 0.5) * 5,
        });
    }
    return data;
};

const data = generateMockData();

export function SensorGraph() {
    return (
        <div className="card sensor-graph-card">
            <div className="card-header">
                <div className="card-title">
                    <Activity size={20} className="text-primary" />
                    <h3>Motion Data</h3>
                </div>
                <div className="card-actions">
                    {/* Placeholder for future time-range or play/pause controls */}
                    <span className="live-badge">LIVE</span>
                </div>
            </div>

            <div className="chart-container">
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                        <XAxis
                            dataKey="time"
                            hide={true}
                        />
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
                                borderRadius: 'var(--radius-md)'
                            }}
                        />
                        <Line
                            type="monotone"
                            dataKey="x"
                            stroke="var(--color-primary)"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="y"
                            stroke="var(--color-accent)"
                            strokeWidth={2}
                            dot={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="z"
                            stroke="var(--color-success)"
                            strokeWidth={2}
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div className="legend">
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-primary)' }}></span>
                    <span>Rotation X</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-accent)' }}></span>
                    <span>Rotation Y</span>
                </div>
                <div className="legend-item">
                    <span className="legend-color" style={{ backgroundColor: 'var(--color-success)' }}></span>
                    <span>Rotation Z</span>
                </div>
            </div>
        </div>
    );
}

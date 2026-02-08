import type { ReactNode } from 'react';
import './Dashboard.css';

interface DashboardProps {
    children?: ReactNode;
}

export function Dashboard({ children }: DashboardProps) {
    return (
        <div className="dashboard">
            <section className="dashboard-header">
                <h2>Live Monitor</h2>
                <div className="status-indicator">
                    <span className="status-dot"></span>
                    Connected
                </div>
            </section>

            <div className="dashboard-grid">
                {children}
            </div>
        </div>
    );
}

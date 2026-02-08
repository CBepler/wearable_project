import type { ReactNode } from 'react';
import './Layout.css';
import { Activity } from 'lucide-react';

interface LayoutProps {
    children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
    return (
        <div className="layout">
            <header className="header">
                <div className="header-brand">
                    <Activity className="brand-icon" />
                    <h1>Wearable Synth</h1>
                </div>

            </header>
            <main className="main-content">
                {children}
            </main>
            <footer className="footer">
                <p>Wearable Project &copy; 2026</p>
            </footer>
        </div>
    );
}

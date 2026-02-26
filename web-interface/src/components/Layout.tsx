import type { ReactNode } from 'react';
import './Layout.css';
import { Activity, Sliders, Radio } from 'lucide-react';

export type PageId = 'monitor' | 'simulator';

interface LayoutProps {
    children: ReactNode;
    activePage: PageId;
    onPageChange: (page: PageId) => void;
}

export function Layout({ children, activePage, onPageChange }: LayoutProps) {
    return (
        <div className="layout">
            <header className="header">
                <div className="header-brand">
                    <Activity className="brand-icon" />
                    <h1>Wearable Synth</h1>
                </div>

                <nav className="header-nav">
                    <button
                        className={`nav-tab ${activePage === 'monitor' ? 'active' : ''}`}
                        onClick={() => onPageChange('monitor')}
                    >
                        <Radio size={16} />
                        Live Monitor
                    </button>
                    <button
                        className={`nav-tab ${activePage === 'simulator' ? 'active' : ''}`}
                        onClick={() => onPageChange('simulator')}
                    >
                        <Sliders size={16} />
                        Simulator
                    </button>
                </nav>
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

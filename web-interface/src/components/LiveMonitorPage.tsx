import type { SensorData, InstrumentId, SensorMode, DisplayParams, KeybindConfig } from '../audio/types';
import type { ConnectionStatus } from '../hooks/useLiveSensor';
import { SensorGraph } from './SensorGraph';
import { InstrumentSelector } from './InstrumentSelector';
import { KeybindEditor } from './KeybindEditor';
import { SoundOutputDisplay } from './SoundOutputDisplay';
import './LiveMonitorPage.css';

interface LiveMonitorPageProps {
    sensorData: SensorData;
    isPlaying: boolean;
    sensorMode: SensorMode;
    instrumentId: InstrumentId;
    onInstrumentChange: (id: InstrumentId) => void;
    onTogglePlay: () => void;
    displayParams: DisplayParams | undefined;
    liveEnabled: boolean;
    onToggleLive: () => void;
    liveStatus: ConnectionStatus;
    keybindConfig: KeybindConfig;
    onKeybindChange: (config: KeybindConfig) => void;
}

const STATUS_LABEL: Record<ConnectionStatus, string> = {
    disconnected: 'Disconnected',
    connecting: 'Connecting…',
    connected: 'Live',
};

const STATUS_COLOR: Record<ConnectionStatus, string> = {
    disconnected: '#94a3b8',
    connecting: '#fbbf24',
    connected: '#4ade80',
};

export function LiveMonitorPage({
    sensorData,
    isPlaying,
    sensorMode,
    instrumentId,
    onInstrumentChange,
    onTogglePlay,
    displayParams,
    liveEnabled,
    onToggleLive,
    liveStatus,
    keybindConfig,
    onKeybindChange,
}: LiveMonitorPageProps) {
    return (
        <div className="live-monitor-page">
            <div className="monitor-main">
                <div className="live-controls">
                    <button
                        className={`live-toggle-btn ${liveEnabled ? 'active' : ''}`}
                        onClick={onToggleLive}
                    >
                        <span
                            className="status-dot"
                            style={{ backgroundColor: STATUS_COLOR[liveStatus] }}
                        />
                        {liveEnabled ? STATUS_LABEL[liveStatus] : 'Connect Hardware'}
                    </button>
                    <button
                        className={`play-btn ${isPlaying ? 'playing' : ''}`}
                        onClick={onTogglePlay}
                    >
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>
                <SensorGraph sensorData={sensorData} />
                <SoundOutputDisplay params={displayParams} isPlaying={isPlaying} sensorMode={sensorMode} />
            </div>
            <div className="monitor-sidebar">
                <InstrumentSelector value={instrumentId} onChange={onInstrumentChange} />
                <KeybindEditor config={keybindConfig} onChange={onKeybindChange} sensorMode={sensorMode} />
            </div>
        </div>
    );
}

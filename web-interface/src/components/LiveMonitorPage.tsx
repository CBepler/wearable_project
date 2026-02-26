import type { SensorData, InstrumentId, SensorMode, DisplayParams } from '../audio/types';
import { SensorGraph } from './SensorGraph';
import { InstrumentSelector } from './InstrumentSelector';
import { SoundOutputDisplay } from './SoundOutputDisplay';
import './LiveMonitorPage.css';

interface LiveMonitorPageProps {
    sensorData: SensorData;
    isPlaying: boolean;
    sensorMode: SensorMode;
    instrumentId: InstrumentId;
    onInstrumentChange: (id: InstrumentId) => void;
    displayParams: DisplayParams | undefined;
}

export function LiveMonitorPage({
    sensorData,
    isPlaying,
    sensorMode,
    instrumentId,
    onInstrumentChange,
    displayParams,
}: LiveMonitorPageProps) {
    return (
        <div className="live-monitor-page">
            <div className="monitor-main">
                <SensorGraph sensorData={sensorData} />
                <SoundOutputDisplay params={displayParams} isPlaying={isPlaying} sensorMode={sensorMode} />
            </div>
            <div className="monitor-sidebar">
                <InstrumentSelector value={instrumentId} onChange={onInstrumentChange} />
            </div>
        </div>
    );
}

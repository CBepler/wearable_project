import type { SensorData, InstrumentId, SensorMode, DisplayParams } from '../audio/types';
import { SensorSimulator } from './SensorSimulator';
import { InstrumentSelector } from './InstrumentSelector';
import { SoundOutputDisplay } from './SoundOutputDisplay';
import './SimulatorPage.css';

interface SimulatorPageProps {
    sensorData: SensorData;
    onSensorChange: (data: SensorData) => void;
    isPlaying: boolean;
    onTogglePlay: () => void;
    sensorMode: SensorMode;
    instrumentId: InstrumentId;
    onInstrumentChange: (id: InstrumentId) => void;
    displayParams: DisplayParams | undefined;
}

export function SimulatorPage({
    sensorData,
    onSensorChange,
    isPlaying,
    onTogglePlay,
    sensorMode,
    instrumentId,
    onInstrumentChange,
    displayParams,
}: SimulatorPageProps) {
    return (
        <div className="simulator-page">
            <div className="sim-page-sidebar">
                <InstrumentSelector value={instrumentId} onChange={onInstrumentChange} />
                <SoundOutputDisplay params={displayParams} isPlaying={isPlaying} sensorMode={sensorMode} />
            </div>
            <div className="sim-page-main">
                <SensorSimulator
                    sensorData={sensorData}
                    onSensorChange={onSensorChange}
                    isPlaying={isPlaying}
                    onTogglePlay={onTogglePlay}
                    sensorMode={sensorMode}
                />
            </div>
        </div>
    );
}

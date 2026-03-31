import type { SensorData, InstrumentId, SensorMode, DisplayParams, KeybindConfig, CalibrationConfig } from '../audio/types';
import { SensorSimulator } from './SensorSimulator';
import { InstrumentSelector } from './InstrumentSelector';
import { KeybindEditor } from './KeybindEditor';
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
    keybindConfig: KeybindConfig;
    onKeybindChange: (config: KeybindConfig) => void;
    calibration: CalibrationConfig;
    onCalibrationChange: (cal: CalibrationConfig) => void;
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
    keybindConfig,
    onKeybindChange,
    calibration,
    onCalibrationChange,
}: SimulatorPageProps) {
    return (
        <div className="simulator-page">
            <div className="sim-page-sidebar">
                <InstrumentSelector value={instrumentId} onChange={onInstrumentChange} />
                <KeybindEditor config={keybindConfig} onChange={onKeybindChange} sensorMode={sensorMode} calibration={calibration} onCalibrationChange={onCalibrationChange} />
                <SoundOutputDisplay params={displayParams} isPlaying={isPlaying} sensorMode={sensorMode} digitalKeybinds={keybindConfig.digital} />
            </div>
            <div className="sim-page-main">
                <SensorSimulator
                    sensorData={sensorData}
                    onSensorChange={onSensorChange}
                    isPlaying={isPlaying}
                    onTogglePlay={onTogglePlay}
                    sensorMode={sensorMode}
                    calibration={calibration}
                />
            </div>
        </div>
    );
}

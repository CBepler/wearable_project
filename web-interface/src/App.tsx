import { useState, useCallback, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import type { PageId } from './components/Layout';
import { SimulatorPage } from './components/SimulatorPage';
import { LiveMonitorPage } from './components/LiveMonitorPage';
import type { SensorData, InstrumentId, KeybindConfig } from './audio/types';
import { DEFAULT_SENSOR_DATA, DEFAULT_CALIBRATION, DEFAULT_KEYBIND_CONFIG, getSensorMode } from './audio/types';
import { SoundEngine } from './audio/soundEngine';
import { useLiveSensor } from './hooks/useLiveSensor';
import './App.css';

function App() {
  // ── Navigation ────────────────────────────────────────────────────────
  const [activePage, setActivePage] = useState<PageId>('monitor');

  // ── Shared state ──────────────────────────────────────────────────────
  const [simSensorData, setSimSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [isPlaying, setIsPlaying] = useState(false);
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('violin');
  const [keybindConfig, setKeybindConfig] = useState<KeybindConfig>(DEFAULT_KEYBIND_CONFIG);
  const [liveEnabled, setLiveEnabled] = useState(false);

  // Live sensor data from the FastAPI WebSocket bridge
  const { sensorData: liveSensorData, status: liveStatus } = useLiveSensor(liveEnabled);

  // Use live data on monitor page when connected, simulator data otherwise
  const sensorData = (activePage === 'monitor' && liveEnabled)
    ? liveSensorData
    : simSensorData;

  // Sensor mode is derived from instrument
  const sensorMode = getSensorMode(instrumentId);

  // Sound engine singleton
  const engineRef = useRef<SoundEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SoundEngine();
  }

  // Push sensor data to engine
  useEffect(() => {
    if (isPlaying) {
      engineRef.current?.updateFromSensors(sensorData, DEFAULT_CALIBRATION, keybindConfig);
    }
  }, [sensorData, isPlaying, keybindConfig]);

  // ── Instrument selection ──────────────────────────────────────────────
  const handleInstrumentChange = useCallback((id: InstrumentId) => {
    setInstrumentId(id);
    engineRef.current?.setInstrument(id);
  }, []);

  // ── Play / Stop ───────────────────────────────────────────────────────
  const handleTogglePlay = useCallback(async () => {
    try {
      const engine = engineRef.current!;
      if (engine.isPlaying) {
        engine.stop();
        setIsPlaying(false);
      } else {
        await engine.start();
        engine.updateFromSensors(sensorData, DEFAULT_CALIBRATION, keybindConfig);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[SoundEngine] Play/Stop error:', err);
    }
  }, [sensorData]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

  const displayParams = engineRef.current?.displayParams;

  return (
    <Layout activePage={activePage} onPageChange={setActivePage}>
      {activePage === 'monitor' ? (
        <LiveMonitorPage
          sensorData={sensorData}
          isPlaying={isPlaying}
          sensorMode={sensorMode}
          instrumentId={instrumentId}
          onInstrumentChange={handleInstrumentChange}
          onTogglePlay={handleTogglePlay}
          displayParams={displayParams}
          liveEnabled={liveEnabled}
          onToggleLive={() => setLiveEnabled(prev => !prev)}
          liveStatus={liveStatus}
          keybindConfig={keybindConfig}
          onKeybindChange={setKeybindConfig}
        />
      ) : (
        <SimulatorPage
          sensorData={simSensorData}
          onSensorChange={setSimSensorData}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          sensorMode={sensorMode}
          instrumentId={instrumentId}
          onInstrumentChange={handleInstrumentChange}
          displayParams={displayParams}
          keybindConfig={keybindConfig}
          onKeybindChange={setKeybindConfig}
        />
      )}
    </Layout>
  );
}

export default App;

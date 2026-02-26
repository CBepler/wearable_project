import { useState, useCallback, useRef, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SensorGraph } from './components/SensorGraph';
import { CalibrationPanel } from './components/CalibrationPanel';
import { InstrumentSelector } from './components/InstrumentSelector';
import { SensorSimulator } from './components/SensorSimulator';
import { SoundOutputDisplay } from './components/SoundOutputDisplay';
import type { SensorData, InstrumentId } from './audio/types';
import { DEFAULT_SENSOR_DATA, DEFAULT_CALIBRATION, getSensorMode } from './audio/types';
import { SoundEngine } from './audio/soundEngine';

function App() {
  // ── Shared state ──────────────────────────────────────────────────────
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [isPlaying, setIsPlaying] = useState(false);
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('violin');

  // Sensor mode is derived from instrument, not independent state
  const sensorMode = getSensorMode(instrumentId);

  // Sound engine singleton
  const engineRef = useRef<SoundEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SoundEngine();
  }

  // Push sensor data directly to the Tone.js engine
  useEffect(() => {
    if (isPlaying) {
      engineRef.current?.updateFromSensors(sensorData, DEFAULT_CALIBRATION);
    }
  }, [sensorData, isPlaying]);

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
        engine.updateFromSensors(sensorData, DEFAULT_CALIBRATION);
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

  // Get display params from the engine (updated every render when playing)
  const displayParams = engineRef.current?.displayParams;

  return (
    <Layout>
      <Dashboard>
        <SensorGraph sensorData={sensorData} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <InstrumentSelector value={instrumentId} onChange={handleInstrumentChange} />
          <CalibrationPanel />
        </div>
      </Dashboard>

      {/* Simulator section */}
      <div className="simulator-section">
        <SensorSimulator
          sensorData={sensorData}
          onSensorChange={setSensorData}
          isPlaying={isPlaying}
          onTogglePlay={handleTogglePlay}
          sensorMode={sensorMode}
        />
        <SoundOutputDisplay
          params={displayParams}
          isPlaying={isPlaying}
          sensorMode={sensorMode}
        />
      </div>
    </Layout>
  );
}

export default App;

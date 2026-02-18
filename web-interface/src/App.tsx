import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SensorGraph } from './components/SensorGraph';
import { CalibrationPanel } from './components/CalibrationPanel';
import { InstrumentSelector } from './components/InstrumentSelector';
import { SensorSimulator } from './components/SensorSimulator';
import { SoundOutputDisplay } from './components/SoundOutputDisplay';
import type { SensorData, SoundParams, InstrumentId } from './audio/types';
import { DEFAULT_SENSOR_DATA, DEFAULT_CALIBRATION } from './audio/types';
import { mapSensorToSound } from './audio/sensorEngine';
import { SoundEngine } from './audio/soundEngine';

function App() {
  // ── Shared state ──────────────────────────────────────────────────────
  const [sensorData, setSensorData] = useState<SensorData>(DEFAULT_SENSOR_DATA);
  const [isPlaying, setIsPlaying] = useState(false);
  const [instrumentId, setInstrumentId] = useState<InstrumentId>('violin');

  // Sound engine singleton
  const engineRef = useRef<SoundEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SoundEngine();
  }

  // ── Compute sound params whenever sensor data changes ─────────────────
  const soundParams: SoundParams = useMemo(
    () => mapSensorToSound(sensorData, DEFAULT_CALIBRATION),
    [sensorData],
  );

  // Push params to the audio engine
  useEffect(() => {
    if (isPlaying) {
      engineRef.current?.updateParams(soundParams);
    }
  }, [soundParams, isPlaying]);

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
        engine.updateParams(soundParams);
        setIsPlaying(true);
      }
    } catch (err) {
      console.error('[SoundEngine] Play/Stop error:', err);
    }
  }, [soundParams]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      engineRef.current?.stop();
    };
  }, []);

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
        />
        <SoundOutputDisplay params={soundParams} isPlaying={isPlaying} />
      </div>
    </Layout>
  );
}

export default App;

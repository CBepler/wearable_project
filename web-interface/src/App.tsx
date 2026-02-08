import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { SensorGraph } from './components/SensorGraph';
import { CalibrationPanel } from './components/CalibrationPanel';
import { InstrumentSelector } from './components/InstrumentSelector';

function App() {
  return (
    <Layout>
      <Dashboard>
        <SensorGraph />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-lg)' }}>
          <InstrumentSelector />
          <CalibrationPanel />
        </div>
      </Dashboard>
    </Layout>
  );
}

export default App;

import { Settings, Info } from 'lucide-react';
import { SENSITIVITY_THRESHOLD } from '../audio/types';
import './CalibrationPanel.css';

export function CalibrationPanel() {
    const thresholdPct = (SENSITIVITY_THRESHOLD * 100).toFixed(0);

    return (
        <div className="card calibration-card">
            <div className="card-header">
                <div className="card-title">
                    <Settings size={20} className="text-secondary" />
                    <h3>Sensor Config</h3>
                </div>
            </div>

            <div className="calibration-content">
                <div className="config-info-grid">
                    <div className="config-info-item">
                        <Info size={14} />
                        <div className="config-info-text">
                            <span className="config-info-label">Sensor Type</span>
                            <span className="config-info-value">Spectra Symbol Flex 2.2″</span>
                        </div>
                    </div>
                    <div className="config-info-item">
                        <Info size={14} />
                        <div className="config-info-text">
                            <span className="config-info-label">Resistance Range</span>
                            <span className="config-info-value">10 kΩ (flat) – 125 kΩ (bent)</span>
                        </div>
                    </div>
                    <div className="config-info-item">
                        <Info size={14} />
                        <div className="config-info-text">
                            <span className="config-info-label">Sensor Count</span>
                            <span className="config-info-value">5 (one hand)</span>
                        </div>
                    </div>
                    <div className="config-info-item">
                        <Info size={14} />
                        <div className="config-info-text">
                            <span className="config-info-label">Digital Threshold</span>
                            <span className="config-info-value">{thresholdPct}% bend</span>
                        </div>
                    </div>
                </div>
                <p className="control-hint">
                    Sensitivity and buffer range are pre-configured on the hardware and remain constant.
                </p>
            </div>
        </div>
    );
}

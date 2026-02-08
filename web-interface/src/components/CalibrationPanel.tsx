import { useState } from 'react';
import { Settings, Volume2 } from 'lucide-react';
import './CalibrationPanel.css';

export function CalibrationPanel() {
    const [sensitivity, setSensitivity] = useState(50);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSensitivity(Number(e.target.value));
    };

    // Convert 0-100 scale to a meaningful dB/unit value
    const dbPerUnit = (sensitivity / 10).toFixed(1);

    return (
        <div className="card calibration-card">
            <div className="card-header">
                <div className="card-title">
                    <Settings size={20} className="text-secondary" />
                    <h3>Calibration</h3>
                </div>
            </div>

            <div className="calibration-content">
                <div className="control-group">
                    <div className="control-header">
                        <label htmlFor="sensitivity" className="control-label">
                            <Volume2 size={16} />
                            Master Sensitivity
                        </label>
                        <span className="value-display">{dbPerUnit} dB/m</span>
                    </div>

                    <div className="slider-container">
                        <input
                            type="range"
                            id="sensitivity"
                            min="0"
                            max="100"
                            value={sensitivity}
                            onChange={handleChange}
                            className="range-slider"
                            style={{ backgroundSize: `${sensitivity}% 100%` }}
                        />
                    </div>
                    <p className="control-hint">Adjusts volume change per unit of movement distance.</p>
                </div>
            </div>
        </div>
    );
}

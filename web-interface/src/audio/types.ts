/** Raw 6-DOF sensor readings from the wearable device. */
export interface SensorData {
    /** Acceleration along the X axis in m/s² */
    accelX: number;
    /** Acceleration along the Y axis in m/s² */
    accelY: number;
    /** Acceleration along the Z axis in m/s² */
    accelZ: number;
    /** Roll angle in degrees (-180 to 180) */
    roll: number;
    /** Pitch angle in degrees (-180 to 180) */
    pitch: number;
    /** Yaw angle in degrees (-180 to 180) */
    yaw: number;
}

/** Computed sound parameters derived from sensor data. */
export interface SoundParams {
    /** Oscillator frequency in Hz (130–1047, C3–C6) */
    frequency: number;
    /** Master gain (0–1) */
    gain: number;
    /** Frequency detune in cents (-100 to +100) */
    detune: number;
    /** Stereo pan position (-1 left, 0 center, +1 right) */
    pan: number;
    /** Tremolo LFO rate in Hz (0–15) */
    tremoloRate: number;
    /** Low-pass filter cutoff frequency in Hz (200–8000) */
    filterCutoff: number;
}

/** User-adjustable calibration settings. */
export interface CalibrationConfig {
    /** Volume sensitivity multiplier (0–1 scale from the 0-100 slider) */
    sensitivity: number;
}

/** Available instrument identifiers. */
export type InstrumentId = 'violin' | 'flute' | 'cello';

/** Default sensor data — device at rest on a table. */
export const DEFAULT_SENSOR_DATA: SensorData = {
    accelX: 0,
    accelY: 0,
    accelZ: 9.8,
    roll: 0,
    pitch: 0,
    yaw: 0,
};

/** Default calibration. */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
    sensitivity: 0.5,
};

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

/** User-adjustable calibration settings. */
export interface CalibrationConfig {
    /** Volume sensitivity multiplier (0–1 scale from the 0-100 slider) */
    sensitivity: number;
}

/** Available instrument identifiers. */
export type InstrumentId = 'violin' | 'flute' | 'cello';

/**
 * Display-only parameters derived from sensor data.
 * Used by the SoundOutputDisplay component for visual feedback.
 * These mirror what the engine is doing internally.
 */
export interface DisplayParams {
    /** Current note name, e.g. "C4", "G#3" */
    note: string;
    /** Current frequency in Hz */
    frequency: number;
    /** Volume as 0–100% */
    volumePct: number;
    /** Detune in cents */
    detune: number;
    /** Pan position: -1 left, 0 center, +1 right */
    pan: number;
    /** Tremolo depth 0–100% */
    tremoloPct: number;
    /** Brightness 0–100% */
    brightnessPct: number;
}

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

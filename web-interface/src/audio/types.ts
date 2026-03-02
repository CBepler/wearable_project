/** Finger names for the 5 flex sensors on one hand. */
export const FINGER_NAMES = ['thumb', 'index', 'middle', 'ring', 'pinky'] as const;
export type FingerName = (typeof FINGER_NAMES)[number];

/** IMU orientation axis names. */
export const ORIENTATION_NAMES = ['roll', 'pitch', 'yaw'] as const;
export type OrientationName = (typeof ORIENTATION_NAMES)[number];

/**
 * Raw flex-sensor readings from the wearable glove.
 * Each value is normalised 0.0 (flat / no bend) to 1.0 (fully bent).
 *
 * The sensor itself outputs resistance (flat ≈ 10 kΩ, bent ≈ 125 kΩ).
 * Normalisation is assumed to happen before values reach this interface
 * (either on the MCU or at the BLE ingestion layer).
 */
export interface SensorData {
    thumb: number;
    index: number;
    middle: number;
    ring: number;
    pinky: number;
    /** IMU roll in degrees (-180 to +180). */
    roll: number;
    /** IMU pitch in degrees (-180 to +180). */
    pitch: number;
    /** IMU yaw in degrees (-180 to +180). */
    yaw: number;
}

/** User-adjustable calibration settings. */
export interface CalibrationConfig {
    /** Volume sensitivity multiplier (0–1 scale from the 0-100 slider) */
    sensitivity: number;
}

/** Available instrument identifiers. */
export type InstrumentId = 'violin' | 'piano' | 'flute' | 'cello' | 'guitar';

/** Sensor interpretation mode — derived from the selected instrument. */
export type SensorMode = 'analog' | 'digital';

/**
 * Digital mode threshold: bend values above this are considered "on".
 * Pre-configured and constant (matching the hardware buffer setting).
 */
export const SENSITIVITY_THRESHOLD = 0.3;

/** Returns true if the instrument uses digital (threshold) mode. */
export function isDigitalInstrument(id: InstrumentId): boolean {
    return id === 'piano' || id === 'guitar';
}

/** Get the sensor mode for a given instrument. */
export function getSensorMode(id: InstrumentId): SensorMode {
    return isDigitalInstrument(id) ? 'digital' : 'analog';
}

/** Per-finger color palette used across UI components. */
export const FINGER_COLORS: Record<FingerName, string> = {
    thumb: '#f472b6',   // Pink 400
    index: '#38bdf8',   // Sky 400
    middle: '#4ade80',  // Green 400
    ring: '#fbbf24',    // Amber 400
    pinky: '#a78bfa',   // Violet 400
};

/** Per-axis color palette for IMU orientation. */
export const ORIENTATION_COLORS: Record<OrientationName, string> = {
    roll: '#f97316',    // Orange 500
    pitch: '#14b8a6',   // Teal 500
    yaw: '#ec4899',     // Pink 500
};

/**
 * Display-only parameters derived from sensor data.
 * Used by the SoundOutputDisplay component for visual feedback.
 */
export interface DisplayParams {
    /** Current note name, e.g. "C4", "G#3" */
    note: string;
    /** Current frequency in Hz */
    frequency: number;
    /** Volume as 0–100% */
    volumePct: number;
    /** Pan position: -1 left, 0 center, +1 right */
    pan: number;
    /** Tremolo depth 0–100% */
    tremoloPct: number;
    /** Brightness 0–100% */
    brightnessPct: number;
    /** Which fingers are currently "on" in digital mode */
    activeFingers: boolean[];
}

/** Default sensor data — hand flat / no bend, neutral orientation. */
export const DEFAULT_SENSOR_DATA: SensorData = {
    thumb: 0,
    index: 0,
    middle: 0,
    ring: 0,
    pinky: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
};

/** Default calibration. */
export const DEFAULT_CALIBRATION: CalibrationConfig = {
    sensitivity: 0.5,
};

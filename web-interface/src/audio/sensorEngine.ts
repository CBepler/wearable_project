import type { SensorData, SoundParams, CalibrationConfig } from './types';

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Clamp a value between min and max. */
function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/** Linearly map a value from one range to another. */
function mapRange(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number,
): number {
    const clamped = clamp(value, inMin, inMax);
    return outMin + ((clamped - inMin) / (inMax - inMin)) * (outMax - outMin);
}

// ── Constants ────────────────────────────────────────────────────────────────

/** Maximum expected acceleration magnitude (m/s²). */
const ACCEL_MAX = 30;

/** Acceleration axis range for individual axes. */
const ACCEL_AXIS_MIN = -20;
const ACCEL_AXIS_MAX = 20;

/** Rotation range in degrees. */
const ROT_MIN = -180;
const ROT_MAX = 180;

// Sound output ranges
const FREQ_MIN = 130.81; // C3
const FREQ_MAX = 1046.5; // C6
const DETUNE_MIN = -100;
const DETUNE_MAX = 100;
const PAN_MIN = -1;
const PAN_MAX = 1;
const TREMOLO_MIN = 0;
const TREMOLO_MAX = 15;
const FILTER_MIN = 200;
const FILTER_MAX = 8000;

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Pure function that maps 6-DOF sensor data to continuous sound parameters.
 *
 * Mapping summary:
 *   accel magnitude → gain (volume)
 *   pitch rotation  → oscillator frequency
 *   roll rotation   → detune (cents)
 *   yaw rotation    → stereo pan
 *   accel X         → tremolo LFO rate
 *   accel Y         → filter cutoff
 */
export function mapSensorToSound(
    data: SensorData,
    calibration: CalibrationConfig,
): SoundParams {
    // 1. Volume — acceleration magnitude scaled by sensitivity
    const magnitude = Math.sqrt(
        data.accelX ** 2 + data.accelY ** 2 + data.accelZ ** 2,
    );
    const rawGain = mapRange(magnitude, 0, ACCEL_MAX, 0, 1);
    const gain = clamp(rawGain * calibration.sensitivity * 2, 0, 1);

    // 2. Frequency — pitch rotation maps to note range C3–C6
    const frequency = mapRange(data.pitch, ROT_MIN, ROT_MAX, FREQ_MIN, FREQ_MAX);

    // 3. Detune — roll rotation maps to ±100 cents
    const detune = mapRange(data.roll, ROT_MIN, ROT_MAX, DETUNE_MIN, DETUNE_MAX);

    // 4. Stereo pan — yaw rotation maps to left/right
    const pan = mapRange(data.yaw, ROT_MIN, ROT_MAX, PAN_MIN, PAN_MAX);

    // 5. Tremolo rate — accel X maps to LFO speed
    const tremoloRate = mapRange(
        data.accelX,
        ACCEL_AXIS_MIN,
        ACCEL_AXIS_MAX,
        TREMOLO_MIN,
        TREMOLO_MAX,
    );

    // 6. Filter cutoff — accel Y maps to low-pass frequency
    const filterCutoff = mapRange(
        data.accelY,
        ACCEL_AXIS_MIN,
        ACCEL_AXIS_MAX,
        FILTER_MIN,
        FILTER_MAX,
    );

    return { frequency, gain, detune, pan, tremoloRate, filterCutoff };
}

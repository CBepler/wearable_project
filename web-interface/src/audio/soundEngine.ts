import * as Tone from 'tone';
import type { SensorData, CalibrationConfig, InstrumentId, DisplayParams } from './types';
import type { Instrument } from './instruments/Instrument';
import { ViolinInstrument } from './instruments/violin';

// ── Sensor range constants ──────────────────────────────────────────────────

const ACCEL_MAX = 30;       // Max expected acceleration magnitude (m/s²)
const ACCEL_AXIS_MAX = 20;  // Max single-axis acceleration
const ROT_RANGE = 180;      // Rotation axis range (±180°)

// ── MIDI / musical ranges ───────────────────────────────────────────────────

const MIDI_LOW = 48;        // C3
const MIDI_HIGH = 84;       // C6 (36 semitones = 3 octaves)

/**
 * Clamp a value to [min, max].
 */
function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

/**
 * Map a value from [inMin, inMax] to [outMin, outMax], clamped.
 */
function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
    return outMin + t * (outMax - outMin);
}

/**
 * Sound engine that owns the full Tone.js signal chain.
 *
 * Chain:  Instrument → Vibrato → Tremolo → Chorus → Panner → Reverb → Destination
 *
 * Sensor data is mapped directly to Tone.js parameters — no intermediate format.
 */
export class SoundEngine {
    // ── Tone.js effects (shared across instruments) ─────────────────────────
    private vibrato: Tone.Vibrato | null = null;
    private tremolo: Tone.Tremolo | null = null;
    private chorus: Tone.Chorus | null = null;
    private panner: Tone.Panner | null = null;
    private reverb: Tone.Reverb | null = null;

    // ── Instrument ──────────────────────────────────────────────────────────
    private instrument: Instrument | null = null;
    private _instrumentId: InstrumentId = 'violin';
    private _isPlaying = false;

    // ── Last computed display values (for UI) ───────────────────────────────
    private _lastDisplay: DisplayParams = {
        note: '—', frequency: 0, volumePct: 0,
        detune: 0, pan: 0, tremoloPct: 0, brightnessPct: 0,
    };

    get isPlaying(): boolean { return this._isPlaying; }
    get instrumentId(): InstrumentId { return this._instrumentId; }
    get displayParams(): DisplayParams { return this._lastDisplay; }

    // ── Lifecycle ───────────────────────────────────────────────────────────

    async start(): Promise<void> {
        if (this._isPlaying) return;
        await Tone.start();

        // Build the shared effects chain
        this.vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0.06, type: 'sine' });
        this.tremolo = new Tone.Tremolo({ frequency: 0, depth: 0, spread: 0 }).start();
        this.chorus = new Tone.Chorus({ frequency: 3, delayTime: 3.5, depth: 0.4, wet: 0.3 }).start();
        this.panner = new Tone.Panner(0);
        this.reverb = new Tone.Reverb({ decay: 1.8, wet: 0.2 });

        // Chain: vibrato → tremolo → chorus → panner → reverb → destination
        this.vibrato.connect(this.tremolo);
        this.tremolo.connect(this.chorus);
        this.chorus.connect(this.panner);
        this.panner.connect(this.reverb);
        this.reverb.toDestination();

        // Create instrument and connect to chain head
        this.instrument = this.createInstrument(this._instrumentId);
        this.instrument.connect(this.vibrato);

        // Start with default A4
        const startFreq = Tone.Frequency('A4').toFrequency();
        this.instrument.start(startFreq);
        this._isPlaying = true;
    }

    stop(): void {
        if (!this._isPlaying) return;

        this.instrument?.stop();
        this.instrument = null;

        // Dispose effects after a short delay for release tails
        setTimeout(() => {
            this.vibrato?.dispose();
            this.tremolo?.dispose();
            this.chorus?.dispose();
            this.panner?.dispose();
            this.reverb?.dispose();
            this.vibrato = null;
            this.tremolo = null;
            this.chorus = null;
            this.panner = null;
            this.reverb = null;
        }, 700);

        this._isPlaying = false;
    }

    setInstrument(id: InstrumentId): void {
        this._instrumentId = id;
        if (this._isPlaying && this.vibrato) {
            this.instrument?.stop();
            this.instrument = this.createInstrument(id);
            this.instrument.connect(this.vibrato);
            const freq = Tone.Frequency('A4').toFrequency();
            this.instrument.start(freq);
        }
    }

    // ── Core: map sensor data directly to Tone.js ──────────────────────────

    updateFromSensors(data: SensorData, cal: CalibrationConfig): void {
        if (!this._isPlaying || !this.instrument) return;

        // 1. PITCH → Musical note (snapped to chromatic scale)
        //    Pitch rotation (-180..+180) maps to MIDI notes C3..C6
        const midiFloat = mapRange(data.pitch, -ROT_RANGE, ROT_RANGE, MIDI_LOW, MIDI_HIGH);
        const midiNote = Math.round(midiFloat);  // Snap to nearest semitone
        const freq = Tone.Frequency(midiNote, 'midi').toFrequency();
        const noteName = Tone.Frequency(midiNote, 'midi').toNote();
        this.instrument.setNote(freq);

        // 2. VOLUME → Acceleration magnitude → dB
        //    Quiet at rest, louder with motion
        const mag = Math.sqrt(data.accelX ** 2 + data.accelY ** 2 + data.accelZ ** 2);
        const normVol = clamp(mag / ACCEL_MAX, 0, 1) * cal.sensitivity * 2;
        const volDb = mapRange(clamp(normVol, 0, 1), 0, 1, -36, -6); // -36 dB (quiet) to -6 dB (loud)
        this.instrument.setVolume(volDb);

        // 3. DETUNE → Roll rotation → cents
        const detune = mapRange(data.roll, -ROT_RANGE, ROT_RANGE, -100, 100);
        this.instrument.setDetune(detune);

        // 4. PAN → Yaw rotation → Tone.Panner
        const pan = mapRange(data.yaw, -ROT_RANGE, ROT_RANGE, -1, 1);
        if (this.panner) this.panner.pan.value = pan;

        // 5. TREMOLO → Accel X → Tone.Tremolo depth & frequency
        const tremoloNorm = clamp(Math.abs(data.accelX) / ACCEL_AXIS_MAX, 0, 1);
        if (this.tremolo) {
            this.tremolo.frequency.value = 2 + tremoloNorm * 10; // 2–12 Hz
            this.tremolo.depth.value = tremoloNorm * 0.8;         // 0–80% depth
        }

        // 6. BRIGHTNESS → Accel Y → synth modulation index
        const brightnessNorm = mapRange(data.accelY, -ACCEL_AXIS_MAX, ACCEL_AXIS_MAX, 0, 1);
        this.instrument.setBrightness(brightnessNorm);

        // 7. VIBRATO depth scales with volume (more vibrato when louder)
        if (this.vibrato) {
            this.vibrato.depth.value = 0.02 + clamp(normVol, 0, 1) * 0.08;
        }

        // ── Update display params for UI ────────────────────────────────────
        this._lastDisplay = {
            note: noteName,
            frequency: Math.round(freq),
            volumePct: Math.round(clamp(normVol, 0, 1) * 100),
            detune: Math.round(detune),
            pan: Math.round(pan * 100) / 100,
            tremoloPct: Math.round(tremoloNorm * 100),
            brightnessPct: Math.round(brightnessNorm * 100),
        };
    }

    // ── Private ─────────────────────────────────────────────────────────────

    private createInstrument(id: InstrumentId): Instrument {
        switch (id) {
            case 'violin':
                return new ViolinInstrument();
            case 'flute':
            case 'cello':
            default:
                return new ViolinInstrument(); // Placeholder
        }
    }
}

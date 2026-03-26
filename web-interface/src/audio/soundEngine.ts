import * as Tone from 'tone';
import type { SensorData, CalibrationConfig, InstrumentId, DisplayParams } from './types';
import { SENSITIVITY_THRESHOLD, isDigitalInstrument } from './types';
import type { Instrument } from './instruments/Instrument';
import { ViolinInstrument } from './instruments/violin';
import { PianoInstrument } from './instruments/piano';

// ── Musical constants ────────────────────────────────────────────────────────

const MIDI_LOW = 48;   // C3
const MIDI_HIGH = 84;  // C6 (3 octaves)

/** Notes assigned to each finger in digital mode (C major pentatonic). */
const DIGITAL_FINGER_NOTES = ['C4', 'D4', 'E4', 'G4', 'A4'];

// ── Helpers ──────────────────────────────────────────────────────────────────

function clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
}

function mapRange(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
    const t = clamp((v - inMin) / (inMax - inMin), 0, 1);
    return outMin + t * (outMax - outMin);
}

/**
 * Sound engine owning the full Tone.js signal chain.
 *
 * Chain:  Instrument → Vibrato → Tremolo → Chorus → Panner → Reverb → Destination
 *
 * Supports two modes (derived from instrument):
 * - **Analog** (violin/flute): Continuous sensor→sound parameter mapping
 * - **Digital** (piano/guitar): Per-finger threshold triggers discrete notes
 */
export class SoundEngine {
    // ── Tone.js effects ──────────────────────────────────────────────────────
    private vibrato: Tone.Vibrato | null = null;
    private tremolo: Tone.Tremolo | null = null;
    private chorus: Tone.Chorus | null = null;
    private panner: Tone.Panner | null = null;
    private reverb: Tone.Reverb | null = null;

    // ── Instrument ───────────────────────────────────────────────────────────
    private instrument: Instrument | null = null;
    private _instrumentId: InstrumentId = 'violin';
    private _isPlaying = false;

    // ── Digital mode state ───────────────────────────────────────────────────
    /** Tracks which fingers are currently "on" to avoid re-triggers. */
    private fingerState: boolean[] = [false, false, false, false, false];

    // ── Display values (for UI) ──────────────────────────────────────────────
    private _lastDisplay: DisplayParams = {
        note: '—', frequency: 0, volumePct: 0,
        pan: 0, tremoloPct: 0, brightnessPct: 0,
        activeFingers: [false, false, false, false, false],
    };

    get isPlaying(): boolean { return this._isPlaying; }
    get instrumentId(): InstrumentId { return this._instrumentId; }
    get displayParams(): DisplayParams { return this._lastDisplay; }

    // ── Lifecycle ────────────────────────────────────────────────────────────

    async start(): Promise<void> {
        if (this._isPlaying) return;
        await Tone.start();

        // Build shared effects chain
        this.vibrato = new Tone.Vibrato({ frequency: 5.5, depth: 0.06, type: 'sine' });
        this.tremolo = new Tone.Tremolo({ frequency: 0, depth: 0, spread: 0 }).start();
        this.chorus = new Tone.Chorus({ frequency: 3, delayTime: 3.5, depth: 0.4, wet: 0.3 }).start();
        this.panner = new Tone.Panner(0);
        this.reverb = new Tone.Reverb({ decay: 1.8, wet: 0.2 });

        // Chain: vibrato → tremolo → chorus → panner → reverb → out
        this.vibrato.connect(this.tremolo);
        this.tremolo.connect(this.chorus);
        this.chorus.connect(this.panner);
        this.panner.connect(this.reverb);
        this.reverb.toDestination();

        // Create instrument and wire it up
        this.instrument = this.createInstrument(this._instrumentId);
        this.instrument.connect(this.vibrato);

        // Analog instruments start sustaining immediately
        if (!isDigitalInstrument(this._instrumentId)) {
            const startFreq = Tone.Frequency('A4').toFrequency();
            this.instrument.start(startFreq);
        }

        this._isPlaying = true;
    }

    stop(): void {
        if (!this._isPlaying) return;

        // Release any active digital notes
        this.releaseAllFingers();

        this.instrument?.stop();
        this.instrument = null;

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
            // Release any digital notes before switching
            this.releaseAllFingers();
            this.instrument?.stop();

            this.instrument = this.createInstrument(id);
            this.instrument.connect(this.vibrato);

            if (!isDigitalInstrument(id)) {
                const freq = Tone.Frequency('A4').toFrequency();
                this.instrument.start(freq);
            }
        }
    }

    // ── Core: sensor → sound ─────────────────────────────────────────────────

    updateFromSensors(data: SensorData, cal: CalibrationConfig): void {
        if (!this._isPlaying || !this.instrument) return;

        if (isDigitalInstrument(this._instrumentId)) {
            this.updateDigital(data, cal);
        } else {
            this.updateAnalog(data, cal);
        }
    }

    // ── Analog mode (violin / continuous instruments) ────────────────────────

    private updateAnalog(data: SensorData, cal: CalibrationConfig): void {
        const inst = this.instrument!;

        // 1. INDEX → Pitch: bend sweeps through 3-octave range (C3..C6)
        const midiFloat = mapRange(data.index, 0, 1, MIDI_LOW, MIDI_HIGH);
        const midiNote = Math.round(midiFloat);
        const freq = Tone.Frequency(midiNote, 'midi').toFrequency();
        const noteName = Tone.Frequency(midiNote, 'midi').toNote();
        inst.setNote(freq);

        // 2. ROLL → Volume: roll -180..+180 mapped to 0..1
        const normVol = clamp(mapRange(data.roll, -180, 180, 0, 1) * cal.sensitivity * 2, 0, 1);
        const volDb = mapRange(normVol, 0, 1, -36, 12);
        inst.setVolume(volDb);

        // 3. MIDDLE → Brightness / timbre
        const brightnessNorm = clamp(data.middle, 0, 1);
        inst.setBrightness(brightnessNorm);

        // 4. RING → Vibrato / tremolo depth
        const tremoloNorm = clamp(data.ring, 0, 1);
        if (this.tremolo) {
            this.tremolo.frequency.value = 2 + tremoloNorm * 10;
            this.tremolo.depth.value = tremoloNorm * 0.8;
        }
        if (this.vibrato) {
            this.vibrato.depth.value = 0.02 + tremoloNorm * 0.08;
        }

        // 5. PINKY → Pan
        const pan = mapRange(data.pinky, 0, 1, -1, 1);
        if (this.panner) this.panner.pan.value = pan;

        // Update display
        this._lastDisplay = {
            note: noteName,
            frequency: Math.round(freq),
            volumePct: Math.round(normVol * 100),
            pan: Math.round(pan * 100) / 100,
            tremoloPct: Math.round(tremoloNorm * 100),
            brightnessPct: Math.round(brightnessNorm * 100),
            activeFingers: [false, false, false, false, false],
        };
    }

    // ── Digital mode (piano / discrete-note instruments) ─────────────────────

    private updateDigital(data: SensorData, cal: CalibrationConfig): void {
        const inst = this.instrument!;
        const fingerValues = [data.thumb, data.index, data.middle, data.ring, data.pinky];
        // Only check fingers that have sensors installed (currently just thumb)
        const installedFingers = new Set([0]); // 0 = thumb
        const activeFingers: boolean[] = [];
        let activeNote = '—';

        // ROLL → Volume (same mapping as analog mode)
        const normVol = clamp(mapRange(data.roll, -180, 180, 0, 1) * cal.sensitivity * 2, 0, 1);
        const volDb = mapRange(normVol, 0, 1, -36, 12);
        inst.setVolume(volDb);

        for (let i = 0; i < 5; i++) {
            const isOn = installedFingers.has(i) && fingerValues[i] <= 0.8;
            activeFingers.push(isOn);

            if (isOn && !this.fingerState[i]) {
                // Finger just bent past threshold → trigger
                inst.triggerNote?.(DIGITAL_FINGER_NOTES[i]);
            } else if (!isOn && this.fingerState[i]) {
                // Finger just released → release note
                inst.releaseNote?.(DIGITAL_FINGER_NOTES[i]);
            }

            if (isOn) activeNote = DIGITAL_FINGER_NOTES[i];
            this.fingerState[i] = isOn;
        }

        const activeCount = activeFingers.filter(Boolean).length;

        this._lastDisplay = {
            note: activeCount > 0 ? activeNote : '—',
            frequency: activeCount > 0 ? Math.round(Tone.Frequency(activeNote).toFrequency()) : 0,
            volumePct: Math.round(normVol * 100),
            pan: 0,
            tremoloPct: 0,
            brightnessPct: 0,
            activeFingers,
        };
    }

    private releaseAllFingers(): void {
        if (!this.instrument) return;
        for (let i = 0; i < 5; i++) {
            if (this.fingerState[i]) {
                this.instrument.releaseNote?.(DIGITAL_FINGER_NOTES[i]);
                this.fingerState[i] = false;
            }
        }
    }

    // ── Private ──────────────────────────────────────────────────────────────

    private createInstrument(id: InstrumentId): Instrument {
        switch (id) {
            case 'piano':
                return new PianoInstrument();
            case 'violin':
            default:
                return new ViolinInstrument();
        }
    }
}

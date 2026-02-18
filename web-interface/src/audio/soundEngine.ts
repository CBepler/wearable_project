import * as Tone from 'tone';
import type { SoundParams, InstrumentId } from './types';
import type { Instrument } from './instruments/Instrument';
import { ViolinInstrument } from './instruments/violin';

/**
 * Sound engine that manages the shared signal chain and delegates
 * tone generation to the currently selected Instrument.
 *
 * Shared chain (owned by engine):
 *   instrument output → filter → panner → Tone.Destination
 *
 * Each Instrument creates its own oscillators/gain internally
 * and connects its output into the shared chain.
 */
export class SoundEngine {
    private filter: Tone.Filter | null = null;
    private panner: Tone.Panner | null = null;
    private instrument: Instrument | null = null;
    private _instrumentId: InstrumentId = 'violin';
    private _isPlaying = false;

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    get instrumentId(): InstrumentId {
        return this._instrumentId;
    }

    /** Start audio playback. Handles the user-gesture AudioContext requirement. */
    async start(): Promise<void> {
        if (this._isPlaying) return;

        // Tone.js handles AudioContext creation + resume for us
        await Tone.start();

        // ── Shared chain: filter → panner → destination ──────────────────
        this.filter = new Tone.Filter({ type: 'lowpass', frequency: 4000, Q: 1 });
        this.panner = new Tone.Panner(0);

        this.filter.connect(this.panner);
        this.panner.toDestination();

        // ── Create & connect the selected instrument ─────────────────────
        this.instrument = this.createInstrument(this._instrumentId);
        this.instrument.connect(this.filter);
        this.instrument.start();

        this._isPlaying = true;
    }

    /** Stop playback and dispose of all nodes. */
    stop(): void {
        if (!this._isPlaying) return;

        this.instrument?.stop();
        this.instrument = null;

        this.filter?.dispose();
        this.panner?.dispose();
        this.filter = null;
        this.panner = null;

        this._isPlaying = false;
    }

    /** Switch to a different instrument. If playing, hot-swaps it. */
    setInstrument(id: InstrumentId): void {
        this._instrumentId = id;

        if (this._isPlaying && this.filter) {
            // Hot-swap: stop old instrument, create and start new one
            this.instrument?.stop();
            this.instrument = this.createInstrument(id);
            this.instrument.connect(this.filter);
            this.instrument.start();
        }
    }

    /** Apply real-time parameter updates. */
    updateParams(params: SoundParams): void {
        if (!this._isPlaying) return;

        // Update shared chain
        if (this.filter) this.filter.frequency.value = params.filterCutoff;
        if (this.panner) this.panner.pan.value = params.pan;

        // Update instrument-specific params
        this.instrument?.updateParams(params);
    }

    // ── Private ────────────────────────────────────────────────────────────

    private createInstrument(id: InstrumentId): Instrument {
        switch (id) {
            case 'violin':
                return new ViolinInstrument();

            // Flute and Cello will be added later — fall back to violin for now
            case 'flute':
            case 'cello':
            default:
                return new ViolinInstrument();
        }
    }
}

import * as Tone from 'tone';
import type { Instrument } from './Instrument';

/**
 * Piano instrument using Tone.js PolySynth.
 *
 * Designed for **digital mode** — each finger triggers/releases
 * a discrete note independently. Uses a bright percussive envelope
 * that mimics a struck string piano.
 */
export class PianoInstrument implements Instrument {
    private synth: Tone.PolySynth;
    private disposed = false;
    readonly isDigital = true;

    constructor() {
        this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: 'triangle8' },
            envelope: {
                attack: 0.005,
                decay: 0.3,
                sustain: 0.2,
                release: 0.8,
            },
            volume: -10,
        });
    }

    connect(destination: Tone.InputNode): void {
        this.synth.connect(destination);
    }

    /** Not used in digital mode, but required by interface. */
    start(_frequency: number): void {
        // Digital instruments don't sustain a single note.
    }

    stop(): void {
        if (this.disposed) return;
        this.synth.releaseAll();
        setTimeout(() => {
            if (!this.disposed) {
                this.disposed = true;
                this.synth.dispose();
            }
        }, 600);
    }

    /** Not used in digital mode. */
    setNote(_frequency: number): void { /* noop */ }

    setVolume(dB: number): void {
        if (!this.disposed) {
            this.synth.volume.value = dB;
        }
    }

    setDetune(cents: number): void {
        if (!this.disposed) {
            this.synth.set({ detune: cents });
        }
    }

    setBrightness(_value: number): void {
        // Could modulate oscillator partials in the future
    }

    triggerNote(note: string): void {
        if (!this.disposed) {
            this.synth.triggerAttack(note);
        }
    }

    releaseNote(note: string): void {
        if (!this.disposed) {
            this.synth.triggerRelease(note);
        }
    }
}

import * as Tone from 'tone';
import type { Instrument } from './Instrument';

/**
 * Violin instrument using Tone.js FMSynth.
 *
 * FM synthesis with a sine carrier + triangle modulator produces
 * the rich harmonic content characteristic of bowed strings.
 * Only owns the synth — effects (vibrato, tremolo, chorus, reverb)
 * are managed by the SoundEngine.
 */
export class ViolinInstrument implements Instrument {
    private synth: Tone.FMSynth;
    private disposed = false;

    constructor() {
        this.synth = new Tone.FMSynth({
            harmonicity: 3.01,
            modulationIndex: 6,
            oscillator: { type: 'sine' },
            modulation: { type: 'triangle' },
            envelope: {
                attack: 0.15,
                decay: 0.1,
                sustain: 0.9,
                release: 0.4,
            },
            modulationEnvelope: {
                attack: 0.3,
                decay: 0.0,
                sustain: 1,
                release: 0.5,
            },
            volume: -12,
        });
    }

    connect(destination: Tone.InputNode): void {
        this.synth.connect(destination);
    }

    start(frequency: number): void {
        this.synth.triggerAttack(frequency);
    }

    stop(): void {
        if (this.disposed) return;
        this.synth.triggerRelease();
        setTimeout(() => {
            if (!this.disposed) {
                this.disposed = true;
                this.synth.dispose();
            }
        }, 600);
    }

    setNote(frequency: number): void {
        if (!this.disposed) {
            this.synth.frequency.value = frequency;
        }
    }

    setVolume(dB: number): void {
        if (!this.disposed) {
            this.synth.volume.value = dB;
        }
    }

    setDetune(cents: number): void {
        if (!this.disposed) {
            this.synth.detune.value = cents;
        }
    }

    setBrightness(value: number): void {
        if (!this.disposed) {
            // Map 0–1 to modulationIndex 2–14 (mellow → bright)
            this.synth.modulationIndex.value = 2 + value * 12;
        }
    }
}

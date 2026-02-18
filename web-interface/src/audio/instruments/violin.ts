import * as Tone from 'tone';
import type { Instrument } from './Instrument';
import type { SoundParams } from '../types';

/**
 * Violin synthesizer using Tone.js FMSynth.
 *
 * FM synthesis (carrier modulated by another oscillator) produces
 * rich harmonic content that naturally resembles bowed strings.
 * A sustained envelope keeps the tone playing continuously, and
 * a vibrato LFO adds the characteristic pitch wobble.
 *
 * Signal chain:
 *   FMSynth (sustained) → vibrato → filter → masterGain → output
 */
export class ViolinInstrument implements Instrument {
    private synth: Tone.FMSynth;
    private vibrato: Tone.Vibrato;
    private masterGain: Tone.Gain;

    private currentFreq = 440;

    constructor() {
        // ── FM Synth — tuned for bowed-string timbre ──────────────────────
        this.synth = new Tone.FMSynth({
            harmonicity: 3.01,       // Modulator freq = ~3× carrier — creates odd harmonics
            modulationIndex: 6,      // Rich overtone depth
            oscillator: {
                type: 'sine',          // Clean carrier
            },
            modulation: {
                type: 'triangle',      // Softer modulation shape
            },
            envelope: {
                attack: 0.15,          // Gentle bow attack
                decay: 0.1,
                sustain: 0.9,          // Nearly full sustain for continuous bowing
                release: 0.3,
            },
            modulationEnvelope: {
                attack: 0.3,           // Modulation fades in (bow bite grows)
                decay: 0.0,
                sustain: 1,
                release: 0.5,
            },
            volume: -12,             // Moderate starting volume
        });

        // ── Vibrato — characteristic violin pitch wobble ──────────────────
        this.vibrato = new Tone.Vibrato({
            frequency: 5.5,
            depth: 0.08,             // Subtle pitch variation
            type: 'sine',
        });

        // ── Master gain ──────────────────────────────────────────────────
        this.masterGain = new Tone.Gain(0.5);

        // ── Signal chain ────────────────────────────────────────────────
        this.synth.connect(this.vibrato);
        this.vibrato.connect(this.masterGain);
    }

    connect(destination: Tone.InputNode): void {
        this.masterGain.connect(destination);
    }

    start(): void {
        // triggerAttack with a frequency — holds the note indefinitely
        this.synth.triggerAttack(this.currentFreq);
    }

    stop(): void {
        this.synth.triggerRelease();

        // Small delay before dispose so the release envelope can finish
        setTimeout(() => {
            this.synth.dispose();
            this.vibrato.dispose();
            this.masterGain.dispose();
        }, 500);
    }

    updateParams(params: SoundParams): void {
        this.currentFreq = params.frequency;

        // Update pitch — setValueAtTime for snappy response
        this.synth.frequency.value = params.frequency;

        // Volume — scale the master gain
        this.masterGain.gain.value = params.gain * 0.7;

        // Modulation depth — map filter cutoff to how "bright/bowed" it sounds
        // Higher cutoff → more modulation index → brighter, more harmonic content
        const modIdx = 2 + (params.filterCutoff / 8000) * 10; // Range: 2–12
        this.synth.modulationIndex.value = modIdx;

        // Vibrato rate — from tremolo param
        this.vibrato.frequency.value = Math.max(0.5, params.tremoloRate * 0.8);

        // Vibrato depth — subtle increase with tremolo rate
        this.vibrato.depth.value = Math.min(0.15, 0.03 + params.tremoloRate * 0.008);

        // Detune
        this.synth.detune.value = params.detune;
    }
}

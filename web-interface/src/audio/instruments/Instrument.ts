import type * as Tone from 'tone';

/**
 * Simplified instrument interface.
 * Each instrument owns only its synth — effects are managed by SoundEngine.
 */
export interface Instrument {
    /** Connect synth output to the effects chain. */
    connect(destination: Tone.InputNode): void;

    /** Begin producing sound (sustained). */
    start(frequency: number): void;

    /** Release and dispose. */
    stop(): void;

    /** Set the playing note by frequency. */
    setNote(frequency: number): void;

    /** Set volume in dB. */
    setVolume(dB: number): void;

    /** Set detune in cents. */
    setDetune(cents: number): void;

    /** Set brightness / modulation depth (0–1 normalized). */
    setBrightness(value: number): void;
}

import type * as Tone from 'tone';

/**
 * Instrument interface.
 * Each instrument owns only its synth — effects are managed by SoundEngine.
 *
 * Instruments support two operational modes:
 * - **Analog** (e.g. violin): Continuous sound with setNote/setVolume/etc.
 * - **Digital** (e.g. piano): Discrete note trigger/release per finger.
 */
export interface Instrument {
    /** Connect synth output to the effects chain. */
    connect(destination: Tone.InputNode): void;

    /** Begin producing sound (sustained). Used by analog instruments. */
    start(frequency: number): void;

    /** Release and dispose. */
    stop(): void;

    /** Set the playing note by frequency. (Analog mode) */
    setNote(frequency: number): void;

    /** Set volume in dB. */
    setVolume(dB: number): void;

    /** Set detune in cents. */
    setDetune(cents: number): void;

    /** Set brightness / modulation depth (0–1 normalized). */
    setBrightness(value: number): void;

    // ── Digital mode (optional — only needed for digital instruments) ────

    /** Trigger a note on (digital mode). */
    triggerNote?(note: string): void;

    /** Release a note (digital mode). */
    releaseNote?(note: string): void;

    /** Whether this instrument supports digital (per-note) mode. */
    readonly isDigital?: boolean;
}

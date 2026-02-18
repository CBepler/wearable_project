import type { SoundParams } from '../types';
import type * as Tone from 'tone';

/**
 * Abstract interface that all instruments must implement.
 * Each instrument creates its own Tone.js nodes and connects
 * them to the provided output node.
 */
export interface Instrument {
    /** Wire the instrument's output into the signal chain. */
    connect(destination: Tone.InputNode): void;

    /** Start the instrument (begin producing sound). */
    start(): void;

    /** Stop and dispose of all internal nodes. */
    stop(): void;

    /** Apply real-time parameter updates from the sensor mapping. */
    updateParams(params: SoundParams): void;
}

import type { SoundParams } from './types';

/**
 * Web Audio API engine for continuous tone generation.
 *
 * Signal chain:
 *   Oscillator → GainNode (with tremolo LFO) → BiquadFilter → StereoPanner → Destination
 */
export class SoundEngine {
    private ctx: AudioContext | null = null;
    private oscillator: OscillatorNode | null = null;
    private gainNode: GainNode | null = null;
    private filter: BiquadFilterNode | null = null;
    private panner: StereoPannerNode | null = null;
    private lfo: OscillatorNode | null = null;
    private lfoGain: GainNode | null = null;
    private _isPlaying = false;

    get isPlaying(): boolean {
        return this._isPlaying;
    }

    /** Initialise (or resume) the AudioContext and start the oscillator. */
    async start(): Promise<void> {
        if (this._isPlaying) return;

        // Create or resume context (handles user-gesture requirement)
        if (!this.ctx) {
            this.ctx = new AudioContext();
        }
        if (this.ctx.state === 'suspended') {
            await this.ctx.resume();
        }

        const ctx = this.ctx;

        // ── Main oscillator ─────────────────────────────────────────────────
        this.oscillator = ctx.createOscillator();
        this.oscillator.type = 'sine';
        this.oscillator.frequency.value = 440;

        // ── Gain ─────────────────────────────────────────────────────────────
        this.gainNode = ctx.createGain();
        this.gainNode.gain.value = 0.3;

        // ── Biquad low-pass filter ───────────────────────────────────────────
        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 4000;
        this.filter.Q.value = 1;

        // ── Stereo panner ────────────────────────────────────────────────────
        this.panner = ctx.createStereoPanner();
        this.panner.pan.value = 0;

        // ── Tremolo LFO ──────────────────────────────────────────────────────
        this.lfo = ctx.createOscillator();
        this.lfo.type = 'sine';
        this.lfo.frequency.value = 0;

        this.lfoGain = ctx.createGain();
        this.lfoGain.gain.value = 0.3; // tremolo depth

        // LFO → lfoGain → main gain AudioParam
        this.lfo.connect(this.lfoGain);
        this.lfoGain.connect(this.gainNode.gain);

        // ── Chain ────────────────────────────────────────────────────────────
        this.oscillator.connect(this.gainNode);
        this.gainNode.connect(this.filter);
        this.filter.connect(this.panner);
        this.panner.connect(ctx.destination);

        this.oscillator.start();
        this.lfo.start();
        this._isPlaying = true;
    }

    /** Stop all nodes and release resources. */
    stop(): void {
        if (!this._isPlaying) return;

        this.oscillator?.stop();
        this.lfo?.stop();
        this.oscillator?.disconnect();
        this.gainNode?.disconnect();
        this.filter?.disconnect();
        this.panner?.disconnect();
        this.lfo?.disconnect();
        this.lfoGain?.disconnect();

        this.oscillator = null;
        this.gainNode = null;
        this.filter = null;
        this.panner = null;
        this.lfo = null;
        this.lfoGain = null;

        this._isPlaying = false;
    }

    /** Smoothly update all sound parameters. Uses `setTargetAtTime` to avoid clicks. */
    updateParams(params: SoundParams): void {
        if (!this._isPlaying || !this.ctx) return;
        const t = this.ctx.currentTime;
        const smooth = 0.02; // 20 ms smoothing constant

        this.oscillator?.frequency.setTargetAtTime(params.frequency, t, smooth);
        this.oscillator?.detune.setTargetAtTime(params.detune, t, smooth);
        this.gainNode?.gain.setTargetAtTime(params.gain, t, smooth);
        this.filter?.frequency.setTargetAtTime(params.filterCutoff, t, smooth);
        this.panner?.pan.setTargetAtTime(params.pan, t, smooth);
        this.lfo?.frequency.setTargetAtTime(params.tremoloRate, t, smooth);
    }
}

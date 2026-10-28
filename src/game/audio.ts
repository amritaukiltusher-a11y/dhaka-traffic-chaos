/**
 * Small procedural sound engine (WebAudio). No audio files are shipped,
 * so there is nothing to license and nothing to download.
 * The AudioContext is created lazily on the first user gesture (browser autoplay rules).
 */
export class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private engineOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private enabled = true;

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(on ? 0.5 : 0, this.ctx.currentTime, 0.03);
    if (!on) this.setEngine(0, false, false);
  }

  isEnabled() {
    return this.enabled;
  }

  /** Must be called from a user gesture (click / key / touch). */
  unlock() {
    try {
      if (!this.ctx) {
        const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Ctor) return;
        this.ctx = new Ctor();
        this.master = this.ctx.createGain();
        this.master.gain.value = this.enabled ? 0.5 : 0;
        this.master.connect(this.ctx.destination);
        this.noiseBuf = this.makeNoise(this.ctx);
      }
      if (this.ctx.state === 'suspended') void this.ctx.resume();
    } catch {
      this.ctx = null;
    }
  }

  private makeNoise(ctx: AudioContext) {
    const len = ctx.sampleRate * 0.6;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private ready(): boolean {
    return !!(this.ctx && this.master && this.enabled && this.ctx.state === 'running');
  }

  startEngine() {
    if (!this.ctx || !this.master || this.engineOsc) return;
    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.value = 60;
    filter.type = 'lowpass';
    filter.frequency.value = 380;
    gain.gain.value = 0;
    osc.connect(filter).connect(gain).connect(this.master);
    osc.start();
    this.engineOsc = osc;
    this.engineGain = gain;
  }

  /** speedNorm 0..1.5 */
  setEngine(speedNorm: number, boosting: boolean, running: boolean) {
    if (!this.ctx || !this.engineOsc || !this.engineGain) return;
    const t = this.ctx.currentTime;
    const on = running && this.enabled;
    this.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 90 + (boosting ? 35 : 0), t, 0.08);
    this.engineGain.gain.setTargetAtTime(on ? 0.035 + speedNorm * 0.025 : 0, t, 0.12);
  }

  stopEngine() {
    try {
      this.engineOsc?.stop();
    } catch {
      /* already stopped */
    }
    this.engineOsc?.disconnect();
    this.engineOsc = null;
    this.engineGain = null;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ready() || !this.ctx || !this.master) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  horn() {
    this.tone(392, 0.32, 'square', 0.07);
    this.tone(494, 0.32, 'square', 0.06);
  }

  crash() {
    if (!this.ready() || !this.ctx || !this.master || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    src.buffer = this.noiseBuf;
    f.type = 'lowpass';
    f.frequency.value = 900;
    g.gain.setValueAtTime(0.3, this.ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);
    src.connect(f).connect(g).connect(this.master);
    src.start();
    this.tone(120, 0.3, 'sawtooth', 0.12, 45);
  }

  pickup() {
    this.tone(660, 0.12, 'triangle', 0.09);
    this.tone(990, 0.16, 'triangle', 0.09, undefined, 0.08);
  }

  nearMiss() {
    this.tone(520, 0.1, 'sine', 0.05, 780);
  }

  boost() {
    this.tone(180, 0.35, 'sawtooth', 0.06, 520);
  }

  shield() {
    this.tone(300, 0.4, 'sine', 0.08, 900);
  }

  levelUp() {
    this.tone(440, 0.12, 'square', 0.05);
    this.tone(554, 0.12, 'square', 0.05, undefined, 0.1);
    this.tone(660, 0.2, 'square', 0.05, undefined, 0.2);
  }

  warn() {
    this.tone(300, 0.15, 'square', 0.05);
    this.tone(300, 0.15, 'square', 0.05, undefined, 0.22);
  }

  over() {
    this.tone(330, 0.25, 'triangle', 0.1, 200);
    this.tone(220, 0.5, 'triangle', 0.1, 90, 0.25);
  }

  click() {
    this.tone(700, 0.05, 'sine', 0.04);
  }

  dispose() {
    this.stopEngine();
    void this.ctx?.close();
    this.ctx = null;
    this.master = null;
  }
}

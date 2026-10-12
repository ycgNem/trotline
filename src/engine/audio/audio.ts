// Procedural audio: buses with volumes, synthesized SFX from two primitives (a tone and filtered
// noise), the jsfxr bank first when it has the sound, and one ambient bed. Extracted from
// Sprocket & Sprout's engine layer; its songs, farm sounds and ambience stayed behind. Nothing
// plays until unlock() runs from a user gesture (browsers require it).
import { playSfxr } from './sfxr';

export interface Vol { master: number; music: number; sfx: number }

type Env = { a: number; d: number; s?: number; r?: number };

export class Audio {
  ctx: AudioContext | null = null;
  master!: GainNode;
  musicBus!: GainNode;
  sfxBus!: GainNode;
  ambBus!: GainNode;
  noiseBuf!: AudioBuffer;
  vol: Vol;
  muted = false;
  private lastSfx = new Map<string, number>();
  /** pitch multiplier for the sound being synthesized (sfx's pitch argument) */
  private pm = 1;
  private lap: { src: AudioBufferSourceNode; g: GainNode; f: BiquadFilterNode } | null = null;

  constructor(settings: Vol = { master: 0.8, music: 0.6, sfx: 0.8 }) {
    this.vol = { ...settings };
  }

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx: AudioContext = new AC();
      this.ctx = ctx;
      this.master = ctx.createGain();
      this.master.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.sfxBus = ctx.createGain();
      this.ambBus = ctx.createGain();
      this.musicBus.connect(this.master);
      this.sfxBus.connect(this.master);
      this.ambBus.connect(this.master);
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.applyVol();
    } catch {
      this.ctx = null;
    }
  }

  applySettings(s: Vol) {
    this.vol = { ...s };
    this.applyVol();
  }

  private applyVol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol.master, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.vol.music * 0.24, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(this.vol.sfx * 0.7, t, 0.05);
    this.ambBus.gain.setTargetAtTime(this.vol.sfx * 0.5, t, 0.05);
  }

  // ---------------- primitives ----------------
  tone(freq: number, type: OscillatorType, env: Env, vol: number, bus: AudioNode = this.sfxBus, t0 = 0, slide = 0, detune = 0): OscillatorNode | null {
    const ctx = this.ctx;
    if (!ctx) return null;
    const t = ctx.currentTime + t0;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    freq *= this.pm;
    o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq * slide), t + env.a + env.d);
    if (detune) o.detune.value = detune;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + env.a);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * (env.s ?? 0.001)), t + env.a + env.d);
    if (env.r) g.gain.exponentialRampToValueAtTime(0.0001, t + env.a + env.d + env.r);
    o.connect(g);
    g.connect(bus);
    o.start(t);
    o.stop(t + env.a + env.d + (env.r ?? 0) + 0.05);
    return o;
  }

  noise(dur: number, vol: number, filter: BiquadFilterType, freq: number, q = 1, t0 = 0, sweep = 0, bus?: AudioNode) {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime + t0;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.5 + Math.random();
    const f = ctx.createBiquadFilter();
    f.type = filter;
    freq *= this.pm;
    f.frequency.setValueAtTime(freq, t);
    if (sweep) f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * sweep), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f);
    f.connect(g);
    g.connect(bus ?? this.sfxBus);
    src.start(t, Math.random());
    src.stop(t + dur + 0.05);
  }

  /** Play a named sound effect. `v` scales volume; `pitch` multiplies the pitch. */
  sfx(id: string, v = 1, pitch = 1) {
    const ctx = this.ctx;
    if (!ctx || v <= 0.02) return;
    const now = ctx.currentTime;
    if (now - (this.lastSfx.get(id) ?? 0) < 0.03) return;
    this.lastSfx.set(id, now);
    const B = this.sfxBus;
    const r = () => 1 + (Math.random() - 0.5) * 0.08;
    if (playSfxr(ctx, B, id, 0.35 * v, r() * pitch)) return;
    this.pm = pitch;
    switch (id) {
      case 'click': this.tone(900 * r(), 'square', { a: 0.002, d: 0.04 }, 0.06 * v, B); break;
      case 'open': this.noise(0.12, 0.08 * v, 'bandpass', 900, 1, 0, 2); this.tone(520, 'triangle', { a: 0.01, d: 0.08 }, 0.05 * v, B, 0, 1.3); break;
      case 'close': this.noise(0.1, 0.06 * v, 'bandpass', 1400, 1, 0, 0.5); this.tone(620, 'triangle', { a: 0.01, d: 0.07 }, 0.04 * v, B, 0, 0.7); break;
      case 'error': this.tone(140, 'square', { a: 0.005, d: 0.18 }, 0.06 * v, B, 0, 0.8); break;
      // a fish finder's ping: a short high sine with a soft tail
      case 'ping': this.tone(2100, 'sine', { a: 0.002, d: 0.25 }, 0.035 * v, B, 0, 0.97); break;
      case 'splash': this.noise(0.35, 0.2 * v, 'lowpass', 1500, 1, 0, 0.3); break;
      // placeholders until Milestone 9 designs the bank: short, distinct, quiet
      case 'cast': this.noise(0.22, 0.07 * v, 'bandpass', 2400, 2, 0, 0.4); break;
      case 'catch': this.noise(0.18, 0.14 * v, 'lowpass', 1200, 1, 0, 0.4); this.tone(330, 'sine', { a: 0.005, d: 0.12 }, 0.07 * v, B, 0.04, 1.8); break;
      case 'zap': this.tone(110 * r(), 'sawtooth', { a: 0.002, d: 0.07 }, 0.025 * v, B, 0, 2.4); break;
      case 'puff': this.noise(0.25, 0.22 * v, 'lowpass', 900, 1, 0, 0.2); this.tone(180, 'square', { a: 0.003, d: 0.12 }, 0.05 * v, B, 0, 0.4); break;
      case 'kill': this.tone(520 * r(), 'triangle', { a: 0.003, d: 0.09 }, 0.05 * v, B, 0, 1.6); break;
      // a thief gulps a pufferfish, then retches: a falling blub and a low buzz
      case 'snatch': this.tone(320 * r(), 'sine', { a: 0.004, d: 0.12 }, 0.07 * v, B, 0, 0.35); this.tone(130, 'square', { a: 0.02, d: 0.3 }, 0.035 * v, B, 0.14, 0.7); break;
      // a laughing gull takes the worm: two quick falling chirps
      case 'gulp': this.tone(980 * r(), 'triangle', { a: 0.003, d: 0.06 }, 0.04 * v, B, 0, 0.75); this.tone(900 * r(), 'triangle', { a: 0.003, d: 0.07 }, 0.04 * v, B, 0.08, 0.7); break;
      // laughing gulls squabbling over a fish: three quick rising calls, "ha-ha-ha"
      case 'squabble': for (let i = 0; i < 3; i++) this.tone((760 + i * 120) * r(), 'triangle', { a: 0.004, d: 0.05 }, 0.035 * v, B, i * 0.07, 1.25); break;
      // claws on a fish: two short scratches
      case 'claw': this.noise(0.05, 0.08 * v, 'bandpass', 3200, 3, 0, 1); this.noise(0.05, 0.07 * v, 'bandpass', 2600, 3, 0.07, 1); break;
      case 'steal': this.tone(220, 'square', { a: 0.005, d: 0.2 }, 0.05 * v, B, 0, 0.6); break;
      case 'coin': this.tone(1320, 'square', { a: 0.002, d: 0.06 }, 0.03 * v, B); this.tone(1760, 'square', { a: 0.002, d: 0.09 }, 0.03 * v, B, 0.05); break;
      case 'wave': this.tone(196, 'triangle', { a: 0.02, d: 0.5 }, 0.07 * v, B, 0, 1.05); this.tone(147, 'triangle', { a: 0.02, d: 0.6 }, 0.05 * v, B, 0.12); break;
      case 'lure': this.noise(0.12, 0.06 * v, 'bandpass', 600, 2); this.tone(440, 'sine', { a: 0.004, d: 0.1 }, 0.04 * v, B, 0, 0.7); break;
      // a bucket of chum tipped out: a wet slop and a low glug
      case 'slick': this.noise(0.3, 0.12 * v, 'lowpass', 700, 1, 0, 0.5); this.tone(150 * r(), 'sine', { a: 0.01, d: 0.18 }, 0.06 * v, B, 0.05, 0.6); break;
      // a spade biting into wet ground
      case 'dig': this.noise(0.08, 0.1 * v, 'bandpass', 1800, 2, 0, 0.6); this.noise(0.12, 0.08 * v, 'lowpass', 500, 1, 0.06, 0.5); break;
      case 'win': for (const [i, f] of [262, 330, 392, 523].entries()) this.tone(f, 'triangle', { a: 0.01, d: 0.3 }, 0.06 * v, B, i * 0.12); break;
      case 'lose': for (const [i, f] of [392, 330, 262, 196].entries()) this.tone(f, 'triangle', { a: 0.01, d: 0.35 }, 0.06 * v, B, i * 0.16); break;
      default: this.tone(600, 'sine', { a: 0.002, d: 0.05 }, 0.03 * v, B);
    }
    this.pm = 1;
  }

  /** The ambient bed: water lapping at the shore, a little louder in wind (0..1). */
  update(wind = 0.3) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    if (!this.lap) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 420;
      const g = ctx.createGain();
      g.gain.value = 0;
      src.connect(f);
      f.connect(g);
      g.connect(this.ambBus);
      src.start();
      this.lap = { src, g, f };
    }
    const t = ctx.currentTime;
    this.lap.g.gain.setTargetAtTime(0.04 + wind * 0.06 + Math.sin(t * 0.7) * 0.015, t, 0.6);
  }
}

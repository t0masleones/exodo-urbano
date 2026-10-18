import type { KeyValueStore } from '../platform';

/** Volumes oferecidos ao jogador (0 = desligado). */
export const VOLUME_LEVELS = [0, 0.35, 0.65, 1] as const;
const KEY = 'audio:v1';
const DEFAULT_VOLUME = 0.65;

export interface AmbienceInput {
  hour: number;
  season: 'chuvas' | 'seca';
  rain: boolean;
}

export interface Mix {
  cicadas: number;
  seriema: number;
  crickets: number;
  rain: number;
}

/**
 * Quanto de cada som do cerrado toca agora (0 a 1). Função pura: fácil de
 * testar e de ajustar sem mexer no sintetizador.
 * - cigarras: calor do dia, mais fortes na seca, somem com chuva
 * - seriema: canta de manhã cedo e no fim da tarde
 * - grilos: à noite
 */
export function ambienceMix({ hour, season, rain }: AmbienceInput): Mix {
  const hot = hour >= 9 && hour < 17;
  const day = hour >= 6.5 && hour < 18.5;
  return {
    cicadas: rain ? 0 : hot ? (season === 'seca' ? 1 : 0.6) : day ? 0.2 : 0,
    seriema: rain ? 0 : hour >= 6 && hour < 10 ? 1 : hour >= 16 && hour < 18 ? 0.5 : 0,
    crickets: hour >= 19 || hour < 5 ? (rain ? 0.3 : 1) : 0,
    rain: rain ? 1 : 0,
  };
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

/**
 * Sintetizador de ambiente: nenhum arquivo de áudio, tudo gerado na hora com
 * Web Audio (só código próprio, sem licença de terceiros). Só começa depois
 * do primeiro toque/tecla, como exigem os navegadores.
 */
export class Ambience {
  volume: number = DEFAULT_VOLUME;
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private layer!: Record<keyof Mix, GainNode>;
  private cicadaSwell!: GainNode;
  private mix: Mix = { cicadas: 0, seriema: 0, crickets: 0, rain: 0 };
  private nextCicada = 0;
  private nextSeriema = 0;
  private nextCricket = 0;
  private suspended = false;

  constructor(private storage: KeyValueStore) {}

  async load() {
    const v = Number(await this.storage.get(KEY));
    if ((VOLUME_LEVELS as readonly number[]).includes(v)) this.volume = v;
  }

  async setVolume(v: number) {
    if (!(VOLUME_LEVELS as readonly number[]).includes(v)) return;
    this.volume = v;
    await this.storage.set(KEY, String(v)).catch(() => undefined);
    if (v > 0) this.unlock();
    this.applyMaster();
  }

  /** Chamado no primeiro gesto do jogador (política de autoplay dos navegadores). */
  unlock() {
    if (this.volume === 0) return;
    if (!this.ctx) {
      const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.build(this.ctx);
      setInterval(() => this.schedule(), 200);
    }
    if (!this.suspended) void this.ctx.resume();
    this.applyMaster();
  }

  update(input: AmbienceInput) {
    this.mix = ambienceMix(input);
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    for (const k of Object.keys(this.mix) as (keyof Mix)[]) this.layer[k].gain.setTargetAtTime(this.mix[k], t, 1.5);
  }

  /** App em segundo plano: silencia e para de gastar bateria. */
  suspend() {
    this.suspended = true;
    void this.ctx?.suspend();
  }

  resume() {
    this.suspended = false;
    if (this.volume > 0) void this.ctx?.resume();
  }

  private applyMaster() {
    if (!this.ctx) return;
    this.master.gain.setTargetAtTime(this.volume * 0.5, this.ctx.currentTime, 0.3);
    if (this.volume === 0) void this.ctx.suspend();
    else if (!this.suspended) void this.ctx.resume();
  }

  // ------------------------------------------------------------ grafo de áudio

  private build(ctx: AudioContext) {
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    const gain = (v = 0, to: AudioNode = this.master) => {
      const g = ctx.createGain();
      g.gain.value = v;
      g.connect(to);
      return g;
    };
    // começa já na mistura atual (hora/clima recebidos antes do primeiro toque)
    this.layer = { cicadas: gain(this.mix.cicadas), seriema: gain(this.mix.seriema), crickets: gain(this.mix.crickets), rain: gain(this.mix.rain) };

    // ruído branco reaproveitado por chuva e cigarras
    const noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noiseSource = () => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      src.loop = true;
      src.start();
      return src;
    };

    // chuva: ruído com graves e agudos cortados, mais um chiado suave
    const rainHp = ctx.createBiquadFilter();
    rainHp.type = 'highpass';
    rainHp.frequency.value = 350;
    const rainLp = ctx.createBiquadFilter();
    rainLp.type = 'lowpass';
    rainLp.frequency.value = 2800;
    noiseSource().connect(rainHp).connect(rainLp).connect(gain(0.55, this.layer.rain));

    // cigarras: ruído agudo e estreito, pulsado rápido (~40 Hz), em ondas
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 5200;
    band.Q.value = 7;
    const pulse = ctx.createGain();
    pulse.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 42;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = 0.5;
    lfo.connect(lfoDepth).connect(pulse.gain);
    lfo.start();
    this.cicadaSwell = gain(0, this.layer.cicadas);
    noiseSource().connect(band).connect(pulse).connect(gain(0.9, this.cicadaSwell));
  }

  /** Agenda os eventos (onda de cigarras, canto da seriema, cricrilar) com antecedência. */
  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    if (t >= this.nextCicada) {
      const up = rand(1.5, 3), hold = rand(3, 7), down = rand(2, 4), peak = rand(0.6, 1);
      const g = this.cicadaSwell.gain;
      g.cancelScheduledValues(t);
      g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(peak, t + up);
      g.setValueAtTime(peak, t + up + hold);
      g.linearRampToValueAtTime(0.05, t + up + hold + down);
      this.nextCicada = t + up + hold + down + rand(2, 10);
    }

    if (this.mix.seriema > 0 && t >= this.nextSeriema) {
      this.seriemaCall(t + 0.1, rand(0.5, 1));
      this.nextSeriema = t + rand(25, 55);
    }
    if (this.nextSeriema === 0) this.nextSeriema = t + rand(4, 12);

    if (this.mix.crickets > 0 && t >= this.nextCricket - 0.4) {
      const at = Math.max(t, this.nextCricket);
      this.cricketChirp(at);
      this.nextCricket = at + rand(0.7, 1.1);
    }
  }

  /** Seriema: série de gritos que aceleram, com o tom caindo ("ká-ká-ká... kiá"). */
  private seriemaCall(start: number, distance: number) {
    const ctx = this.ctx!;
    const out = ctx.createGain();
    out.gain.value = 0.35 * distance;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    lp.connect(out).connect(this.layer.seriema);
    const notes = Math.round(rand(8, 13));
    let at = start;
    for (let i = 0; i < notes; i++) {
      const last = i >= notes - 2;
      const len = last ? 0.28 : 0.11;
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const f0 = last ? 1350 : 1150 - i * 18;
      osc.frequency.setValueAtTime(f0, at);
      osc.frequency.exponentialRampToValueAtTime(f0 * (last ? 0.62 : 0.72), at + len);
      const env = ctx.createGain();
      env.gain.setValueAtTime(0.0001, at);
      env.gain.exponentialRampToValueAtTime(1, at + 0.015);
      env.gain.exponentialRampToValueAtTime(0.0001, at + len);
      osc.connect(env).connect(lp);
      osc.start(at);
      osc.stop(at + len + 0.02);
      at += last ? 0.36 : Math.max(0.12, 0.24 - i * 0.012);
    }
  }

  /** Grilo: três pulsos curtos e agudos. */
  private cricketChirp(at: number) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = rand(4100, 4500);
    const env = ctx.createGain();
    env.gain.value = 0;
    for (let i = 0; i < 3; i++) {
      const p = at + i * 0.045;
      env.gain.setValueAtTime(0, p);
      env.gain.linearRampToValueAtTime(0.18, p + 0.008);
      env.gain.linearRampToValueAtTime(0, p + 0.03);
    }
    osc.connect(env).connect(this.layer.crickets);
    osc.start(at);
    osc.stop(at + 0.2);
  }
}

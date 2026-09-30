import { computed, effect, Injectable, signal } from '@angular/core';
import { readStorage, writeStorage } from './storage';

export type MoveSound = 'move' | 'capture' | 'check';

/** Synthesised in the browser: nothing to download. */
type SynthSet = 'wood' | 'click';
/** Recorded sets from lichess (Enigmahack, AGPLv3+), in public/sounds/<id>/. */
type FileSet = 'piano' | 'nes' | 'sfx' | 'futuristic';
export type SoundSetId = SynthSet | FileSet | 'off';

/** In menu order. Labels are the `sound.set.<id>` translation keys. */
export const SOUND_SETS: readonly SoundSetId[] = [
  'wood',
  'click',
  'piano',
  'nes',
  'sfx',
  'futuristic',
  'off',
];

const FILE_SETS: ReadonlySet<SoundSetId> = new Set<FileSet>(['piano', 'nes', 'sfx', 'futuristic']);
const FILES: Record<MoveSound, string> = { move: 'Move', capture: 'Capture', check: 'Check' };

const SET_KEY = 'cc:sound-set';
const VOLUME_KEY = 'cc:sound-volume';
const DEFAULT_VOLUME = 0.6;

const pieceCount = (fen: string) => fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;

/** Which sound a change of position deserves: check beats capture beats a quiet move. */
export function moveSound(beforeFen: string, after: { fen: string; check: boolean }): MoveSound {
  if (after.check) return 'check';
  return pieceCount(after.fen) < pieceCount(beforeFen) ? 'capture' : 'move';
}

function storedSet(): SoundSetId {
  const saved = readStorage(SET_KEY);
  if (SOUND_SETS.includes(saved as SoundSetId)) return saved as SoundSetId;
  // The first version only had on/off.
  return readStorage('cc:sound') === 'off' ? 'off' : 'wood';
}

function storedVolume(): number {
  const saved = Number(readStorage(VOLUME_KEY));
  return readStorage(VOLUME_KEY) !== null && saved >= 0 && saved <= 1 ? saved : DEFAULT_VOLUME;
}

/**
 * Move sounds with a choice of sets, like lichess: two soft ones generated
 * with the Web Audio API, four recorded ones (downloaded only when chosen),
 * or none. Set and volume are remembered per device.
 */
@Injectable({ providedIn: 'root' })
export class MoveSounds {
  readonly set = signal<SoundSetId>(storedSet());
  readonly volume = signal(storedVolume());
  readonly enabled = computed(() => this.set() !== 'off' && this.volume() > 0);

  private context?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private readonly recordings = new Map<string, Promise<AudioBuffer | null>>();

  constructor() {
    effect(() => writeStorage(SET_KEY, this.set()));
    effect(() => {
      const volume = this.volume();
      writeStorage(VOLUME_KEY, String(volume));
      if (this.master) this.master.gain.value = volume;
    });
  }

  /** Switches set and plays a sample so people hear what they picked. */
  choose(set: SoundSetId): void {
    this.set.set(set);
    this.play('move');
    const ctx = this.context;
    if (ctx && FILE_SETS.has(set)) {
      for (const kind of ['capture', 'check'] as const) void this.load(ctx, set, kind);
    }
  }

  play(kind: MoveSound): void {
    if (!this.enabled()) return;
    const set = this.set();
    const ctx = this.audio();
    if (!ctx || !this.master) return;
    if (FILE_SETS.has(set)) void this.playRecording(ctx, set, kind);
    else if (set === 'wood') this.wood(ctx, kind);
    else if (set === 'click') this.click(ctx, kind);
  }

  // ---- Audio plumbing -------------------------------------------------------------

  /** Browsers only start audio after the page has had a click or tap, which every move has. */
  private audio(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    try {
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = this.volume();
        this.master.connect(this.context.destination);
      }
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  private async playRecording(ctx: AudioContext, set: SoundSetId, kind: MoveSound): Promise<void> {
    const audio = await this.load(ctx, set, kind);
    // The set may have changed while the file was loading.
    if (!audio || this.set() !== set || !this.master) return;
    const source = ctx.createBufferSource();
    source.buffer = audio;
    source.connect(this.master);
    source.start();
  }

  /** Downloads and decodes a recording once; later calls reuse it. */
  private load(ctx: AudioContext, set: SoundSetId, kind: MoveSound): Promise<AudioBuffer | null> {
    const url = `/sounds/${set}/${FILES[kind]}.mp3`;
    let buffer = this.recordings.get(url);
    if (!buffer) {
      buffer = fetch(url)
        .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject()))
        .then((data) => ctx.decodeAudioData(data))
        .catch(() => null);
      this.recordings.set(url, buffer);
    }
    return buffer;
  }

  // ---- Synthesised sets ---------------------------------------------------------

  /** A soft, low wooden "thock": mostly body, little click. */
  private wood(ctx: AudioContext, kind: MoveSound): void {
    const at = ctx.currentTime + 0.01;
    this.knock(ctx, at, 1);
    if (kind === 'capture') this.knock(ctx, at + 0.06, 0.6);
    if (kind === 'check') this.bell(ctx, at + 0.04, 660, 0.05);
  }

  /** A very quiet tick. */
  private click(ctx: AudioContext, kind: MoveSound): void {
    const at = ctx.currentTime + 0.01;
    this.tick(ctx, at, 1);
    if (kind === 'capture') this.tick(ctx, at + 0.05, 0.7);
    if (kind === 'check') this.bell(ctx, at + 0.03, 1320, 0.035);
  }

  private knock(ctx: AudioContext, at: number, level: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    noise
      .connect(filter)
      .connect(this.envelope(ctx, at, 0.18 * level, 0.002, 0.035))
      .connect(this.master!);
    noise.start(at);
    noise.stop(at + 0.05);

    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(190, at);
    body.frequency.exponentialRampToValueAtTime(95, at + 0.07);
    body.connect(this.envelope(ctx, at, 0.35 * level, 0.004, 0.075)).connect(this.master!);
    body.start(at);
    body.stop(at + 0.09);
  }

  private tick(ctx: AudioContext, at: number, level: number): void {
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2600;
    filter.Q.value = 3;
    noise
      .connect(filter)
      .connect(this.envelope(ctx, at, 0.22 * level, 0.001, 0.018))
      .connect(this.master!);
    noise.start(at);
    noise.stop(at + 0.03);
  }

  private bell(ctx: AudioContext, at: number, freq: number, level: number): void {
    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = freq;
    tone.connect(this.envelope(ctx, at, level, 0.005, 0.3)).connect(this.master!);
    tone.start(at);
    tone.stop(at + 0.35);
  }

  private envelope(
    ctx: AudioContext,
    at: number,
    peak: number,
    attack: number,
    decay: number,
  ): GainNode {
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + attack + decay);
    return gain;
  }

  private noiseBuffer(ctx: AudioContext): AudioBuffer {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.1), ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
}

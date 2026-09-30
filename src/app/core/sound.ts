import { effect, Injectable, signal } from '@angular/core';
import { readStorage, writeStorage } from './storage';

export type MoveSound = 'move' | 'capture' | 'check';

const STORAGE_KEY = 'cc:sound';

const pieceCount = (fen: string) => fen.split(' ')[0].replace(/[^a-zA-Z]/g, '').length;

/** Which sound a change of position deserves: check beats capture beats a quiet move. */
export function moveSound(beforeFen: string, after: { fen: string; check: boolean }): MoveSound {
  if (after.check) return 'check';
  return pieceCount(after.fen) < pieceCount(beforeFen) ? 'capture' : 'move';
}

/**
 * Move sounds, synthesised with the Web Audio API: a short wooden "tock"
 * (filtered noise over a low thump). No audio files, nothing to download.
 * On by default; the choice is remembered per device.
 */
@Injectable({ providedIn: 'root' })
export class MoveSounds {
  readonly enabled = signal(readStorage(STORAGE_KEY) !== 'off');

  private context?: AudioContext;
  private noise?: AudioBuffer;

  constructor() {
    effect(() => writeStorage(STORAGE_KEY, this.enabled() ? 'on' : 'off'));
  }

  toggle(): void {
    this.enabled.update((on) => !on);
    // Let people hear what they just switched on.
    if (this.enabled()) this.play('move');
  }

  play(kind: MoveSound): void {
    if (!this.enabled()) return;
    const ctx = this.audio();
    if (!ctx) return;
    const at = ctx.currentTime + 0.01;
    switch (kind) {
      case 'move':
        this.knock(ctx, at, 1, 1700);
        break;
      case 'capture':
        // Two pieces touching: a sharper knock, then a softer one.
        this.knock(ctx, at, 1.2, 1300);
        this.knock(ctx, at + 0.05, 0.7, 2100);
        break;
      case 'check':
        this.knock(ctx, at, 1, 1700);
        this.chime(ctx, at + 0.03);
        break;
    }
  }

  /** Browsers only start audio after the page has had a click or tap, which every move has. */
  private audio(): AudioContext | null {
    if (typeof AudioContext === 'undefined') return null;
    try {
      this.context ??= new AudioContext();
      if (this.context.state === 'suspended') void this.context.resume();
      return this.context;
    } catch {
      return null;
    }
  }

  private knock(ctx: AudioContext, at: number, level: number, pitch: number): void {
    // Click: band-passed noise with a fast decay.
    const noise = ctx.createBufferSource();
    noise.buffer = this.noiseBuffer(ctx);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = pitch;
    band.Q.value = 1.6;
    const click = this.envelope(ctx, at, 0.55 * level, 0.002, 0.06);
    noise.connect(band).connect(click).connect(ctx.destination);
    noise.start(at);
    noise.stop(at + 0.08);

    // Body: a low sine that drops in pitch, like wood on wood.
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.setValueAtTime(260, at);
    body.frequency.exponentialRampToValueAtTime(120, at + 0.08);
    const thump = this.envelope(ctx, at, 0.4 * level, 0.003, 0.09);
    body.connect(thump).connect(ctx.destination);
    body.start(at);
    body.stop(at + 0.1);
  }

  /** A soft two-note chime for check. */
  private chime(ctx: AudioContext, at: number): void {
    for (const [offset, freq] of [
      [0, 988],
      [0.09, 1319],
    ] as const) {
      const tone = ctx.createOscillator();
      tone.type = 'triangle';
      tone.frequency.value = freq;
      const gain = this.envelope(ctx, at + offset, 0.12, 0.005, 0.25);
      tone.connect(gain).connect(ctx.destination);
      tone.start(at + offset);
      tone.stop(at + offset + 0.3);
    }
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

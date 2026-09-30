import { DestroyRef, inject, Injectable } from '@angular/core';
import { ChessEngine, type AnalyseOptions, type EngineLine } from '../engine/chess-engine';

/** Stockfish 19 "lite single-threaded" (GPL-3.0): ~1.8 MB, no special server headers needed. */
const ENGINE_URL = '/engine/stockfish-19-lite-single.js';

/**
 * ChessEngine backed by Stockfish compiled to WebAssembly, running in a web
 * worker. The worker is created on first use, so pages that never analyse
 * never download the engine.
 */
@Injectable()
export class StockfishEngine extends ChessEngine {
  private worker?: Worker;
  private ready?: Promise<void>;
  private listener: ((line: string) => void) | null = null;
  /** Serialises searches: UCI engines handle one "go" at a time. */
  private queue: Promise<unknown> = Promise.resolve();

  constructor() {
    super();
    inject(DestroyRef).onDestroy(() => this.worker?.terminate());
  }

  analyse(fen: string, options: AnalyseOptions): Promise<EngineLine> {
    const run = this.queue.then(() => this.search(fen, options));
    this.queue = run.catch(() => undefined);
    return run;
  }

  private boot(): Promise<void> {
    this.ready ??= new Promise((resolve, reject) => {
      const worker = new Worker(ENGINE_URL);
      worker.onmessage = (event: MessageEvent<string>) => this.listener?.(String(event.data));
      worker.onerror = (event) => reject(new Error(event.message || 'Engine failed to load'));
      this.worker = worker;
      this.listener = (line) => {
        if (line === 'uciok') this.send('isready');
        if (line === 'readyok') {
          this.listener = null;
          resolve();
        }
      };
      this.send('uci');
    });
    return this.ready;
  }

  private async search(
    fen: string,
    { depth, onUpdate, signal }: AnalyseOptions,
  ): Promise<EngineLine> {
    await this.boot();
    const whiteToMove = fen.split(' ')[1] !== 'b';
    let best: EngineLine = { depth: 0, pv: [] };

    return new Promise<EngineLine>((resolve) => {
      const stop = () => this.send('stop');
      signal?.addEventListener('abort', stop, { once: true });
      this.listener = (line) => {
        if (line.startsWith('info') && line.includes(' pv ')) {
          const parsed = parseInfo(line, whiteToMove);
          if (parsed) {
            best = parsed;
            onUpdate?.(parsed);
          }
        } else if (line.startsWith('bestmove')) {
          signal?.removeEventListener('abort', stop);
          this.listener = null;
          if (best.pv.length === 0) {
            const move = line.split(' ')[1];
            if (move && move !== '(none)') best = { ...best, pv: [move] };
          }
          resolve(best);
        }
      };
      this.send(`position fen ${fen}`);
      this.send(`go depth ${depth}`);
      if (signal?.aborted) stop();
    });
  }

  private send(command: string): void {
    this.worker?.postMessage(command);
  }
}

/** Parses a UCI "info" line; scores are converted to White's point of view. */
function parseInfo(line: string, whiteToMove: boolean): EngineLine | null {
  const tokens = line.split(' ');
  const at = (name: string) => tokens.indexOf(name);
  // Only the main line: ignore MultiPV alternatives and bound-only scores.
  if (at('multipv') > -1 && tokens[at('multipv') + 1] !== '1') return null;
  if (at('lowerbound') > -1 || at('upperbound') > -1) return null;
  const score = at('score');
  if (score < 0) return null;
  const sign = whiteToMove ? 1 : -1;
  const value = Number(tokens[score + 2]) * sign;
  return {
    depth: Number(tokens[at('depth') + 1]),
    ...(tokens[score + 1] === 'mate' ? { mate: value } : { cp: value }),
    pv: tokens.slice(at('pv') + 1),
  };
}

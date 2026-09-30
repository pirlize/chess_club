import type { Color } from '../model';
import type { EngineLine } from './chess-engine';

/**
 * Game-review maths, following lichess's published formulas so results
 * feel familiar: winning chances from centipawns, move classification by
 * how much the mover's winning chances dropped, and accuracy per move.
 */

export type MoveVerdict = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder';

/** NAG codes written into the game for each verdict. */
export const VERDICT_NAG: Partial<Record<MoveVerdict, number>> = {
  inaccuracy: 6, // ?!
  mistake: 2, // ?
  blunder: 4, // ??
};

/** White's winning chances in [-1, 1]. Mate counts as a decisive ±1000 cp. */
export function winningChances(line: Pick<EngineLine, 'cp' | 'mate'>): number {
  const cp = line.mate !== undefined ? Math.sign(line.mate || 1) * 1000 : (line.cp ?? 0);
  const clamped = Math.max(-1000, Math.min(1000, cp));
  return 2 / (1 + Math.exp(-0.00368208 * clamped)) - 1;
}

/** White's winning percentage, 0–100 (50 = equal). */
export const winPercent = (line: Pick<EngineLine, 'cp' | 'mate'>) => 50 + 50 * winningChances(line);

/**
 * Classifies a move from the evaluations before and after it.
 * `played` and `best` are UCI; a move equal to the engine's choice is "best".
 */
export function classifyMove(
  before: EngineLine,
  after: EngineLine,
  mover: Color,
  played: string,
): MoveVerdict {
  const sign = mover === 'white' ? 1 : -1;
  const drop = sign * (winningChances(before) - winningChances(after));
  if (drop >= 0.3) return 'blunder';
  if (drop >= 0.2) return 'mistake';
  if (drop >= 0.1) return 'inaccuracy';
  return before.pv[0] === played ? 'best' : 'good';
}

/** Accuracy of one move, 0–100, from the mover's win% before and after. */
export function moveAccuracy(before: EngineLine, after: EngineLine, mover: Color): number {
  const sign = mover === 'white' ? 1 : -1;
  const winBefore = 50 + sign * (winPercent(before) - 50);
  const winAfter = 50 + sign * (winPercent(after) - 50);
  const raw = 103.1668 * Math.exp(-0.04354 * Math.max(0, winBefore - winAfter)) - 3.1669;
  return Math.max(0, Math.min(100, raw));
}

/** "+1.3", "−0.4", "#3", "−#2" */
export function formatEval(line: Pick<EngineLine, 'cp' | 'mate'>): string {
  if (line.mate !== undefined) return `${line.mate < 0 ? '−' : ''}#${Math.abs(line.mate)}`;
  const pawns = (line.cp ?? 0) / 100;
  return `${pawns > 0 ? '+' : pawns < 0 ? '−' : ''}${Math.abs(pawns).toFixed(1)}`;
}

/**
 * Evaluations of consecutive positions, made consistent: when the game
 * followed the engine's own first choice, the position can't be worth more
 * than the one it leads to, so it takes that (one ply deeper) evaluation.
 * Fixes horizon effects, e.g. a sacrifice the engine only sees a move later
 * would otherwise make the move before it look like a blunder.
 *
 * `evals[i]` is the position before `played[i]`; `evals` has one more entry.
 */
export function reconcile(evals: readonly EngineLine[], played: readonly string[]): EngineLine[] {
  const result = [...evals];
  for (let i = played.length - 1; i >= 0; i--) {
    if (result[i].pv[0] === played[i]) {
      const { cp, mate } = result[i + 1];
      result[i] = { depth: result[i].depth, pv: result[i].pv, cp, mate };
    }
  }
  return result;
}

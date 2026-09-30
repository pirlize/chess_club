import { computed, DestroyRef, effect, inject, Injectable, signal, untracked } from '@angular/core';
import { ChessRules, uciToMove } from '../../chess/chess-rules';
import { ChessEngine, type EngineLine } from '../../chess/engine/chess-engine';
import {
  classifyMove,
  formatEval,
  moveAccuracy,
  reconcile,
  VERDICT_NAG,
  winPercent,
  type MoveVerdict,
} from '../../chess/engine/review';
import { GameSession } from '../../chess/game-session';
import { mainline, moveNumber } from '../../chess/game-tree';
import type { BoardShape, Color, MoveNode, TreeNode } from '../../chess/model';
import { toggleNag } from '../../chess/nags';
import { Language } from '../../core/i18n';

/** Deep enough to be useful, quick enough on a phone with the lite engine. */
const LIVE_DEPTH = 18;
const REVIEW_DEPTH = 12;

export interface ReviewedMove {
  node: MoveNode;
  mover: Color;
  verdict: MoveVerdict;
  accuracy: number;
  /** White's win % after the move. */
  win: number;
  evalText: string;
  /** Engine's preferred move in the position before, e.g. "15. Nf3". */
  bestLabel: string | null;
}

export type ReviewState =
  | { status: 'idle' }
  | { status: 'running'; done: number; total: number }
  | {
      status: 'ready';
      startWin: number;
      moves: ReviewedMove[];
      accuracy: Record<Color, number>;
      counts: Record<Color, Record<'inaccuracy' | 'mistake' | 'blunder', number>>;
    };

/**
 * Engine features for the analysis board: live evaluation of the selected
 * position (with a best-move arrow) and a full game review. Provide it next to
 * the GameSession it reads (`providers: [GameSession, EngineAnalysis]`).
 */
@Injectable()
export class EngineAnalysis {
  private readonly engine = inject(ChessEngine);
  private readonly rules = inject(ChessRules);
  private readonly session = inject(GameSession);
  private readonly language = inject(Language);

  readonly enabled = signal(false);
  readonly line = signal<EngineLine | null>(null);
  readonly failed = signal(false);
  readonly review = signal<ReviewState>({ status: 'idle' });

  private live?: AbortController;
  private reviewRun?: AbortController;

  /** The engine's suggested move as a blue arrow. */
  readonly bestArrow = computed<BoardShape[]>(() => {
    const uci = this.enabled() ? this.line()?.pv[0] : undefined;
    if (!uci) return [];
    const { from, to } = uciToMove(uci);
    return [{ from, to, color: 'blue' }];
  });

  readonly evalText = computed(() => {
    const line = this.line();
    return line ? formatEval(line) : '';
  });

  readonly whitePercent = computed(() => {
    const line = this.line();
    return line ? winPercent(line) : 50;
  });

  /** The best line in readable notation: "14… Qe6 15. Bxd7+ Nxd7". */
  readonly bestLine = computed(() => {
    const node = this.session.current();
    const line = this.line();
    return node && line ? this.sanLine(node.fen, node.ply, line.pv.slice(0, 8)) : '';
  });

  constructor() {
    effect(() => {
      const on = this.enabled() && this.review().status !== 'running';
      const node = this.session.current();
      untracked(() => this.analyseLive(on ? node : null));
    });
    inject(DestroyRef).onDestroy(() => {
      this.live?.abort();
      this.reviewRun?.abort();
    });
  }

  async runReview(): Promise<void> {
    const tree = this.session.tree();
    if (!tree) return;
    this.live?.abort();
    const run = new AbortController();
    this.reviewRun = run;
    const moves = mainline(tree.root);
    const nodes: TreeNode[] = [tree.root, ...moves];
    const raw: EngineLine[] = [];
    this.review.set({ status: 'running', done: 0, total: nodes.length });

    for (const node of nodes) {
      if (run.signal.aborted) return this.review.set({ status: 'idle' });
      try {
        raw.push(await this.evaluate(node.fen, REVIEW_DEPTH, run.signal));
      } catch {
        this.failed.set(true);
        return this.review.set({ status: 'idle' });
      }
      this.review.set({ status: 'running', done: raw.length, total: nodes.length });
    }

    const evals = reconcile(
      raw,
      moves.map((m) => m.uci),
    );
    const reviewed = moves.map((node, i): ReviewedMove => {
      const mover: Color = node.ply % 2 === 1 ? 'white' : 'black';
      const before = evals[i];
      const after = evals[i + 1];
      const best = before.pv[0];
      return {
        node,
        mover,
        verdict: classifyMove(before, after, mover, node.uci),
        accuracy: moveAccuracy(before, after, mover),
        win: winPercent(after),
        evalText: formatEval(after),
        bestLabel:
          best && best !== node.uci ? this.sanLine(nodes[i].fen, nodes[i].ply, [best]) : null,
      };
    });

    const bySide = (color: Color) => reviewed.filter((m) => m.mover === color);
    const average = (list: ReviewedMove[]) =>
      list.length ? list.reduce((sum, m) => sum + m.accuracy, 0) / list.length : 100;
    const count = (color: Color) => ({
      inaccuracy: bySide(color).filter((m) => m.verdict === 'inaccuracy').length,
      mistake: bySide(color).filter((m) => m.verdict === 'mistake').length,
      blunder: bySide(color).filter((m) => m.verdict === 'blunder').length,
    });

    this.review.set({
      status: 'ready',
      startWin: winPercent(evals[0]),
      moves: reviewed,
      accuracy: { white: average(bySide('white')), black: average(bySide('black')) },
      counts: { white: count('white'), black: count('black') },
    });
  }

  cancelReview(): void {
    this.reviewRun?.abort();
  }

  clearReview(): void {
    this.review.set({ status: 'idle' });
  }

  /** Writes ?!, ?, ?? and "better was …" notes into the moves. Returns how many moves changed. */
  applyReview(): number {
    const review = this.review();
    if (review.status !== 'ready') return 0;
    let changed = 0;
    for (const move of review.moves) {
      const nag = VERDICT_NAG[move.verdict];
      if (!nag) continue;
      const note = move.bestLabel
        ? this.language.t('engine.betterWas', { move: move.bestLabel })
        : '';
      this.session.updateNode(move.node, (node) => {
        if (!node.nags.includes(nag)) node.nags = toggleNag(node.nags, nag);
        if (note && !node.comment.includes(note))
          node.comment = node.comment ? `${node.comment}\n${note}` : note;
      });
      changed++;
    }
    return changed;
  }

  private analyseLive(node: TreeNode | null): void {
    this.live?.abort();
    this.line.set(null);
    if (!node) return;
    const terminal = this.terminal(node.fen);
    if (terminal) return this.line.set(terminal);
    const run = new AbortController();
    this.live = run;
    this.engine
      .analyse(node.fen, {
        depth: LIVE_DEPTH,
        signal: run.signal,
        onUpdate: (line) => !run.signal.aborted && this.line.set(line),
      })
      .then((line) => !run.signal.aborted && this.line.set(line))
      .catch(() => this.failed.set(true));
  }

  private evaluate(fen: string, depth: number, signal: AbortSignal): Promise<EngineLine> {
    const terminal = this.terminal(fen);
    return terminal ? Promise.resolve(terminal) : this.engine.analyse(fen, { depth, signal });
  }

  /** Checkmate and stalemate need no search: the result is known. */
  private terminal(fen: string): EngineLine | null {
    const status = this.rules.status(fen);
    if (status.stalemate) return { depth: 0, cp: 0, pv: [] };
    if (!status.checkmate) return null;
    const whiteMated = this.rules.turn(fen) === 'white';
    return { depth: 0, cp: whiteMated ? -1000 : 1000, pv: [] };
  }

  private sanLine(fen: string, ply: number, pv: string[]): string {
    const parts: string[] = [];
    let position = fen;
    for (const [i, uci] of pv.entries()) {
      const played = this.rules.play(position, uciToMove(uci));
      if (!played) break;
      const movePly = ply + 1 + i;
      if (movePly % 2 === 1 || i === 0) parts.push(moveNumber(movePly));
      parts.push(played.san);
      position = played.fen;
    }
    return parts.join(' ');
  }
}

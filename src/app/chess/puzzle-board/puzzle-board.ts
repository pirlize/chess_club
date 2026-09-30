import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  untracked,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoveSounds } from '../../core/sound';
import { Icon } from '../../ui/icon';
import { Board } from '../board/board';
import type { BoardView } from '../board-renderer';
import { ChessRules, uciToMove } from '../chess-rules';
import type { MoveInput, PlayedMove, Square } from '../model';

/**
 * One step of a solution in UCI. Player steps (even indexes) may list
 * several accepted moves; opponent replies (odd indexes) are played automatically.
 */
export type PuzzleStep = string | readonly string[];

export interface PuzzleResult {
  mistakes: number;
  revealed: boolean;
}

type State = 'playing' | 'right' | 'wrong' | 'solved';

const REPLY_DELAY_MS = 450;

/** An interactive "find the move" board for lessons and puzzles. */
@Component({
  selector: 'app-puzzle-board',
  imports: [Board, Icon, TranslocoPipe],
  templateUrl: './puzzle-board.html',
  styleUrl: './puzzle-board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PuzzleBoard {
  readonly fen = input.required<string>();
  readonly solution = input.required<readonly PuzzleStep[]>();
  /** Accept any checkmate as the final move, even if it differs from the listed one. */
  readonly anyMate = input(true);
  readonly lastMove = input<[Square, Square] | undefined>(undefined);
  readonly solved = output<PuzzleResult>();

  private readonly rules = inject(ChessRules);
  protected readonly sounds = inject(MoveSounds);
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  // Everything resets when a new puzzle (fen) arrives.
  protected readonly position = linkedSignal(() => this.fen());
  protected readonly step = linkedSignal(() => (this.fen(), 0));
  protected readonly state = linkedSignal<State>(() => (this.fen(), 'playing'));
  protected readonly mistakes = linkedSignal(() => (this.fen(), 0));
  protected readonly revealed = linkedSignal(() => (this.fen(), false));
  protected readonly hinted = linkedSignal(() => (this.fen(), false));
  private readonly last = linkedSignal<[Square, Square] | undefined>(() => this.lastMove());
  private readonly redraws = signal(0);

  /** The solver plays the side to move in the starting position. */
  protected readonly side = computed(() => this.rules.turn(this.fen()));

  private readonly expected = computed(() => {
    const step = this.solution()[this.step()];
    return step === undefined ? [] : typeof step === 'string' ? [step] : [...step];
  });

  protected readonly hintSquare = computed<Square | null>(() => {
    const show = this.hinted() || (this.mistakes() >= 2 && this.state() !== 'solved');
    return show && this.step() % 2 === 0 ? uciToMove(this.expected()[0] ?? '').from : null;
  });

  protected readonly view = computed<BoardView>(() => {
    this.redraws();
    const fen = this.position();
    const hint = this.hintSquare();
    const playerTurn =
      this.step() % 2 === 0 && (this.state() === 'playing' || this.state() === 'wrong');
    return {
      fen,
      orientation: this.side(),
      turn: this.rules.turn(fen),
      lastMove: this.last(),
      check: this.rules.status(fen).check,
      shapes: hint ? [{ from: hint, to: hint, color: 'green' }] : [],
      movable: playerTurn ? this.rules.legalDests(fen) : null,
      editableShapes: false,
      coordinates: true,
    };
  });

  constructor() {
    // A new puzzle cancels any pending automatic replies.
    effect(() => {
      this.fen();
      untracked(() => this.clearTimers());
    });
    inject(DestroyRef).onDestroy(() => this.clearTimers());
  }

  protected onMove(move: MoveInput): void {
    const fen = this.position();
    const expected = this.expected();
    const promotion = this.rules.isPromotion(fen, move)
      ? (uciToMove(expected[0] ?? '').promotion ?? 'queen')
      : undefined;
    const played = this.rules.play(fen, { ...move, promotion });
    if (!played) return this.snapBack();

    const isLast = this.step() === this.solution().length - 1;
    const mate = isLast && this.anyMate() && this.rules.status(played.fen).checkmate;
    if (!expected.includes(played.uci) && !mate) {
      this.mistakes.update((n) => n + 1);
      this.state.set('wrong');
      this.snapBack();
      return;
    }
    this.advance(played);
  }

  protected showHint(): void {
    this.hinted.set(true);
  }

  /** Plays the rest of the solution for the learner. */
  protected reveal(): void {
    this.clearTimers(); // a pending automatic reply is replayed below instead
    this.revealed.set(true);
    this.state.set('right');
    const next = () => {
      const uci = this.expected()[0];
      const played = uci && this.rules.play(this.position(), uciToMove(uci));
      if (!played) return;
      this.apply(played);
      if (this.step() >= this.solution().length) this.finish();
      else this.later(next, 600);
    };
    next();
  }

  protected restart(): void {
    this.clearTimers();
    this.position.set(this.fen());
    this.step.set(0);
    this.state.set('playing');
    this.mistakes.set(0);
    this.revealed.set(false);
    this.hinted.set(false);
    this.last.set(this.lastMove());
  }

  private advance(played: PlayedMove): void {
    this.apply(played);
    if (this.step() >= this.solution().length) return this.finish();
    this.state.set('right');
    this.later(() => {
      const reply = this.rules.play(this.position(), uciToMove(this.expected()[0] ?? ''));
      if (!reply) return;
      this.apply(reply);
      if (this.step() >= this.solution().length) this.finish();
      else this.state.set('playing');
    }, REPLY_DELAY_MS);
  }

  private apply(played: PlayedMove): void {
    this.position.set(played.fen);
    this.last.set([played.from, played.to]);
    this.step.update((n) => n + 1);
    this.hinted.set(false);
  }

  private finish(): void {
    this.state.set('solved');
    this.solved.emit({ mistakes: this.mistakes(), revealed: this.revealed() });
  }

  private snapBack(): void {
    this.redraws.update((n) => n + 1);
  }

  private later(fn: () => void, ms: number): void {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn();
    }, ms);
    this.timers.add(timer);
  }

  private clearTimers(): void {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }
}

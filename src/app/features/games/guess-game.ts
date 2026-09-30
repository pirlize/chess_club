import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SanPipe, SanTextPipe } from '../../core/notation';
import { Board } from '../../chess/board/board';
import type { BoardView } from '../../chess/board-renderer';
import { ChessRules, uciToMove } from '../../chess/chess-rules';
import { mainline, moveLabel } from '../../chess/game-tree';
import {
  isMove,
  type Color,
  type GameTree,
  type MoveInput,
  type MoveNode,
  type TreeNode,
} from '../../chess/model';
import { nagInfo } from '../../chess/nags';
import { Language } from '../../core/i18n';
import { Progress } from '../../core/progress';
import { Toaster } from '../../core/toaster';
import { Icon } from '../../ui/icon';

type Phase = 'choose' | 'playing' | 'done';
type Feedback = { kind: 'right' | 'wrong' | 'revealed'; node?: MoveNode } | null;

const REPLY_MS = 700;
const MAX_TRIES = 3;
/** Stars for a perfect round; fewer for partial scores. */
const STARS_PER_GAME = 5;

/**
 * "Guess the move": replay a club game from one side's point of view and try
 * to find each move the player chose. The coach's note appears after every move.
 */
@Component({
  selector: 'app-guess-game',
  imports: [TranslocoPipe, SanPipe, SanTextPipe, Board, Icon],
  templateUrl: './guess-game.html',
  styleUrl: './guess-game.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GuessGame {
  readonly tree = input.required<GameTree>();
  readonly gameId = input.required<number>();
  readonly exit = output<void>();

  private readonly rules = inject(ChessRules);
  private readonly progress = inject(Progress);
  private readonly language = inject(Language);
  private readonly toaster = inject(Toaster);

  protected readonly phase = signal<Phase>('choose');
  protected readonly side = signal<Color>('white');
  protected readonly node = signal<TreeNode | null>(null);
  protected readonly tries = signal(0);
  protected readonly points = signal(0);
  protected readonly feedback = signal<Feedback>(null);
  protected readonly waiting = signal(false);
  /** The opponent's last automatic reply, shown with its note. */
  protected readonly reply = signal<MoveNode | null>(null);
  private readonly redraws = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  /** How many moves the learner has to find. */
  protected readonly total = computed(
    () => mainline(this.tree().root).filter((n) => this.moverOf(n) === this.side()).length,
  );
  protected readonly done = computed(() => {
    const node = this.node();
    if (!node) return 0;
    return [...pathTo(node)].filter((n) => this.moverOf(n) === this.side()).length;
  });
  protected readonly maxPoints = computed(() => this.total() * 2);

  protected readonly best = computed(() => this.progress.bestGuess(String(this.gameId())));

  protected readonly view = computed<BoardView | null>(() => {
    this.redraws();
    const node = this.node();
    if (!node) return null;
    const expected = node.children[0];
    const myTurn =
      this.phase() === 'playing' &&
      !this.waiting() &&
      !!expected &&
      this.rules.turn(node.fen) === this.side();
    const hint = myTurn && this.tries() >= 2 ? expected.from : null;
    return {
      fen: node.fen,
      orientation: this.side(),
      turn: this.rules.turn(node.fen),
      lastMove: isMove(node) ? [node.from, node.to] : undefined,
      check: isMove(node) && node.check,
      shapes: hint ? [{ from: hint, to: hint, color: 'green' }] : [],
      movable: myTurn ? this.rules.legalDests(node.fen) : null,
      editableShapes: false,
      coordinates: true,
    };
  });

  protected readonly moveLabel = moveLabel;
  protected readonly nagInfo = nagInfo;

  constructor() {
    inject(DestroyRef).onDestroy(() => clearTimeout(this.timer));
  }

  protected start(side: Color): void {
    this.side.set(side);
    this.points.set(0);
    this.tries.set(0);
    this.feedback.set(null);
    this.reply.set(null);
    this.phase.set('playing');
    this.node.set(this.tree().root);
    this.autoplayOpponent();
  }

  protected onMove(move: MoveInput): void {
    const node = this.node();
    const expected = node?.children[0];
    if (!node || !expected) return;
    const promotion = this.rules.isPromotion(node.fen, move)
      ? (uciToMove(expected.uci).promotion ?? 'queen')
      : undefined;
    const played = this.rules.play(node.fen, { ...move, promotion });
    if (played?.uci === expected.uci) {
      this.points.update((p) => p + (this.tries() === 0 ? 2 : 1));
      this.accept(expected, 'right');
      return;
    }
    this.tries.update((t) => t + 1);
    this.redraws.update((n) => n + 1);
    if (this.tries() >= MAX_TRIES) this.accept(expected, 'revealed');
    else this.feedback.set({ kind: 'wrong' });
  }

  protected reveal(): void {
    const expected = this.node()?.children[0];
    if (expected) this.accept(expected, 'revealed');
  }

  private accept(move: MoveNode, kind: 'right' | 'revealed'): void {
    this.node.set(move);
    this.tries.set(0);
    this.reply.set(null);
    this.feedback.set({ kind, node: move });
    if (move.children.length === 0) return this.finish();
    this.autoplayOpponent();
  }

  /** Plays the other side's moves until it is the learner's turn again. */
  private autoplayOpponent(): void {
    const node = this.node();
    const next = node?.children[0];
    if (!node || !next) return this.finish();
    if (this.rules.turn(node.fen) === this.side()) return;
    this.waiting.set(true);
    this.timer = setTimeout(() => {
      this.waiting.set(false);
      this.node.set(next);
      this.reply.set(next);
      if (next.children.length === 0) this.finish();
      else this.autoplayOpponent();
    }, REPLY_MS);
  }

  private finish(): void {
    this.phase.set('done');
    const max = this.maxPoints();
    if (max === 0) return;
    const stars = Math.round((this.points() / max) * STARS_PER_GAME);
    const earned = this.progress.recordGuesses(String(this.gameId()), this.points(), max, stars);
    if (earned > 0)
      this.toaster.show(this.language.t('learn.starsEarned', { n: earned }), 'success');
  }

  private moverOf(node: MoveNode): Color {
    return node.ply % 2 === 1 ? 'white' : 'black';
  }
}

function* pathTo(node: TreeNode): Generator<MoveNode> {
  const nodes: MoveNode[] = [];
  for (let n: TreeNode = node; isMove(n); n = n.parent) nodes.unshift(n);
  yield* nodes;
}

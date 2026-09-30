import { computed, inject, Injectable, signal } from '@angular/core';
import type { BoardView } from './board-renderer';
import { ChessRules } from './chess-rules';
import { appendMove, deleteMove, endOfLine, nodeAtPly, promoteLine } from './game-tree';
import {
  isMove,
  type BoardShape,
  type Color,
  type GameTree,
  type MoveInput,
  type TreeNode,
} from './model';
import { toggleNag } from './nags';

/**
 * State for one game on screen: the tree, the selected move and board
 * orientation. Provide it per component (`providers: [GameSession]`).
 *
 * Tree nodes are mutated in place, so every mutation bumps `version`;
 * anything derived from the tree's contents must read it.
 */
@Injectable()
export class GameSession {
  private readonly rules = inject(ChessRules);
  private readonly revision = signal(0);
  /** Forces a board redraw without counting as an edit (e.g. to undo a rejected drag). */
  private readonly redraws = signal(0);

  readonly version = this.revision.asReadonly();
  readonly tree = signal<GameTree | null>(null);
  readonly current = signal<TreeNode | null>(null);
  readonly orientation = signal<Color>('white');
  /** Editing mode: pieces can be moved (adding variations) and arrows drawn. */
  readonly editable = signal(false);

  readonly hasPrev = computed(() => {
    const node = this.current();
    return !!node && isMove(node);
  });

  readonly hasNext = computed(() => {
    this.revision();
    return (this.current()?.children.length ?? 0) > 0;
  });

  readonly boardView = computed<BoardView | null>(() => {
    this.revision();
    this.redraws();
    const node = this.current();
    if (!node) return null;
    const editable = this.editable();
    return {
      fen: node.fen,
      orientation: this.orientation(),
      turn: this.rules.turn(node.fen),
      lastMove: isMove(node) ? [node.from, node.to] : undefined,
      check: isMove(node) && node.check,
      shapes: node.shapes,
      movable: editable ? this.rules.legalDests(node.fen) : null,
      editableShapes: editable,
      coordinates: true,
    };
  });

  load(tree: GameTree, startPly?: number): void {
    this.tree.set(tree);
    this.current.set(startPly ? nodeAtPly(tree.root, startPly) : tree.root);
    this.touch();
  }

  goTo(node: TreeNode): void {
    this.current.set(node);
  }

  next(): void {
    const next = this.current()?.children[0];
    if (next) this.current.set(next);
  }

  prev(): void {
    const node = this.current();
    if (node && isMove(node)) this.current.set(node.parent);
  }

  first(): void {
    const tree = this.tree();
    if (tree) this.current.set(tree.root);
  }

  last(): void {
    const node = this.current();
    if (node) this.current.set(endOfLine(node));
  }

  flip(): void {
    this.orientation.update((c) => (c === 'white' ? 'black' : 'white'));
  }

  // ---- Editing -------------------------------------------------------------

  /**
   * Plays a move from the current position. Follows an existing branch when
   * there is one; otherwise adds a new move. Returns whether the tree changed.
   */
  play(move: MoveInput): boolean {
    const node = this.current();
    const played = node && this.rules.play(node.fen, move);
    if (!node || !played) {
      this.snapBack();
      return false;
    }
    const existing = node.children.find((c) => c.uci === played.uci);
    if (existing) {
      this.current.set(existing);
      return false;
    }
    this.current.set(appendMove(node, played));
    this.touch();
    return true;
  }

  /** Redraws the board from state, e.g. after a cancelled promotion. */
  snapBack(): void {
    this.redraws.update((v) => v + 1);
  }

  setComment(text: string): void {
    this.mutate((node) => (node.comment = text));
  }

  setShapes(shapes: BoardShape[]): void {
    this.mutate((node) => (node.shapes = shapes));
  }

  toggleNag(code: number): void {
    this.mutate((node) => {
      if (isMove(node)) node.nags = toggleNag(node.nags, code);
    });
  }

  deleteCurrent(): void {
    const node = this.current();
    if (!node || !isMove(node)) return;
    this.current.set(deleteMove(node));
    this.touch();
  }

  promoteCurrent(): void {
    const node = this.current();
    if (!node || !isMove(node)) return;
    promoteLine(node);
    this.touch();
  }

  /** Changes any node (not just the selected one), e.g. to write engine annotations. */
  updateNode<T extends TreeNode>(node: T, change: (node: T) => void): void {
    change(node);
    this.touch();
  }

  private mutate(change: (node: TreeNode) => void): void {
    const node = this.current();
    if (!node) return;
    change(node);
    this.touch();
  }

  private touch(): void {
    this.revision.update((v) => v + 1);
  }
}

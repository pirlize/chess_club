import type { BoardShape, Color, MoveInput, Square } from './model';

/** Everything a board needs to draw one frame. */
export interface BoardView {
  fen: string;
  orientation: Color;
  turn: Color;
  lastMove?: [Square, Square];
  check: boolean;
  shapes: readonly BoardShape[];
  /** Extra read-only overlay (e.g. the engine's best move), never editable. */
  overlay?: readonly BoardShape[];
  /** Legal destinations when the user may move pieces; null for a read-only board. */
  movable: Map<Square, Square[]> | null;
  /** When true the user can draw and erase `shapes` (reported via `onShapesChange`). */
  editableShapes: boolean;
  coordinates: boolean;
}

export interface BoardCallbacks {
  onMove(move: MoveInput): void;
  onShapesChange(shapes: BoardShape[]): void;
}

export interface BoardHandle {
  update(view: BoardView): void;
  destroy(): void;
}

/**
 * Port for the board UI. The app depends only on this class;
 * the implementation is chosen in provide-chess.ts.
 */
export abstract class BoardRenderer {
  abstract mount(host: HTMLElement, view: BoardView, callbacks: BoardCallbacks): BoardHandle;
}

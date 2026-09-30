/**
 * Library-agnostic chess model used across the app.
 *
 * Nothing in this folder's root may import a chess library: chessops and
 * chessground live behind `ChessRules` and `BoardRenderer` (see provide-chess.ts),
 * so either can be replaced without touching features.
 */

export type Color = 'white' | 'black';
type File = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h';
type Rank = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8';
export type Square = `${File}${Rank}`;
export type PromotionPiece = 'queen' | 'rook' | 'bishop' | 'knight';
export type ShapeColor = 'green' | 'red' | 'yellow' | 'blue';

/** An arrow when `from !== to`, a highlighted square when they are equal. */
export interface BoardShape {
  from: Square;
  to: Square;
  color: ShapeColor;
}

export interface MoveInput {
  from: Square;
  to: Square;
  promotion?: PromotionPiece;
}

/** A legal move after it has been played. */
export interface PlayedMove {
  san: string;
  /** Standard UCI (castling is e1g1), unique among a node's children. */
  uci: string;
  /** Squares to highlight as the last move. */
  from: Square;
  to: Square;
  /** Position after the move. */
  fen: string;
  check: boolean;
}

export interface MoveNode extends PlayedMove {
  readonly id: number;
  /** Half-move number: 1 is White's first move. */
  readonly ply: number;
  parent: TreeNode;
  /** `children[0]` continues the line; the rest are alternatives (variations). */
  children: MoveNode[];
  comment: string;
  nags: number[];
  shapes: BoardShape[];
}

/** The starting position. Its comment is the note shown before the first move. */
export interface RootNode {
  readonly id: 0;
  readonly ply: number;
  fen: string;
  children: MoveNode[];
  comment: string;
  shapes: BoardShape[];
}

export type TreeNode = RootNode | MoveNode;

export interface GameTree {
  /** PGN tag pairs, in order. */
  headers: Map<string, string>;
  root: RootNode;
}

export const isMove = (node: TreeNode): node is MoveNode => node.id !== 0;

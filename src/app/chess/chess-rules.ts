import type { Color, GameTree, MoveInput, PlayedMove, PromotionPiece, Square } from './model';

const PROMOTIONS: Record<string, PromotionPiece> = {
  q: 'queen',
  r: 'rook',
  b: 'bishop',
  n: 'knight',
};

/** "e7e8q" → { from: 'e7', to: 'e8', promotion: 'queen' }. Library-agnostic. */
export function uciToMove(uci: string): MoveInput {
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: PROMOTIONS[uci[4] ?? ''],
  };
}

/** Problems that did not stop an import. Codes, not text: the UI translates them. */
export type ParseWarning = { code: 'illegal-move'; move: string } | { code: 'bad-fen' };

export interface ParsedGame {
  tree: GameTree;
  warnings: ParseWarning[];
}

export class PgnError extends Error {
  constructor(readonly code: 'no-moves') {
    super(code);
  }
}

/**
 * Port for chess rules and PGN. The app depends only on this class;
 * the implementation is chosen in provide-chess.ts.
 */
export abstract class ChessRules {
  /** Parses every game in a PGN text. Throws `PgnError` when nothing usable is found. */
  abstract parsePgn(pgn: string): ParsedGame[];

  /** Writes a tree back to PGN, keeping notes, symbols and arrows. */
  abstract writePgn(tree: GameTree): string;

  /** The position in canonical FEN, or null when the text is not a legal position. */
  abstract normalizeFen(fen: string): string | null;

  /** Legal destination squares for the side to move, keyed by origin square. */
  abstract legalDests(fen: string): Map<Square, Square[]>;

  /** Plays a move, or returns null when it is illegal. */
  abstract play(fen: string, move: MoveInput): PlayedMove | null;

  abstract turn(fen: string): Color;

  /** Whether the move is a pawn reaching the last rank (the UI must ask which piece). */
  abstract isPromotion(fen: string, move: MoveInput): boolean;

  abstract status(fen: string): PositionStatus;
}

export interface PositionStatus {
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

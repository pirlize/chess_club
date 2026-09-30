/**
 * Port for a chess engine. The app depends only on this class; the
 * implementation (Stockfish in a web worker) is chosen in provide-chess.ts.
 */

/** An evaluation from White's point of view. */
export interface EngineLine {
  depth: number;
  /** Centipawns (100 = one pawn), positive when White is better. */
  cp?: number;
  /** Moves to mate: positive when White mates, negative when Black does. */
  mate?: number;
  /** Principal variation in UCI, starting with the best move. */
  pv: string[];
}

export interface AnalyseOptions {
  depth: number;
  /** Called as the search deepens, for live displays. */
  onUpdate?: (line: EngineLine) => void;
  /** Stops the search early; the best line found so far is returned. */
  signal?: AbortSignal;
}

export abstract class ChessEngine {
  /** Analyses one position. Calls are queued, so only one search runs at a time. */
  abstract analyse(fen: string, options: AnalyseOptions): Promise<EngineLine>;
}

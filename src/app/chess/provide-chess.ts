import { makeEnvironmentProviders, type EnvironmentProviders } from '@angular/core';
import { ChessgroundRenderer } from './adapters/chessground-renderer';
import { ChessopsRules } from './adapters/chessops-rules';
import { StockfishEngine } from './adapters/stockfish-engine';
import { BoardRenderer } from './board-renderer';
import { ChessRules } from './chess-rules';
import { ChessEngine } from './engine/chess-engine';

/**
 * The one place that picks the chess libraries behind the app.
 *
 * All three current adapters are GPL-3.0. To switch (e.g. to cm-chessboard +
 * chess.js for a non-GPL build), add new classes extending `BoardRenderer` /
 * `ChessRules` / `ChessEngine` in ./adapters, point these providers at them,
 * and swap the chessground stylesheets and engine assets in angular.json.
 * Nothing else in the app imports a chess library.
 */
export function provideChess(): EnvironmentProviders {
  return makeEnvironmentProviders([
    { provide: ChessRules, useClass: ChessopsRules },
    { provide: BoardRenderer, useClass: ChessgroundRenderer },
    { provide: ChessEngine, useClass: StockfishEngine },
  ]);
}

import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChessRules } from '../chess/chess-rules';
import { endOfLine } from '../chess/game-tree';
import { isMove, type Square } from '../chess/model';

/**
 * Puzzles from Lichess's public API (the puzzles are CC0). Requests go
 * straight from the browser to lichess.org; no account is needed.
 */

export interface Puzzle {
  id: string;
  rating: number;
  themes: string[];
  /** Position the solver starts from (after the opponent's last move). */
  fen: string;
  lastMove?: [Square, Square];
  /** UCI moves: the solver's moves at even indexes, replies at odd ones. */
  solution: string[];
  url: string;
}

/** Themes offered for practice, with their Lichess ids. */
/** Tactics to practise, easiest ideas first. Each is a Lichess puzzle theme. */
export const PRACTICE_THEMES = [
  'mateIn1',
  'mateIn2',
  'backRankMate',
  'fork',
  'pin',
  'skewer',
  'hangingPiece',
  'discoveredAttack',
  'promotion',
] as const;

export type PracticeTheme = (typeof PRACTICE_THEMES)[number];

export const isPracticeTheme = (value: unknown): value is PracticeTheme =>
  PRACTICE_THEMES.includes(value as PracticeTheme);

/** Piece symbol shown next to each theme. */
export const THEME_GLYPHS: Record<PracticeTheme, string> = {
  mateIn1: '♚',
  mateIn2: '♛',
  backRankMate: '♜',
  fork: '♞',
  pin: '♝',
  skewer: '♗',
  hangingPiece: '♟',
  discoveredAttack: '♖',
  promotion: '♕',
};

export const DIFFICULTIES = ['easiest', 'easier', 'normal'] as const;

/** Lichess themes we have names for (`theme.*` keys); others are not shown. */
export const NAMED_THEMES: ReadonlySet<string> = new Set([
  'mate',
  'mateIn1',
  'mateIn2',
  'mateIn3',
  'mateIn4',
  'mateIn5',
  'fork',
  'pin',
  'skewer',
  'hangingPiece',
  'backRankMate',
  'smotheredMate',
  'short',
  'long',
  'veryLong',
  'oneMove',
  'opening',
  'middlegame',
  'endgame',
  'advantage',
  'crushing',
  'equality',
  'sacrifice',
  'discoveredAttack',
  'doubleCheck',
  'deflection',
  'attraction',
  'trappedPiece',
  'kingsideAttack',
  'queensideAttack',
  'defensiveMove',
  'quietMove',
  'promotion',
  'advancedPawn',
  'exposedKing',
  'intermezzo',
  'xRayAttack',
  'zugzwang',
  'capturingDefender',
  'clearance',
  'interference',
  'rookEndgame',
  'pawnEndgame',
  'queenEndgame',
  'bishopEndgame',
  'knightEndgame',
  'enPassant',
  'castling',
]);

interface LichessPuzzleResponse {
  game: { pgn: string };
  puzzle: { id: string; rating: number; themes: string[]; solution: string[] };
}

@Injectable({ providedIn: 'root' })
export class LichessPuzzles {
  private readonly http = inject(HttpClient);
  private readonly rules = inject(ChessRules);

  daily(): Promise<Puzzle> {
    return this.fetch('https://lichess.org/api/puzzle/daily');
  }

  next(theme: string, difficulty: string): Promise<Puzzle> {
    const params = new URLSearchParams({ angle: theme, difficulty });
    return this.fetch(`https://lichess.org/api/puzzle/next?${params}`);
  }

  private async fetch(url: string): Promise<Puzzle> {
    const { game, puzzle } = await firstValueFrom(this.http.get<LichessPuzzleResponse>(url));
    // The puzzle starts after the last move of the game excerpt.
    const [{ tree }] = this.rules.parsePgn(game.pgn);
    const last = endOfLine(tree.root);
    return {
      id: puzzle.id,
      rating: puzzle.rating,
      themes: puzzle.themes,
      fen: last.fen,
      lastMove: isMove(last) ? [last.from, last.to] : undefined,
      solution: puzzle.solution,
      url: `https://lichess.org/training/${puzzle.id}`,
    };
  }
}

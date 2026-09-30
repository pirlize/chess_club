import { computed, effect, Injectable, signal } from '@angular/core';
import { readStorage, writeStorage } from './storage';

/**
 * A learner's progress: stars, rank, daily-puzzle streak, finished lessons.
 * Stored only on this device (no accounts, no names), which keeps it simple
 * and safe for the club's juniors.
 */

export const RANKS = [
  { id: 'pawn', stars: 0, symbol: '♟' },
  { id: 'knight', stars: 15, symbol: '♞' },
  { id: 'bishop', stars: 40, symbol: '♝' },
  { id: 'rook', stars: 80, symbol: '♜' },
  { id: 'queen', stars: 150, symbol: '♛' },
  { id: 'king', stars: 300, symbol: '♚' },
] as const;

export type RankId = (typeof RANKS)[number]['id'];

interface ProgressState {
  stars: number;
  streak: number;
  /** YYYY-MM-DD (local) of the last solved daily puzzle. */
  lastDaily: string | null;
  /** Puzzle ids already rewarded, so re-solving earns nothing. */
  solved: string[];
  lessons: string[];
  /** Best "guess the move" score per game: correct / total. */
  guesses: Record<string, { correct: number; total: number }>;
}

const KEY = 'cc:progress';
const EMPTY: ProgressState = {
  stars: 0,
  streak: 0,
  lastDaily: null,
  solved: [],
  lessons: [],
  guesses: {},
};

/** Local calendar day, e.g. "2026-09-30". */
export const today = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const yesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return today(date);
};

@Injectable({ providedIn: 'root' })
export class Progress {
  private readonly state = signal<ProgressState>(load());

  readonly stars = computed(() => this.state().stars);
  readonly lessons = computed(() => new Set(this.state().lessons));

  /** The streak only counts if the last daily puzzle was today or yesterday. */
  readonly streak = computed(() => {
    const { streak, lastDaily } = this.state();
    return lastDaily === today() || lastDaily === yesterday() ? streak : 0;
  });

  readonly dailySolvedToday = computed(() => this.state().lastDaily === today());

  readonly rank = computed(() => [...RANKS].reverse().find((r) => this.stars() >= r.stars)!);

  /** The next promotion and how far along it the learner is (0–1). */
  readonly nextRank = computed(() => {
    const index = RANKS.findIndex((r) => r.id === this.rank().id);
    const next = RANKS[index + 1];
    if (!next) return null;
    const from = RANKS[index].stars;
    return { ...next, progress: (this.stars() - from) / (next.stars - from) };
  });

  constructor() {
    effect(() => writeStorage(KEY, JSON.stringify(this.state())));
  }

  /** Rewards a puzzle once; returns the stars actually awarded. */
  solvePuzzle(id: string, stars: number, daily = false): number {
    const state = this.state();
    if (state.solved.includes(id)) return 0;
    const next: ProgressState = {
      ...state,
      stars: state.stars + stars,
      solved: [...state.solved, id].slice(-500),
    };
    if (daily && state.lastDaily !== today()) {
      next.streak = state.lastDaily === yesterday() ? state.streak + 1 : 1;
      next.lastDaily = today();
    }
    this.state.set(next);
    return stars;
  }

  completeLesson(slug: string, stars: number): number {
    const state = this.state();
    if (state.lessons.includes(slug)) return 0;
    this.state.set({ ...state, stars: state.stars + stars, lessons: [...state.lessons, slug] });
    return stars;
  }

  /** Records a finished "guess the move" round; stars only for improving your best. */
  recordGuesses(gameId: string, correct: number, total: number, stars: number): number {
    const state = this.state();
    const previous = state.guesses[gameId];
    if (previous && previous.correct >= correct) return 0;
    const earned = Math.max(
      0,
      stars - (previous ? Math.round((previous.correct / previous.total) * stars) : 0),
    );
    this.state.set({
      ...state,
      stars: state.stars + earned,
      guesses: { ...state.guesses, [gameId]: { correct, total } },
    });
    return earned;
  }

  bestGuess(gameId: string) {
    return this.state().guesses[gameId] ?? null;
  }
}

function load(): ProgressState {
  try {
    return { ...EMPTY, ...(JSON.parse(readStorage(KEY) ?? '{}') as Partial<ProgressState>) };
  } catch {
    return { ...EMPTY };
  }
}

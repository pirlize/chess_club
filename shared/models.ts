/**
 * API contract shared by the Cloudflare Worker and the Angular app.
 * Keep this file dependency-free: it is compiled into both.
 */

export const GAME_CATEGORIES = ['club', 'lesson', 'tournament', 'classic'] as const;
export type GameCategory = (typeof GAME_CATEGORIES)[number];

export const GAME_RESULTS = ['1-0', '0-1', '1/2-1/2', '*'] as const;
export type GameResult = (typeof GAME_RESULTS)[number];

export const EVENT_KINDS = ['club-night', 'tournament', 'lesson', 'lecture', 'social'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export const BOOK_LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
export type BookLevel = (typeof BOOK_LEVELS)[number];

export const BOOK_STATUSES = ['available', 'on-loan', 'wishlist'] as const;
export type BookStatus = (typeof BOOK_STATUSES)[number];

// ---- Games -----------------------------------------------------------------

export interface GameInput {
  title: string;
  white: string;
  black: string;
  result: GameResult;
  event: string;
  /** YYYY-MM-DD, or null when unknown. */
  playedOn: string | null;
  eco: string;
  opening: string;
  category: GameCategory;
  /** Markdown introduction shown above the board. */
  summary: string;
  pgn: string;
  /** Final position of the main line, used for list thumbnails. */
  finalFen: string;
  published: boolean;
}

export interface GameSummary extends Omit<GameInput, 'summary' | 'pgn'> {
  id: number;
  updatedAt: string;
}

export interface GameDetail extends GameInput {
  id: number;
  updatedAt: string;
}

// ---- Posts -----------------------------------------------------------------

export interface PostInput {
  slug: string;
  title: string;
  excerpt: string;
  /** Markdown. */
  body: string;
  published: boolean;
}

export interface PostSummary extends Omit<PostInput, 'body'> {
  id: number;
  author: string;
  publishedAt: string | null;
  updatedAt: string;
  readingMinutes: number;
}

export interface PostDetail extends PostSummary {
  body: string;
}

// ---- Events ----------------------------------------------------------------

export interface EventInput {
  title: string;
  kind: EventKind;
  /** ISO-8601 UTC datetime. */
  startsAt: string;
  endsAt: string | null;
  location: string;
  /** Registration, pairings or results elsewhere (e.g. chess-results.com); '' when none. */
  link: string;
  /** Markdown. */
  description: string;
  /** Markdown, typically a standings table. */
  results: string;
}

export interface ClubEvent extends EventInput {
  id: number;
  updatedAt: string;
}

// ---- Books -----------------------------------------------------------------

export interface BookInput {
  title: string;
  author: string;
  level: BookLevel;
  isbn: string;
  review: string;
  status: BookStatus;
  /** Who has the club copy. Only ever returned to admins. */
  borrower: string;
}

export interface Book extends Omit<BookInput, 'borrower'> {
  id: number;
  updatedAt: string;
  borrower?: string;
}

// ---- Auth & errors -----------------------------------------------------------

export interface AdminUser {
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SessionResponse {
  admin: AdminUser | null;
}

export interface ApiErrorBody {
  error: string;
  issues?: { path: string; message: string }[];
}

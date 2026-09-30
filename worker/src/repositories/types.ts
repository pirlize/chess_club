import type {
  AdminUser,
  Book,
  BookInput,
  ClubEvent,
  EventInput,
  GameDetail,
  GameInput,
  GameSummary,
  PostDetail,
  PostInput,
  PostSummary,
} from '../../../shared/models';

/**
 * Storage ports. Routes depend only on these interfaces; `d1.ts` is the
 * Cloudflare D1 adapter. Swap it (or add an in-memory one for tests) without
 * touching the HTTP layer.
 */

export interface ReadOptions {
  /** Admins also see unpublished drafts. */
  includeDrafts: boolean;
}

export interface WriteContext {
  admin: AdminUser;
}

export interface CrudRepository<TSummary, TDetail, TInput> {
  list(opts: ReadOptions): Promise<TSummary[]>;
  get(id: number, opts: ReadOptions): Promise<TDetail | null>;
  create(input: TInput, ctx: WriteContext): Promise<TDetail>;
  update(id: number, input: TInput, ctx: WriteContext): Promise<TDetail | null>;
  delete(id: number): Promise<boolean>;
}

export type GameRepository = CrudRepository<GameSummary, GameDetail, GameInput>;

export interface PostRepository extends CrudRepository<PostSummary, PostDetail, PostInput> {
  getBySlug(slug: string, opts: ReadOptions): Promise<PostDetail | null>;
}

export type EventRepository = CrudRepository<ClubEvent, ClubEvent, EventInput>;

export type BookRepository = CrudRepository<Book, Book, BookInput>;

export interface StoredAdmin extends AdminUser {
  id: number;
  passwordHash: string;
}

export interface AdminRepository {
  findByEmail(email: string): Promise<StoredAdmin | null>;
  createSession(adminId: number, tokenHash: string, expiresAt: Date): Promise<void>;
  findSessionAdmin(tokenHash: string, now: Date): Promise<AdminUser | null>;
  deleteSession(tokenHash: string): Promise<void>;
  deleteExpiredSessions(now: Date): Promise<void>;
}

export interface Repositories {
  games: GameRepository;
  posts: PostRepository;
  events: EventRepository;
  books: BookRepository;
  admins: AdminRepository;
}

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
import type {
  AdminRepository,
  BookRepository,
  EventRepository,
  GameRepository,
  PostRepository,
  ReadOptions,
  Repositories,
  StoredAdmin,
  WriteContext,
} from './types';

const NOW = `strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`;
const flag = (value: boolean) => (value ? 1 : 0);

export function createD1Repositories(db: D1Database): Repositories {
  return {
    games: new D1GameRepository(db),
    posts: new D1PostRepository(db),
    events: new D1EventRepository(db),
    books: new D1BookRepository(db),
    admins: new D1AdminRepository(db),
  };
}

// ---- Games -----------------------------------------------------------------

interface GameRow {
  id: number;
  title: string;
  white: string;
  black: string;
  result: GameSummary['result'];
  event: string;
  played_on: string | null;
  eco: string;
  opening: string;
  category: GameSummary['category'];
  final_fen: string;
  published: number;
  updated_at: string;
}

interface GameDetailRow extends GameRow {
  summary: string;
  pgn: string;
}

const GAME_SUMMARY_COLUMNS =
  'id, title, white, black, result, event, played_on, eco, opening, category, final_fen, published, updated_at';

const toGameSummary = (r: GameRow): GameSummary => ({
  id: r.id,
  title: r.title,
  white: r.white,
  black: r.black,
  result: r.result,
  event: r.event,
  playedOn: r.played_on,
  eco: r.eco,
  opening: r.opening,
  category: r.category,
  finalFen: r.final_fen,
  published: r.published === 1,
  updatedAt: r.updated_at,
});

const toGameDetail = (r: GameDetailRow): GameDetail => ({
  ...toGameSummary(r),
  summary: r.summary,
  pgn: r.pgn,
});

const gameValues = (g: GameInput) => [
  g.title,
  g.white,
  g.black,
  g.result,
  g.event,
  g.playedOn,
  g.eco,
  g.opening,
  g.category,
  g.summary,
  g.pgn,
  g.finalFen,
  flag(g.published),
];

class D1GameRepository implements GameRepository {
  constructor(private readonly db: D1Database) {}

  async list({ includeDrafts }: ReadOptions): Promise<GameSummary[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${GAME_SUMMARY_COLUMNS} FROM games
         WHERE published = 1 OR ?
         ORDER BY COALESCE(played_on, substr(created_at, 1, 10)) DESC, id DESC`,
      )
      .bind(flag(includeDrafts))
      .all<GameRow>();
    return results.map(toGameSummary);
  }

  async get(id: number, { includeDrafts }: ReadOptions): Promise<GameDetail | null> {
    const row = await this.db
      .prepare('SELECT * FROM games WHERE id = ? AND (published = 1 OR ?)')
      .bind(id, flag(includeDrafts))
      .first<GameDetailRow>();
    return row && toGameDetail(row);
  }

  async create(input: GameInput): Promise<GameDetail> {
    const row = await this.db
      .prepare(
        `INSERT INTO games (title, white, black, result, event, played_on, eco, opening, category, summary, pgn, final_fen, published)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
         RETURNING *`,
      )
      .bind(...gameValues(input))
      .first<GameDetailRow>();
    return toGameDetail(row!);
  }

  async update(id: number, input: GameInput): Promise<GameDetail | null> {
    const row = await this.db
      .prepare(
        `UPDATE games SET title = ?, white = ?, black = ?, result = ?, event = ?, played_on = ?, eco = ?,
           opening = ?, category = ?, summary = ?, pgn = ?, final_fen = ?, published = ?, updated_at = ${NOW}
         WHERE id = ?
         RETURNING *`,
      )
      .bind(...gameValues(input), id)
      .first<GameDetailRow>();
    return row && toGameDetail(row);
  }

  async delete(id: number): Promise<boolean> {
    const { meta } = await this.db.prepare('DELETE FROM games WHERE id = ?').bind(id).run();
    return meta.changes > 0;
  }
}

// ---- Posts -----------------------------------------------------------------

interface PostRow {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  author: string;
  published: number;
  published_at: string | null;
  updated_at: string;
  reading_minutes: number;
}

interface PostDetailRow extends PostRow {
  body: string;
}

// ~200 words a minute at ~5.5 characters a word.
const READING_MINUTES = 'MAX(1, CAST(ROUND(LENGTH(body) / 1100.0) AS INTEGER)) AS reading_minutes';
const POST_SUMMARY_COLUMNS = `id, slug, title, excerpt, author, published, published_at, updated_at, ${READING_MINUTES}`;

const toPostSummary = (r: PostRow): PostSummary => ({
  id: r.id,
  slug: r.slug,
  title: r.title,
  excerpt: r.excerpt,
  author: r.author,
  published: r.published === 1,
  publishedAt: r.published_at,
  updatedAt: r.updated_at,
  readingMinutes: r.reading_minutes,
});

const toPostDetail = (r: PostDetailRow): PostDetail => ({ ...toPostSummary(r), body: r.body });

class D1PostRepository implements PostRepository {
  constructor(private readonly db: D1Database) {}

  async list({ includeDrafts }: ReadOptions): Promise<PostSummary[]> {
    const { results } = await this.db
      .prepare(
        `SELECT ${POST_SUMMARY_COLUMNS} FROM posts
         WHERE published = 1 OR ?
         ORDER BY COALESCE(published_at, created_at) DESC`,
      )
      .bind(flag(includeDrafts))
      .all<PostRow>();
    return results.map(toPostSummary);
  }

  get(id: number, opts: ReadOptions): Promise<PostDetail | null> {
    return this.findOne('id = ?', id, opts);
  }

  getBySlug(slug: string, opts: ReadOptions): Promise<PostDetail | null> {
    return this.findOne('slug = ?', slug, opts);
  }

  async create(input: PostInput, { admin }: WriteContext): Promise<PostDetail> {
    const row = await this.db
      .prepare(
        `INSERT INTO posts (slug, title, excerpt, body, author, published, published_at)
         VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN ${NOW} END)
         RETURNING *, ${READING_MINUTES}`,
      )
      .bind(
        input.slug,
        input.title,
        input.excerpt,
        input.body,
        admin.name,
        flag(input.published),
        flag(input.published),
      )
      .first<PostDetailRow>();
    return toPostDetail(row!);
  }

  async update(id: number, input: PostInput): Promise<PostDetail | null> {
    const row = await this.db
      .prepare(
        `UPDATE posts SET slug = ?, title = ?, excerpt = ?, body = ?, published = ?,
           published_at = CASE WHEN ? = 1 THEN COALESCE(published_at, ${NOW}) ELSE published_at END,
           updated_at = ${NOW}
         WHERE id = ?
         RETURNING *, ${READING_MINUTES}`,
      )
      .bind(
        input.slug,
        input.title,
        input.excerpt,
        input.body,
        flag(input.published),
        flag(input.published),
        id,
      )
      .first<PostDetailRow>();
    return row && toPostDetail(row);
  }

  async delete(id: number): Promise<boolean> {
    const { meta } = await this.db.prepare('DELETE FROM posts WHERE id = ?').bind(id).run();
    return meta.changes > 0;
  }

  private async findOne(where: string, value: string | number, { includeDrafts }: ReadOptions) {
    const row = await this.db
      .prepare(`SELECT *, ${READING_MINUTES} FROM posts WHERE ${where} AND (published = 1 OR ?)`)
      .bind(value, flag(includeDrafts))
      .first<PostDetailRow>();
    return row && toPostDetail(row);
  }
}

// ---- Events ----------------------------------------------------------------

interface EventRow {
  id: number;
  title: string;
  kind: ClubEvent['kind'];
  starts_at: string;
  ends_at: string | null;
  location: string;
  link: string;
  description: string;
  results: string;
  updated_at: string;
}

const toEvent = (r: EventRow): ClubEvent => ({
  id: r.id,
  title: r.title,
  kind: r.kind,
  startsAt: r.starts_at,
  endsAt: r.ends_at,
  location: r.location,
  link: r.link,
  description: r.description,
  results: r.results,
  updatedAt: r.updated_at,
});

const eventValues = (e: EventInput) => [
  e.title,
  e.kind,
  e.startsAt,
  e.endsAt,
  e.location,
  e.link,
  e.description,
  e.results,
];

class D1EventRepository implements EventRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<ClubEvent[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM events ORDER BY starts_at')
      .all<EventRow>();
    return results.map(toEvent);
  }

  async get(id: number): Promise<ClubEvent | null> {
    const row = await this.db
      .prepare('SELECT * FROM events WHERE id = ?')
      .bind(id)
      .first<EventRow>();
    return row && toEvent(row);
  }

  async create(input: EventInput): Promise<ClubEvent> {
    const row = await this.db
      .prepare(
        `INSERT INTO events (title, kind, starts_at, ends_at, location, link, description, results)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(...eventValues(input))
      .first<EventRow>();
    return toEvent(row!);
  }

  async update(id: number, input: EventInput): Promise<ClubEvent | null> {
    const row = await this.db
      .prepare(
        `UPDATE events SET title = ?, kind = ?, starts_at = ?, ends_at = ?, location = ?, link = ?,
           description = ?, results = ?, updated_at = ${NOW}
         WHERE id = ? RETURNING *`,
      )
      .bind(...eventValues(input), id)
      .first<EventRow>();
    return row && toEvent(row);
  }

  async delete(id: number): Promise<boolean> {
    const { meta } = await this.db.prepare('DELETE FROM events WHERE id = ?').bind(id).run();
    return meta.changes > 0;
  }
}

// ---- Books -----------------------------------------------------------------

interface BookRow {
  id: number;
  title: string;
  author: string;
  level: Book['level'];
  isbn: string;
  review: string;
  status: Book['status'];
  borrower: string;
  updated_at: string;
}

const toBook = (r: BookRow): Book => ({
  id: r.id,
  title: r.title,
  author: r.author,
  level: r.level,
  isbn: r.isbn,
  review: r.review,
  status: r.status,
  borrower: r.borrower,
  updatedAt: r.updated_at,
});

const bookValues = (b: BookInput) => [
  b.title,
  b.author,
  b.level,
  b.isbn,
  b.review,
  b.status,
  b.borrower,
];

class D1BookRepository implements BookRepository {
  constructor(private readonly db: D1Database) {}

  async list(): Promise<Book[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM books ORDER BY title COLLATE NOCASE')
      .all<BookRow>();
    return results.map(toBook);
  }

  async get(id: number): Promise<Book | null> {
    const row = await this.db.prepare('SELECT * FROM books WHERE id = ?').bind(id).first<BookRow>();
    return row && toBook(row);
  }

  async create(input: BookInput): Promise<Book> {
    const row = await this.db
      .prepare(
        `INSERT INTO books (title, author, level, isbn, review, status, borrower)
         VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *`,
      )
      .bind(...bookValues(input))
      .first<BookRow>();
    return toBook(row!);
  }

  async update(id: number, input: BookInput): Promise<Book | null> {
    const row = await this.db
      .prepare(
        `UPDATE books SET title = ?, author = ?, level = ?, isbn = ?, review = ?, status = ?, borrower = ?,
           updated_at = ${NOW}
         WHERE id = ? RETURNING *`,
      )
      .bind(...bookValues(input), id)
      .first<BookRow>();
    return row && toBook(row);
  }

  async delete(id: number): Promise<boolean> {
    const { meta } = await this.db.prepare('DELETE FROM books WHERE id = ?').bind(id).run();
    return meta.changes > 0;
  }
}

// ---- Admins & sessions -----------------------------------------------------

class D1AdminRepository implements AdminRepository {
  constructor(private readonly db: D1Database) {}

  async findByEmail(email: string): Promise<StoredAdmin | null> {
    const row = await this.db
      .prepare('SELECT id, email, name, password_hash FROM admins WHERE email = ?')
      .bind(email)
      .first<{ id: number; email: string; name: string; password_hash: string }>();
    return row && { id: row.id, email: row.email, name: row.name, passwordHash: row.password_hash };
  }

  async createSession(adminId: number, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.db
      .prepare('INSERT INTO sessions (token_hash, admin_id, expires_at) VALUES (?, ?, ?)')
      .bind(tokenHash, adminId, expiresAt.toISOString())
      .run();
  }

  findSessionAdmin(tokenHash: string, now: Date): Promise<AdminUser | null> {
    return this.db
      .prepare(
        `SELECT a.email, a.name FROM sessions s JOIN admins a ON a.id = s.admin_id
         WHERE s.token_hash = ? AND s.expires_at > ?`,
      )
      .bind(tokenHash, now.toISOString())
      .first<AdminUser>();
  }

  async deleteSession(tokenHash: string): Promise<void> {
    await this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  async deleteExpiredSessions(now: Date): Promise<void> {
    await this.db
      .prepare('DELETE FROM sessions WHERE expires_at <= ?')
      .bind(now.toISOString())
      .run();
  }
}

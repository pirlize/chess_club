-- Initial schema. Timestamps are ISO-8601 UTC strings so they sort lexically.

CREATE TABLE admins (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  admin_id   INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);
CREATE INDEX sessions_expires_at ON sessions(expires_at);

CREATE TABLE games (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL DEFAULT '',
  white      TEXT NOT NULL,
  black      TEXT NOT NULL,
  result     TEXT NOT NULL DEFAULT '*',
  event      TEXT NOT NULL DEFAULT '',
  played_on  TEXT,
  eco        TEXT NOT NULL DEFAULT '',
  opening    TEXT NOT NULL DEFAULT '',
  category   TEXT NOT NULL DEFAULT 'club',
  summary    TEXT NOT NULL DEFAULT '',
  pgn        TEXT NOT NULL,
  final_fen  TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX games_listing ON games(published, played_on DESC);

CREATE TABLE posts (
  id           INTEGER PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  title        TEXT NOT NULL,
  excerpt      TEXT NOT NULL DEFAULT '',
  body         TEXT NOT NULL DEFAULT '',
  author       TEXT NOT NULL,
  published    INTEGER NOT NULL DEFAULT 0,
  published_at TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX posts_listing ON posts(published, published_at DESC);

CREATE TABLE events (
  id          INTEGER PRIMARY KEY,
  title       TEXT NOT NULL,
  kind        TEXT NOT NULL DEFAULT 'club-night',
  starts_at   TEXT NOT NULL,
  ends_at     TEXT,
  location    TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  results     TEXT NOT NULL DEFAULT '',
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX events_starts_at ON events(starts_at);

CREATE TABLE books (
  id         INTEGER PRIMARY KEY,
  title      TEXT NOT NULL,
  author     TEXT NOT NULL DEFAULT '',
  level      TEXT NOT NULL DEFAULT 'beginner',
  isbn       TEXT NOT NULL DEFAULT '',
  review     TEXT NOT NULL DEFAULT '',
  status     TEXT NOT NULL DEFAULT 'available',
  borrower   TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

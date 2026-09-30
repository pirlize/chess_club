-- Optional external page for an event (registration, pairings or results on chess-results.com).
ALTER TABLE events ADD COLUMN link TEXT NOT NULL DEFAULT '';

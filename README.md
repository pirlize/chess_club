# Chess Square

An installable web app (PWA) for [Chess Square](https://chesssquare-club.com/), the chess clubhouse in Ampelokipi, Athens (Σ.Ο. Αμπελοκήπων · Σ.Ο. Θωμάς Γεωργίου): annotated games, lessons for complete beginners, daily puzzles, "guess the move", an analysis board with a built-in engine, the club programme and results, news and a reading list, plus an admin area where the coach can paste games from email and annotate them move by move.

Greek by default, with English one tap away. Live demo: https://chess-square.pirlize.workers.dev

- **Frontend:** Angular 22 (standalone components, signals, signal forms, `httpResource`), served as static assets.
- **Backend:** one Cloudflare Worker ([Hono](https://hono.dev)) with a D1 (SQLite) database.
- **Languages:** [Transloco](https://jsverse.gitbook.io/transloco); dictionaries in `src/app/i18n/` (Greek `el.json` is the default, `en.json` the second language).
- **Chess:** [chessground](https://github.com/lichess-org/chessground) (board), [chessops](https://github.com/niklasf/chessops) (rules/PGN) and [Stockfish](https://github.com/nmrugg/stockfish.js) 19 lite (WebAssembly, in a web worker), all behind interfaces so they can be swapped (see below). Puzzles come from the free [Lichess puzzle API](https://lichess.org/api#tag/Puzzles).

## Features

**Members**

- Games with the coach's notes: step through moves (buttons, ←/→ keys, or swipe the board), `!`/`?` symbols, arrows, side lines, autoplay, and share links that open at a specific move.
- **Guess the move** on any game: play as White or Black, 2 points for a first-try hit, 1 for the second, hints after two misses; the coach's notes appear as you go.
- **Learn** (`/learn`): 10 lessons for complete beginners (the board, each piece, special moves, check and mate, notation, opening principles, the first traps), each with exercises on the board; **puzzle of the day** with a daily streak and practice by theme and difficulty (`/learn/puzzles`). Stars earn ranks from Pawn to King. Progress stays on the device (no accounts, nothing about children is stored on the server).
- Programme as a list or a **month calendar** (`?view=calendar`), add-to-calendar (`.ics`), results tables and an optional link (e.g. chess-results.com); weekly timetable and directions on the home page; news; books by level with search, club-copy status and a details view.
- **Analysis board** (`/analysis`, or "Ανάλυση" on any game): paste a PGN or FEN, try moves, write notes. Switch on the engine for a live evaluation, best line and best-move arrow; **Review the game** checks every move, gives each side an accuracy score, marks inaccuracies/mistakes/blunders on an evaluation graph and lists the key moments, and can write `?!`/`?`/`??` with "better was …" into the notes. Export as PGN, as a ready-made coaching prompt for ChatGPT/Claude/Gemini, or to Lichess (names stripped).
- Installable, works offline for anything opened before, light/dark themes, Greek/English switch, shows a banner when a new version is ready.
- **Move notation switch** (the Nf3 / Ιf3 button in the top bar): English or Greek piece letters (Ρ, Β, Π, Α, Ι), independent of the language and remembered per device. Only the display changes; stored games and exported PGN always use standard SAN.

**Admin** (`/admin`)

- **Games:** paste a PGN (or drop a `.pgn` file) → pick the game if there are several → annotate: select a move, type a note, tap a symbol, right-click-drag arrows, play moves on the board to add side lines, "make main line", "delete from here". Drafts stay hidden until _Visible to members_ is switched on. Unsaved work is backed up in the browser and can be restored.
- Posts (Markdown with preview), events, books.
- Sign-in with email + password (PBKDF2 hashes, HttpOnly session cookie).

## Project layout

```
shared/models.ts           API types shared by the Worker and the app
worker/src/                Cloudflare Worker (Hono routes, auth, zod validation)
worker/src/repositories/   Storage interfaces + D1 implementation
migrations/                D1 schema
seed/sample.sql            Demo content (safe to run more than once)
scripts/                   create-admin.mjs, generate-icons.mjs
src/app/chess/             Board, move list, game session: library-agnostic
src/app/chess/adapters/    chessground + chessops implementations
src/app/chess/engine/      Engine port + review maths (win chances, accuracy, verdicts)
src/app/features/          Pages (home, games, learn, events, blog, books, analysis, admin)
src/app/core/              API clients, auth, i18n, PWA, theme, formatting
src/app/i18n/              Translations (el.json, en.json)
src/styles/                Design tokens (light/dark), components, board theme
```

## Run it locally

```bash
npm install
npm run db:migrate                     # create/upgrade the local D1 tables
npm run db:seed                        # optional demo content
npm run admin:create -- --email you@example.com --name "Your Name"
npm run dev                            # Angular on :4200, Worker API on :8791
```

Open http://localhost:4200. `npm run dev` gives live reload; the service worker is only active in production builds.

To test the real production build (PWA install, offline) run `npm run preview`, then open http://127.0.0.1:8791. After another `ng build`, restart `wrangler dev`: it does not notice the rebuilt `dist` folder and will serve `index.html` in place of the new scripts (a blank page).

## Deploy to workers.dev

```bash
npx wrangler login
npx wrangler d1 create chess-club      # paste the printed database_id into wrangler.jsonc
npm run db:migrate:remote              # also after pulling changes that add migrations
npm run db:seed:remote                 # optional
npm run deploy                         # builds Angular and deploys the Worker + assets
npm run admin:create -- --email coach@example.com --name "Coach" --remote
```

`admin:create` prints a generated passphrase (or pass `--password`). Running it again for the same email resets the password.

### Automatic deploys (GitHub Actions)

`.github/workflows/ci.yml` runs the tests, the Worker typecheck and a build on every push and pull request. On pushes to `main` it also applies new D1 migrations and deploys, once two repository secrets exist (_Settings → Secrets and variables → Actions_):

- `CLOUDFLARE_API_TOKEN`: create it at _Cloudflare dashboard → My Profile → API Tokens → Create Token_ from the **Edit Cloudflare Workers** template, then add **Account → D1 → Edit** (needed for migrations). Limit it to your account.
- `CLOUDFLARE_ACCOUNT_ID`: shown by `npx wrangler whoami` or on the Workers overview page.

Without them the workflow still checks the code and prints a warning instead of deploying. The database itself (content, admin accounts) is never touched by deploys, apart from new migrations.

## Adding a game (for the coach)

1. Sign in at `/admin` (link at the bottom of the home page) → **Games** → **Add game**.
2. Paste the PGN from the email (or drop the file) → **Continue**. Players, event, date and result are read from the PGN.
3. Click a move in the list, write a note, add a symbol. Play a different move on the board to add a side line.
4. Select the starting position to write the introduction.
5. In **Details**, switch on **Visible to members**, then **Save**.

## Swapping the chess libraries

Everything outside `src/app/chess/adapters/` talks to three abstract classes:

- `ChessRules` (`src/app/chess/chess-rules.ts`): PGN parse/write, legal moves, playing a move, check/mate status.
- `BoardRenderer` (`src/app/chess/board-renderer.ts`): mount/update/destroy a board.
- `ChessEngine` (`src/app/chess/engine/chess-engine.ts`): evaluate a position to a depth, streaming updates. The Stockfish files are copied from `node_modules/stockfish/bin` to `/engine/` at build time and cached lazily by the service worker, so only people who use the engine download it (~1.8 MB).

`src/app/chess/provide-chess.ts` is the only place that picks implementations. To move to, say, `cm-chessboard` + `chess.js` (e.g. for a non-GPL build), add two adapter classes, change the two providers and swap the chessground stylesheets in `angular.json`. The adapter tests in `chessops-rules.spec.ts` describe the behaviour a replacement must keep.

Lichess puzzles are behind `LichessPuzzles` (`src/app/core/lichess.ts`), and lessons are plain data in `src/app/features/learn/lessons.ts` (`lessons.spec.ts` checks that every exercise position is legal and every accepted answer works).

The Worker follows the same idea: routes depend on the repository interfaces in `worker/src/repositories/types.ts`, and `d1.ts` is one implementation.

## Translations

All UI text lives in `src/app/i18n/el.json` and `en.json` (same keys in both). Templates use `{{ 'games.title' | transloco }}`; TypeScript uses `inject(Language).t('key')`. Dates follow the active language (`el-GR` / `en-GB`, 24-hour clock). Content written by the coach (games, posts, events) is stored as typed and isn't translated.

## Customising

- Club name, subtitle, contact links and the weekly timetable: `src/app/club.config.ts`; tagline, address and timetable labels: the `club` section of the dictionaries (and `name`/`short_name` in `public/manifest.webmanifest`, the `<title>` in `src/index.html`).
- Colours and fonts: `src/styles/_tokens.scss`; board colours are `--sq-light` / `--sq-dark`.
- Logo and icons: replace `public/brand/chess-square-logo.jpg`, then `npm run icons`.

## Privacy

Many members are juniors, so the site asks search engines not to index it, learning progress (stars, streaks, finished lessons) is kept only in the browser (`robots` meta tag + `X-Robots-Tag` header), sample games use first names only, who borrowed a book is only visible to admins, and games sent to Lichess from the analysis board have player names and events removed. A members-only login is the natural next step once more real games are published.

## Checks

```bash
npm test                  # unit tests (Vitest): PGN round-trips, tree editing, notation layout, review maths, lesson exercises
npm run typecheck:worker  # Worker TypeScript
npm run build
```

## Licence

GPL-3.0-or-later (see `LICENSE`), because chessground and chessops are GPL-3.0.

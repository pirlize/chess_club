#!/usr/bin/env node
/**
 * Creates an admin account (or resets its password) in the D1 database.
 *
 *   npm run admin:create -- --email coach@example.com --name "Coach Maria"
 *   npm run admin:create -- --email coach@example.com --name "Coach Maria" --remote
 *
 * Without --password a readable one is generated and printed once.
 */
import { execFileSync } from 'node:child_process';
import { pbkdf2Sync, randomBytes, randomInt } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

// Must match worker/src/auth.ts (Workers cap PBKDF2 at 100k iterations).
const ITERATIONS = 100_000;
const DATABASE = 'chess-club';

const WORDS = [
  'pawn',
  'knight',
  'bishop',
  'rook',
  'queen',
  'king',
  'castle',
  'gambit',
  'fork',
  'pin',
  'skewer',
  'tempo',
  'rank',
  'file',
  'check',
  'endgame',
  'opening',
  'square',
  'board',
  'clock',
  'draw',
  'blitz',
  'rapid',
  'sicilian',
  'french',
  'dragon',
  'london',
  'english',
  'italian',
  'scotch',
  'maple',
  'river',
  'amber',
  'cedar',
  'harbor',
  'meadow',
  'silver',
  'copper',
  'olive',
  'lemon',
  'falcon',
  'otter',
  'badger',
  'heron',
  'fox',
  'owl',
  'lynx',
  'robin',
  'wren',
  'panda',
];

const { values } = parseArgs({
  options: {
    email: { type: 'string' },
    name: { type: 'string' },
    password: { type: 'string' },
    remote: { type: 'boolean', default: false },
  },
});

if (!values.email || !values.name) {
  console.error(
    'Usage: npm run admin:create -- --email <email> --name "<name>" [--password <pw>] [--remote]',
  );
  process.exit(1);
}

const password =
  values.password ??
  `${Array.from({ length: 4 }, () => WORDS[randomInt(WORDS.length)]).join('-')}-${randomInt(1000, 10000)}`;

const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, ITERATIONS, 32, 'sha256');
const passwordHash = `pbkdf2-sha256$${ITERATIONS}$${salt.toString('base64')}$${hash.toString('base64')}`;

const sql = (value) => `'${String(value).replace(/'/g, "''")}'`;
const statement = `INSERT INTO admins (email, name, password_hash)
VALUES (${sql(values.email.trim().toLowerCase())}, ${sql(values.name.trim())}, ${sql(passwordHash)})
ON CONFLICT(email) DO UPDATE SET name = excluded.name, password_hash = excluded.password_hash;`;

// Run wrangler through node directly: no shell, so no quoting problems on Windows.
const dir = mkdtempSync(join(tmpdir(), 'chess-club-'));
const file = join(dir, 'admin.sql');
try {
  writeFileSync(file, statement);
  const wrangler = fileURLToPath(
    new URL('../node_modules/wrangler/bin/wrangler.js', import.meta.url),
  );
  execFileSync(
    process.execPath,
    [wrangler, 'd1', 'execute', DATABASE, values.remote ? '--remote' : '--local', `--file=${file}`],
    { stdio: 'inherit' },
  );
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`\nAdmin ready (${values.remote ? 'production' : 'local'} database)`);
console.log(`  Email:    ${values.email}`);
console.log(`  Password: ${password}`);
console.log('Share the password privately; run this again to reset it.');

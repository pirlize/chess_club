import type { Context } from 'hono';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import type { AdminUser, ApiErrorBody } from '../../shared/models';
import type { AppEnv } from './http';

/** Workers' WebCrypto caps PBKDF2 at 100k iterations. Keep in sync with scripts/create-admin.mjs. */
const PBKDF2_ITERATIONS = 100_000;
const SESSION_COOKIE = 'cc_session';
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Verified against when the email is unknown, so a failed login takes the same
 * time whether or not the account exists.
 */
export const DUMMY_PASSWORD_HASH = `pbkdf2-sha256$${PBKDF2_ITERATIONS}$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=`;

/** Hashes are written by scripts/create-admin.mjs as `pbkdf2-sha256$<iterations>$<salt>$<hash>`. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, hash] = stored.split('$');
  if (scheme !== 'pbkdf2-sha256' || !iterations || !salt || !hash) return false;
  const expected = fromBase64(hash);
  const actual = await pbkdf2(password, fromBase64(salt), Number(iterations));
  return (
    actual.byteLength === expected.byteLength && crypto.subtle.timingSafeEqual(actual, expected)
  );
}

export async function startSession(c: Context<AppEnv>, adminId: number): Promise<void> {
  const token = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const expires = new Date(Date.now() + SESSION_TTL_MS);
  await c.var.repos.admins.createSession(adminId, await sha256(token), expires);
  setCookie(c, SESSION_COOKIE, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'Strict',
    path: '/api',
    expires,
  });
}

export async function endSession(c: Context<AppEnv>): Promise<void> {
  const token = getCookie(c, SESSION_COOKIE);
  if (token) await c.var.repos.admins.deleteSession(await sha256(token));
  deleteCookie(c, SESSION_COOKIE, { path: '/api', secure: true });
}

export async function currentAdmin(c: Context<AppEnv>): Promise<AdminUser | null> {
  const token = getCookie(c, SESSION_COOKIE);
  if (!token) return null;
  return c.var.repos.admins.findSessionAdmin(await sha256(token), new Date());
}

export const requireAdmin = createMiddleware<AppEnv>(async (c, next) => {
  const admin = await currentAdmin(c);
  if (!admin) return c.json<ApiErrorBody>({ error: 'Please sign in again.' }, 401);
  c.set('admin', admin);
  return next();
});

// ---- Crypto helpers --------------------------------------------------------

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations },
    key,
    256,
  );
  return new Uint8Array(bits);
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
const toBase64Url = (bytes: Uint8Array) =>
  toBase64(bytes).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromBase64 = (value: string) => Uint8Array.from(atob(value), (ch) => ch.charCodeAt(0));

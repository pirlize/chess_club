import { Hono } from 'hono';
import type { AdminUser, ApiErrorBody, SessionResponse } from '../../../shared/models';
import {
  currentAdmin,
  DUMMY_PASSWORD_HASH,
  endSession,
  startSession,
  verifyPassword,
} from '../auth';
import { parseJson, type AppEnv } from '../http';
import { loginSchema } from '../validation';

export const authRoutes = new Hono<AppEnv>()
  .use(async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  })
  .get('/me', async (c) => c.json<SessionResponse>({ admin: await currentAdmin(c) }))
  .post('/login', async (c) => {
    const { email, password } = await parseJson(c, loginSchema);
    const admin = await c.var.repos.admins.findByEmail(email);
    const valid = await verifyPassword(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
    if (!admin || !valid) {
      return c.json<ApiErrorBody>({ error: 'That email and password don’t match.' }, 401);
    }
    await c.var.repos.admins.deleteExpiredSessions(new Date());
    await startSession(c, admin.id);
    return c.json<AdminUser>({ email: admin.email, name: admin.name });
  })
  .post('/logout', async (c) => {
    await endSession(c);
    return c.body(null, 204);
  });

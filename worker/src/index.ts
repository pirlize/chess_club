import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { ApiErrorBody } from '../../shared/models';
import { ValidationFailed, type AppEnv } from './http';
import { createD1Repositories } from './repositories/d1';
import { adminRoutes } from './routes/admin';
import { authRoutes } from './routes/auth';
import { publicRoutes } from './routes/public';

/**
 * API for the club PWA. Static files (the Angular build) are served by
 * Workers Static Assets; only /api/* reaches this code (see wrangler.jsonc).
 */
const app = new Hono<AppEnv>().basePath('/api');

app.use(async (c, next) => {
  c.set('repos', createD1Repositories(c.env.DB));
  await next();
});

app.route('/auth', authRoutes);
app.route('/admin', adminRoutes);
app.route('/', publicRoutes);

app.notFound((c) => c.json<ApiErrorBody>({ error: 'Not found.' }, 404));

app.onError((err, c) => {
  if (err instanceof ValidationFailed) {
    return c.json<ApiErrorBody>({ error: 'Some fields need attention.', issues: err.issues }, 400);
  }
  if (err instanceof HTTPException) {
    return c.json<ApiErrorBody>({ error: err.message }, err.status);
  }
  if (err.message.includes('UNIQUE constraint failed: posts.slug')) {
    return c.json<ApiErrorBody>(
      {
        error: 'Another post already uses that web address.',
        issues: [{ path: 'slug', message: 'Already used by another post' }],
      },
      409,
    );
  }
  console.error(err);
  return c.json<ApiErrorBody>(
    { error: 'Something went wrong on our side. Please try again.' },
    500,
  );
});

export default app;

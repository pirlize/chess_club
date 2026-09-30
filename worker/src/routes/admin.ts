import { Hono } from 'hono';
import type { z } from 'zod';
import { requireAdmin } from '../auth';
import { notFound, parseId, parseJson, type AppEnv } from '../http';
import type { CrudRepository, Repositories } from '../repositories/types';
import { bookInputSchema, eventInputSchema, gameInputSchema, postInputSchema } from '../validation';

const ADMIN = { includeDrafts: true };

/** Standard list/get/create/update/delete endpoints for one repository. */
function crudRoutes<TInput>(
  pick: (repos: Repositories) => CrudRepository<unknown, unknown, TInput>,
  schema: z.ZodType<TInput>,
) {
  return new Hono<AppEnv>()
    .get('/', async (c) => c.json(await pick(c.var.repos).list(ADMIN)))
    .get('/:id', async (c) => {
      const item = await pick(c.var.repos).get(parseId(c), ADMIN);
      return item ? c.json(item) : notFound(c);
    })
    .post('/', async (c) => {
      const input = await parseJson(c, schema);
      return c.json(await pick(c.var.repos).create(input, { admin: c.var.admin }), 201);
    })
    .put('/:id', async (c) => {
      const id = parseId(c);
      const input = await parseJson(c, schema);
      const item = await pick(c.var.repos).update(id, input, { admin: c.var.admin });
      return item ? c.json(item) : notFound(c);
    })
    .delete('/:id', async (c) => {
      const deleted = await pick(c.var.repos).delete(parseId(c));
      return deleted ? c.body(null, 204) : notFound(c);
    });
}

export const adminRoutes = new Hono<AppEnv>()
  .use(requireAdmin)
  .use(async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  })
  .route(
    '/games',
    crudRoutes((r) => r.games, gameInputSchema),
  )
  .route(
    '/posts',
    crudRoutes((r) => r.posts, postInputSchema),
  )
  .route(
    // Not "/events": ad/tracker blockers block URLs like that.
    '/programme',
    crudRoutes((r) => r.events, eventInputSchema),
  )
  .route(
    '/books',
    crudRoutes((r) => r.books, bookInputSchema),
  );

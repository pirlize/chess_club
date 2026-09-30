import { Hono } from 'hono';
import type { Book } from '../../../shared/models';
import { notFound, parseId, type AppEnv } from '../http';

const PUBLIC = { includeDrafts: false };

/** Hides who borrowed a book: members' names stay admin-only. */
const toPublicBook = ({ borrower: _, ...book }: Book): Book => book;

export const publicRoutes = new Hono<AppEnv>()
  .use(async (c, next) => {
    await next();
    // Always revalidate; the service worker keeps an offline copy.
    c.header('Cache-Control', 'no-cache');
  })
  .get('/games', async (c) => c.json(await c.var.repos.games.list(PUBLIC)))
  .get('/games/:id', async (c) => {
    const game = await c.var.repos.games.get(parseId(c), PUBLIC);
    return game ? c.json(game) : notFound(c);
  })
  .get('/posts', async (c) => c.json(await c.var.repos.posts.list(PUBLIC)))
  .get('/posts/:slug', async (c) => {
    const post = await c.var.repos.posts.getBySlug(c.req.param('slug'), PUBLIC);
    return post ? c.json(post) : notFound(c);
  })
  // "programme", not "events": ad/tracker blockers block URLs like /api/events.
  .get('/programme', async (c) => c.json(await c.var.repos.events.list(PUBLIC)))
  .get('/programme/:id', async (c) => {
    const event = await c.var.repos.events.get(parseId(c), PUBLIC);
    return event ? c.json(event) : notFound(c);
  })
  .get('/books', async (c) => c.json((await c.var.repos.books.list(PUBLIC)).map(toPublicBook)));

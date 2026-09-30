import type { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import type { z } from 'zod';
import type { AdminUser, ApiErrorBody } from '../../shared/models';
import type { Repositories } from './repositories/types';

export type AppEnv = {
  Bindings: Env;
  Variables: { repos: Repositories; admin: AdminUser };
};

export class ValidationFailed extends Error {
  constructor(readonly issues: NonNullable<ApiErrorBody['issues']>) {
    super('Validation failed');
  }
}

/**
 * Parses a JSON body against a schema. Requiring the JSON content type also
 * means a cross-site HTML form can never reach a mutating endpoint.
 */
export async function parseJson<T>(c: Context<AppEnv>, schema: z.ZodType<T>): Promise<T> {
  if (!c.req.header('content-type')?.startsWith('application/json')) {
    throw new HTTPException(415, { message: 'Expected a JSON body.' });
  }
  const body: unknown = await c.req.json().catch(() => {
    throw new ValidationFailed([{ path: '', message: 'The request body is not valid JSON.' }]);
  });
  const result = schema.safeParse(body);
  if (!result.success) {
    throw new ValidationFailed(
      result.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return result.data;
}

export function parseId(c: Context<AppEnv>): number {
  const id = Number(c.req.param('id'));
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new HTTPException(404, { message: 'Not found.' });
  }
  return id;
}

export function notFound(c: Context<AppEnv>) {
  return c.json<ApiErrorBody>({ error: 'Not found.' }, 404);
}

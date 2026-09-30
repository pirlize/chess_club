import { z } from 'zod';
import {
  BOOK_LEVELS,
  BOOK_STATUSES,
  EVENT_KINDS,
  GAME_CATEGORIES,
  GAME_RESULTS,
  type BookInput,
  type EventInput,
  type GameInput,
  type LoginRequest,
  type PostInput,
} from '../../shared/models';

const text = (max: number) => z.string().trim().max(max);
const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);
const markdown = z.string().max(50_000);

export const gameInputSchema = z.object({
  title: text(120),
  white: requiredText(80, 'Enter the White player'),
  black: requiredText(80, 'Enter the Black player'),
  result: z.enum(GAME_RESULTS),
  event: text(120),
  playedOn: z.iso.date().nullable(),
  eco: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-E]\d\d)?$/, 'ECO codes look like C41'),
  opening: text(120),
  category: z.enum(GAME_CATEGORIES),
  summary: markdown,
  pgn: z.string().min(1).max(200_000),
  finalFen: requiredText(100, 'Missing final position'),
  published: z.boolean(),
}) satisfies z.ZodType<GameInput>;

export const postInputSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes'),
  title: requiredText(140, 'Give the post a title'),
  excerpt: text(300),
  body: markdown,
  published: z.boolean(),
}) satisfies z.ZodType<PostInput>;

export const eventInputSchema = z
  .object({
    title: requiredText(120, 'Give the event a title'),
    kind: z.enum(EVENT_KINDS),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime().nullable(),
    location: text(160),
    link: z.union([z.literal(''), z.url({ protocol: /^https$/ }).max(500)]),
    description: markdown,
    results: markdown,
  })
  .refine((e) => !e.endsAt || e.endsAt > e.startsAt, {
    message: 'The event must end after it starts',
    path: ['endsAt'],
  }) satisfies z.ZodType<EventInput>;

export const bookInputSchema = z.object({
  title: requiredText(160, 'Enter the book title'),
  author: text(160),
  level: z.enum(BOOK_LEVELS),
  isbn: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, '').toUpperCase())
    .pipe(z.string().regex(/^(\d{9}[\dX]|\d{13})?$/, 'ISBNs have 10 or 13 digits')),
  review: text(4_000),
  status: z.enum(BOOK_STATUSES),
  borrower: text(80),
}) satisfies z.ZodType<BookInput, unknown>;

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(200),
  password: z.string().min(1).max(200),
}) satisfies z.ZodType<LoginRequest>;

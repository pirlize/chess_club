import { inject, Pipe, type PipeTransform } from '@angular/core';
import { Marked } from 'marked';
import { Language } from './i18n';

export type DateFormat =
  'date' | 'long' | 'day' | 'weekday' | 'time' | 'month' | 'dayOfMonth' | 'relative';

const OPTIONS: Record<Exclude<DateFormat, 'relative'>, Intl.DateTimeFormatOptions> = {
  date: { day: 'numeric', month: 'short', year: 'numeric' },
  long: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
  day: { weekday: 'short', day: 'numeric', month: 'short' },
  weekday: { weekday: 'long' },
  // 24-hour clock in every language (el-GR would otherwise say "05:00 μ.μ.").
  time: { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
  month: { month: 'short' },
  dayOfMonth: { day: 'numeric' },
};

const formatters = new Map<string, Intl.DateTimeFormat>();
const formatter = (locale: string, format: Exclude<DateFormat, 'relative'>) => {
  const key = `${locale}|${format}`;
  let f = formatters.get(key);
  if (!f) formatters.set(key, (f = new Intl.DateTimeFormat(locale, OPTIONS[format])));
  return f;
};

/** Date-only values (YYYY-MM-DD) are local calendar days, not UTC midnight. */
export function toDate(value: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
}

export function formatDate(value: string, format: DateFormat, locale: string): string {
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return '';
  if (format !== 'relative') return formatter(locale, format).format(date);
  const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (Math.abs(minutes) < 60) return relative.format(minutes, 'minute');
  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) return relative.format(hours, 'hour');
  const days = Math.round(hours / 24);
  if (Math.abs(days) < 30) return relative.format(days, 'day');
  return formatter(locale, 'date').format(date);
}

/** Weekday name for ISO day numbers (1 = Monday … 7 = Sunday). */
export function weekdayName(day: number, locale: string): string {
  // 1 January 2024 was a Monday.
  return formatter(locale, 'weekday').format(new Date(2024, 0, day));
}

/** Dates in the active language. Impure so it follows language changes; memoised per input. */
@Pipe({ name: 'clubDate', pure: false })
export class ClubDatePipe implements PipeTransform {
  private readonly language = inject(Language);
  private last: { key: string; text: string } | null = null;

  transform(value: string | null | undefined, format: DateFormat = 'date'): string {
    if (!value) return '';
    const locale = this.language.locale();
    const key = `${value}|${format}|${locale}`;
    if (this.last?.key !== key || format === 'relative') {
      this.last = { key, text: formatDate(value, format, locale) };
    }
    return this.last.text;
  }
}

const markdown = new Marked({ gfm: true, breaks: true, async: false });

/** Renders Markdown to HTML. Bind with [innerHTML], which Angular sanitizes. */
@Pipe({ name: 'markdown' })
export class MarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    return value ? (markdown.parse(value) as string) : '';
  }
}

/** "1/2-1/2" → "½–½"; an unfinished game ("*") shows as a dash. */
export function formatResult(result: string): string {
  return result === '*' ? '—' : result.replaceAll('1/2', '½').replace('-', '–');
}

@Pipe({ name: 'result' })
export class ResultPipe implements PipeTransform {
  transform(value: string): string {
    return formatResult(value);
  }
}

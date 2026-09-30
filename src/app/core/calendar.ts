import type { ClubEvent } from '../../../shared/models';
import { CLUB } from '../club.config';

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;

/** Downloads an .ics file so the event can be added to any calendar app. */
export function downloadCalendarFile(event: ClubEvent, origin = location.origin): void {
  const end =
    event.endsAt ?? new Date(Date.parse(event.startsAt) + DEFAULT_DURATION_MS).toISOString();
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    `PRODID:-//${escape(CLUB.name)}//Club app//EN`,
    'BEGIN:VEVENT',
    `UID:event-${event.id}@${new URL(origin).host}`,
    `DTSTAMP:${stamp(new Date().toISOString())}`,
    `DTSTART:${stamp(event.startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(event.title)}`,
    event.location && `LOCATION:${escape(event.location)}`,
    event.description && `DESCRIPTION:${escape(event.description)}`,
    `URL:${origin}/events/${event.id}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ]
    .filter(Boolean)
    .map((line) => fold(line as string))
    .join('\r\n');

  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const link = Object.assign(document.createElement('a'), {
    href: url,
    download: `${event.title.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase()}.ics`,
  });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** 2026-10-02T15:00:00.000Z → 20261002T150000Z */
const stamp = (iso: string) =>
  new Date(iso)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

const escape = (text: string) =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** RFC 5545 lines are at most 75 octets; continuation lines start with a space. */
function fold(line: string): string {
  const parts: string[] = [];
  for (let i = 0; i < line.length; i += 70) parts.push(line.slice(i, i + 70));
  return parts.join('\r\n ');
}

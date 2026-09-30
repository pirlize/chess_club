import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ClubEvent } from '../../../../shared/models';
import { Language } from '../../core/i18n';
import { Icon } from '../../ui/icon';
import { EVENT_KIND_META, EventRow, isPast } from './event-meta';

/** Local calendar day, e.g. "2026-10-06". */
const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const firstOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1);

interface Day {
  key: string;
  date: number;
  inMonth: boolean;
  today: boolean;
  events: ClubEvent[];
}

/**
 * Month view of the programme, weeks starting on Monday. Phones get coloured
 * dots per event; wider screens get short titles. Picking a day lists its
 * events below the grid.
 */
@Component({
  selector: 'app-event-calendar',
  imports: [TranslocoPipe, Icon, EventRow],
  template: `
    <div class="card calendar">
      <div class="head">
        <h2 class="month" aria-live="polite">{{ monthTitle() }}</h2>
        <div class="nav">
          <button type="button" class="btn btn-ghost btn-sm" (click)="goToday()">
            {{ 'calendar.today' | transloco }}
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-icon btn-sm"
            (click)="shift(-1)"
            [attr.aria-label]="'calendar.previous' | transloco"
          >
            <app-icon name="chevron-left" />
          </button>
          <button
            type="button"
            class="btn btn-ghost btn-icon btn-sm"
            (click)="shift(1)"
            [attr.aria-label]="'calendar.next' | transloco"
          >
            <app-icon name="chevron-right" />
          </button>
        </div>
      </div>

      <div class="grid">
        <div class="row weekdays" aria-hidden="true">
          @for (name of weekdays(); track $index) {
            <span class="weekday">{{ name }}</span>
          }
        </div>
        @for (week of weeks(); track week[0].key) {
          <div class="row">
            @for (day of week; track day.key) {
              <button
                type="button"
                class="day"
                [class.out]="!day.inMonth"
                [class.today]="day.today"
                [class.has-events]="day.events.length > 0"
                [attr.aria-pressed]="day.key === selected()"
                [attr.aria-label]="dayLabel(day)"
                (click)="selected.set(day.key)"
              >
                <span class="num">{{ day.date }}</span>
                @if (day.events.length) {
                  <span class="dots" aria-hidden="true">
                    @for (e of day.events.slice(0, 3); track e.id) {
                      <span class="dot" [attr.data-tone]="kinds[e.kind].tone"></span>
                    }
                  </span>
                  <span class="chips" aria-hidden="true">
                    @for (e of day.events.slice(0, 2); track e.id) {
                      <span
                        class="chip"
                        [attr.data-tone]="kinds[e.kind].tone"
                        [class.past]="isPast(e)"
                      >
                        {{ e.title }}
                      </span>
                    }
                    @if (day.events.length > 2) {
                      <span class="more">+{{ day.events.length - 2 }}</span>
                    }
                  </span>
                }
              </button>
            }
          </div>
        }
      </div>

      <div class="legend" aria-hidden="true">
        @for (kind of kindList; track kind[0]) {
          <span
            ><span class="dot" [attr.data-tone]="kind[1].tone"></span
            >{{ kind[1].label | transloco }}</span
          >
        }
      </div>
    </div>

    <section class="selected" aria-live="polite">
      <h3 class="group">{{ selectedTitle() }}</h3>
      <div class="stack">
        @for (event of selectedEvents(); track event.id) {
          <app-event-row [event]="event" />
        } @empty {
          <p class="muted empty">{{ 'calendar.nothing' | transloco }}</p>
          @if (nextEvent(); as next) {
            <p class="muted empty">{{ 'calendar.nextOne' | transloco }}</p>
            <app-event-row [event]="next" />
          }
        }
      </div>
    </section>
  `,
  styles: `
    :host {
      display: grid;
      gap: 1.25rem;
    }
    .calendar {
      padding: 1rem;

      @media (min-width: 48rem) {
        padding: 1.25rem;
      }
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }
    .month {
      margin: 0;
      font-size: 1.15rem;
      white-space: nowrap;
      text-transform: capitalize;

      @media (min-width: 48rem) {
        font-size: 1.3rem;
      }
    }
    .nav {
      display: flex;
      gap: 0.25rem;
    }
    .grid {
      display: grid;
      gap: 2px;
    }
    .row {
      display: grid;
      grid-template-columns: repeat(7, minmax(0, 1fr));
      gap: 2px;
    }
    .weekday {
      padding: 0.25rem 0 0.4rem;
      text-align: center;
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .day {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.25rem;
      min-height: 3.1rem;
      padding: 0.35rem 0.15rem;
      border: 0;
      border-radius: var(--radius-xs);
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: pointer;
      transition: background-color 0.15s;

      &:hover {
        background: var(--surface-hover);
      }
      &.out {
        color: var(--text-faint);
      }
      &[aria-pressed='true'] {
        background: var(--accent-soft);
        box-shadow: inset 0 0 0 1.5px var(--accent);
      }

      @media (min-width: 48rem) {
        align-items: stretch;
        min-height: 5.75rem;
        padding: 0.4rem;
        background: var(--surface-2);

        &.out {
          background: transparent;
        }
      }
    }
    .num {
      display: grid;
      place-items: center;
      width: 1.75rem;
      height: 1.75rem;
      border-radius: 50%;
      font-size: 0.9rem;
      font-weight: 600;
      font-variant-numeric: tabular-nums;

      .today & {
        background: var(--accent);
        color: var(--on-accent);
      }

      @media (min-width: 48rem) {
        align-self: flex-start;
        font-size: 0.85rem;
      }
    }
    .dots {
      display: flex;
      gap: 3px;

      @media (min-width: 48rem) {
        display: none;
      }
    }
    .chips {
      display: none;

      @media (min-width: 48rem) {
        display: grid;
        gap: 3px;
        min-width: 0;
      }
    }
    .chip {
      color: var(--text);
      overflow: hidden;
      padding: 0.1rem 0.35rem;
      border-radius: 4px;
      border-inline-start: 3px solid var(--tone);
      background: var(--surface);
      font-size: 0.72rem;
      font-weight: 600;
      line-height: 1.35;
      text-align: start;
      text-overflow: ellipsis;
      white-space: nowrap;

      &.past {
        opacity: 0.6;
      }
    }
    .more {
      font-size: 0.72rem;
      font-weight: 600;
      color: var(--text-muted);
      text-align: start;
    }
    .dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: var(--tone);
    }
    [data-tone] {
      --tone: var(--text-muted);
    }
    [data-tone='accent'] {
      --tone: var(--accent);
    }
    [data-tone='gold'] {
      --tone: var(--gold);
    }
    [data-tone='blue'] {
      --tone: var(--blue);
    }
    [data-tone='purple'] {
      --tone: var(--purple);
    }
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem 1rem;
      margin-top: 0.9rem;
      padding-top: 0.75rem;
      border-top: 1px solid var(--border);
      font-size: 0.8rem;
      color: var(--text-muted);

      > span {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }
    }
    .group {
      margin: 0 0 0.75rem;
      font-family: var(--font-sans);
      font-size: 0.8rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .empty {
      margin: 0;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventCalendar {
  private readonly language = inject(Language);

  readonly events = input.required<readonly ClubEvent[]>();

  protected readonly kinds = EVENT_KIND_META;
  protected readonly kindList = Object.entries(EVENT_KIND_META);
  protected readonly isPast = isPast;
  protected readonly month = signal(firstOfMonth(new Date()));
  protected readonly selected = signal(dayKey(new Date()));

  private readonly byDay = computed(() => {
    const map = new Map<string, ClubEvent[]>();
    for (const event of this.events()) {
      const key = dayKey(new Date(event.startsAt));
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  });

  protected readonly monthTitle = computed(() =>
    new Intl.DateTimeFormat(this.language.locale(), { month: 'long', year: 'numeric' }).format(
      this.month(),
    ),
  );

  /** Monday-first short weekday names. */
  protected readonly weekdays = computed(() => {
    const format = new Intl.DateTimeFormat(this.language.locale(), { weekday: 'short' });
    // 1 January 2024 was a Monday.
    return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, 1 + i)));
  });

  protected readonly weeks = computed(() => {
    const first = this.month();
    const todayKey = dayKey(new Date());
    // Back up to the Monday on or before the 1st.
    const start = new Date(first);
    start.setDate(1 - ((first.getDay() + 6) % 7));
    const weeks: Day[][] = [];
    const cursor = new Date(start);
    do {
      const week: Day[] = [];
      for (let i = 0; i < 7; i++) {
        const key = dayKey(cursor);
        week.push({
          key,
          date: cursor.getDate(),
          inMonth: cursor.getMonth() === first.getMonth(),
          today: key === todayKey,
          events: this.byDay().get(key) ?? [],
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    } while (cursor.getMonth() === first.getMonth());
    return weeks;
  });

  protected readonly selectedEvents = computed(() => this.byDay().get(this.selected()) ?? []);

  /** The first event after the selected day, for days with nothing on. */
  protected readonly nextEvent = computed(() => {
    const selected = this.selected();
    return (
      [...this.events()]
        .filter((e) => dayKey(new Date(e.startsAt)) > selected)
        .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null
    );
  });

  protected readonly selectedTitle = computed(() => {
    const [y, m, d] = this.selected().split('-').map(Number);
    return new Intl.DateTimeFormat(this.language.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, m - 1, d));
  });

  protected shift(months: number): void {
    const current = this.month();
    const next = new Date(current.getFullYear(), current.getMonth() + months, 1);
    this.month.set(next);
    // Select the first day with events in the new month, or the 1st.
    const prefix = dayKey(next).slice(0, 7);
    const withEvents = [...this.byDay().keys()].filter((k) => k.startsWith(prefix)).sort()[0];
    this.selected.set(withEvents ?? dayKey(next));
  }

  protected goToday(): void {
    this.month.set(firstOfMonth(new Date()));
    this.selected.set(dayKey(new Date()));
  }

  protected dayLabel(day: Day): string {
    const [y, m, d] = day.key.split('-').map(Number);
    const date = new Intl.DateTimeFormat(this.language.locale(), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    }).format(new Date(y, m - 1, d));
    if (!day.events.length) return date;
    return `${date}: ${day.events.map((e) => e.title).join(', ')}`;
  }
}

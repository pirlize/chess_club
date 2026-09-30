import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { ClubEvent, EventKind } from '../../../../shared/models';
import { ClubDatePipe } from '../../core/format';
import { Icon } from '../../ui/icon';

/** Labels are translation keys. */
export const EVENT_KIND_META: Record<EventKind, { label: string; tone: string }> = {
  'club-night': { label: 'eventKind.club-night', tone: 'accent' },
  tournament: { label: 'eventKind.tournament', tone: 'gold' },
  lesson: { label: 'eventKind.lesson', tone: 'blue' },
  lecture: { label: 'eventKind.lecture', tone: 'purple' },
  social: { label: 'eventKind.social', tone: '' },
};

/** Whether an event has finished (or started, when it has no end time). */
export const isPast = (e: ClubEvent, now = Date.now()) => Date.parse(e.endsAt ?? e.startsAt) < now;

/** Date tile + title row used in event lists and on the home page. */
@Component({
  selector: 'app-event-row',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe, Icon],
  template: `
    @let e = event();
    <a class="card event-row" [routerLink]="['/events', e.id]">
      <div class="date-tile" [class.past]="past()">
        <span class="month">{{ e.startsAt | clubDate: 'month' }}</span>
        <span class="day">{{ e.startsAt | clubDate: 'dayOfMonth' }}</span>
      </div>
      <div class="info">
        <div class="top">
          <span class="badge" [attr.data-tone]="kind().tone">{{ kind().label | transloco }}</span>
          @if (e.results && past()) {
            <span class="badge"><app-icon name="trophy" /> {{ 'events.results' | transloco }}</span>
          }
        </div>
        <h3>{{ e.title }}</h3>
        <p class="when">
          <app-icon name="clock" />
          {{ e.startsAt | clubDate: 'weekday' }}, {{ e.startsAt | clubDate: 'time' }}
          @if (e.endsAt) {
            – {{ e.endsAt | clubDate: 'time' }}
          }
        </p>
        @if (e.location) {
          <p class="where"><app-icon name="pin" /> {{ e.location }}</p>
        }
      </div>
      <app-icon class="chev" name="chevron-right" />
    </a>
  `,
  styles: `
    .event-row {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.9rem 1rem;
    }
    .info {
      flex: 1;
      min-width: 0;
    }
    .top {
      display: flex;
      gap: 0.4rem;
      margin-bottom: 0.3rem;
      --icon-size: 0.8rem;
    }
    h3 {
      margin: 0 0 0.25rem;
      font-size: 1.1rem;
    }
    .when,
    .where {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin: 0.1rem 0 0;
      font-size: 0.88rem;
      color: var(--text-muted);
      --icon-size: 0.95rem;
    }
    .where {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .chev {
      color: var(--text-faint);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventRow {
  readonly event = input.required<ClubEvent>();
  protected readonly kind = computed(() => EVENT_KIND_META[this.event().kind]);
  protected readonly past = computed(() => isPast(this.event()));
}

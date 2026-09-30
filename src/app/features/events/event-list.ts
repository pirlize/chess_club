import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentApi } from '../../core/content-api';
import { errorMessage, valueOr } from '../../core/errors';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { EventCalendar } from './event-calendar';
import { EventRow, isPast } from './event-meta';

@Component({
  selector: 'app-event-list',
  imports: [TranslocoPipe, RouterLink, Icon, EventRow, EventCalendar, EmptyState, ErrorState],
  template: `
    <div class="page" [class.page-narrow]="!calendar()">
      <header class="page-header">
        <p class="eyebrow">{{ 'events.eyebrow' | transloco }}</p>
        <h1>{{ 'events.title' | transloco }}</h1>
        <p class="lede">{{ 'events.lede' | transloco }}</p>
      </header>

      <nav class="segmented views" [attr.aria-label]="'calendar.viewAria' | transloco">
        <a routerLink="." [queryParams]="{}" [attr.aria-current]="calendar() ? null : 'page'">
          <app-icon name="list" /> {{ 'calendar.list' | transloco }}
        </a>
        <a
          routerLink="."
          [queryParams]="{ view: 'calendar' }"
          [attr.aria-current]="calendar() ? 'page' : null"
        >
          <app-icon name="calendar" /> {{ 'calendar.month' | transloco }}
        </a>
      </nav>

      @if (events.error(); as error) {
        <app-error-state [message]="message(error)" (retry)="events.reload()" />
      } @else if (events.isLoading() && events.value().length === 0) {
        <div class="stack">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton" style="height: 6rem"></div>
          }
        </div>
      } @else if (calendar()) {
        <app-event-calendar [events]="events.value()" />
      } @else {
        <section aria-labelledby="upcoming">
          <h2 id="upcoming" class="group">{{ 'events.upcoming' | transloco }}</h2>
          <div class="stack">
            @for (event of split().upcoming; track event.id) {
              <app-event-row [event]="event" />
            } @empty {
              <app-empty-state icon="calendar" heading="events.empty" text="events.emptyText" />
            }
          </div>
        </section>

        @if (split().past.length) {
          <section class="section" aria-labelledby="past">
            <h2 id="past" class="group">{{ 'events.past' | transloco }}</h2>
            <div class="stack">
              @for (event of split().past; track event.id) {
                <app-event-row [event]="event" />
              }
            </div>
          </section>
        }
      }
    </div>
  `,
  styles: `
    .views {
      margin-bottom: 1.5rem;
      --icon-size: 1rem;
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
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventList {
  /** `?view=calendar` shows the month grid. */
  readonly view = input<string>();

  protected readonly events = inject(ContentApi).events();
  protected readonly calendar = computed(() => this.view() === 'calendar');
  protected readonly message = errorMessage;

  protected readonly split = computed(() => {
    const now = Date.now();
    const all = valueOr(this.events, []);
    return {
      upcoming: all.filter((e) => !isPast(e, now)),
      past: all.filter((e) => isPast(e, now)).reverse(),
    };
  });
}

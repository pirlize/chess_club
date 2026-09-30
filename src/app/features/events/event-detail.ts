import { ChangeDetectionStrategy, Component, computed, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { downloadCalendarFile } from '../../core/calendar';
import { ContentApi } from '../../core/content-api';
import { errorMessage, isNotFound, valueOr } from '../../core/errors';
import { ClubDatePipe, MarkdownPipe } from '../../core/format';
import { pageTitle } from '../../core/title';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { EVENT_KIND_META, isPast } from './event-meta';

@Component({
  selector: 'app-event-detail',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe, MarkdownPipe, Icon, EmptyState, ErrorState],
  template: `
    <div class="page page-narrow">
      <a routerLink="/events" class="back-link">
        <app-icon name="arrow-left" /> {{ 'events.allEvents' | transloco }}
      </a>

      @if (event.error(); as error) {
        @if (isNotFound(error)) {
          <app-empty-state icon="calendar" heading="events.notFound" text="events.notFoundText" />
        } @else {
          <app-error-state [message]="message(error)" (retry)="event.reload()" />
        }
      } @else if (event.value(); as e) {
        <article>
          <header class="head">
            <span class="badge" [attr.data-tone]="kind()?.tone">{{
              kind()?.label ?? '' | transloco
            }}</span>
            <h1>{{ e.title }}</h1>
          </header>

          <div class="facts card">
            <div class="fact">
              <app-icon name="calendar" />
              <div>
                <strong>{{ e.startsAt | clubDate: 'long' }}</strong>
                <span>
                  {{ e.startsAt | clubDate: 'time' }}
                  @if (e.endsAt) {
                    – {{ e.endsAt | clubDate: 'time' }}
                  }
                </span>
              </div>
            </div>
            @if (e.location) {
              <div class="fact">
                <app-icon name="pin" />
                <div>
                  <strong>{{ e.location }}</strong>
                  <a [href]="mapsUrl()" target="_blank" rel="noopener">{{
                    'events.openMaps' | transloco
                  }}</a>
                </div>
              </div>
            }
            @if (e.link) {
              <div class="fact">
                <app-icon name="external" />
                <div>
                  <a [href]="e.link" target="_blank" rel="noopener">{{
                    'events.moreOn' | transloco: { host: linkHost() }
                  }}</a>
                </div>
              </div>
            }
            @if (!past()) {
              <button type="button" class="btn btn-primary add" (click)="addToCalendar()">
                <app-icon name="calendar-plus" /> {{ 'events.addToCalendar' | transloco }}
              </button>
            }
          </div>

          @if (e.results) {
            <section class="section">
              <h2><app-icon name="trophy" /> {{ 'events.results' | transloco }}</h2>
              <div class="prose card results" [innerHTML]="e.results | markdown"></div>
            </section>
          }

          @if (e.description) {
            <section class="section">
              <h2>{{ 'events.about' | transloco }}</h2>
              <div class="prose" [innerHTML]="e.description | markdown"></div>
            </section>
          }
        </article>
      } @else {
        <div class="skeleton" style="height: 2.5rem; width: 70%; margin-bottom: 1.5rem"></div>
        <div class="skeleton" style="height: 8rem"></div>
      }
    </div>
  `,
  styles: `
    .head h1 {
      margin: 0.6rem 0 1.25rem;
      font-size: clamp(1.8rem, 1.3rem + 2vw, 2.5rem);
    }
    .facts {
      display: grid;
      gap: 1rem;
      padding: 1.1rem 1.2rem;
    }
    .fact {
      display: flex;
      gap: 0.85rem;
      align-items: flex-start;
    }
    .fact app-icon {
      color: var(--accent-text);
      margin-top: 0.1rem;
    }
    .fact div {
      display: grid;
      gap: 0.1rem;
    }
    .fact span,
    .fact a {
      font-size: 0.92rem;
    }
    .fact span {
      color: var(--text-muted);
    }
    .add {
      justify-self: start;
    }
    h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.3rem;
      margin: 0 0 0.75rem;
    }
    .results {
      padding: 0.5rem 1rem;
    }
    /* The winner's row. */
    .results ::ng-deep tbody tr:first-child td {
      font-weight: 700;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail {
  readonly id = input.required<string>();
  protected readonly event = inject(ContentApi).event(() => this.id());
  protected readonly message = errorMessage;
  protected readonly isNotFound = isNotFound;
  private readonly setTitle = pageTitle();

  protected readonly kind = computed(() => {
    const e = valueOr(this.event, undefined);
    return e && EVENT_KIND_META[e.kind];
  });
  protected readonly past = computed(() => {
    const e = valueOr(this.event, undefined);
    return !!e && isPast(e);
  });
  protected readonly mapsUrl = computed(
    () =>
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(valueOr(this.event, undefined)?.location ?? '')}`,
  );

  protected readonly linkHost = computed(() => {
    const link = valueOr(this.event, undefined)?.link;
    try {
      return link ? new URL(link).host.replace(/^www./, '') : '';
    } catch {
      return '';
    }
  });

  constructor() {
    effect(() => this.setTitle(valueOr(this.event, undefined)?.title));
  }

  protected addToCalendar(): void {
    const e = valueOr(this.event, undefined);
    if (e) downloadCalendarFile(e);
  }
}

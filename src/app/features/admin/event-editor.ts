import { ChangeDetectionStrategy, Component } from '@angular/core';
import { form, FormField, FormRoot, pattern, required, validate } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import {
  EVENT_KINDS,
  type ClubEvent,
  type EventInput,
  type EventKind,
} from '../../../../shared/models';
import { CLUB } from '../../club.config';
import { FieldError } from '../../ui/field-error';
import { Icon } from '../../ui/icon';
import { ErrorState } from '../../ui/states';
import { EVENT_KIND_META } from '../events/event-meta';
import { EditorBar } from './editor-bar';
import { ResourceEditor } from './resource-editor';

/** The form works in local wall-clock time; the API stores UTC. */
interface EventForm {
  title: string;
  kind: EventKind;
  start: string;
  end: string;
  location: string;
  link: string;
  description: string;
  results: string;
}

/** Date → "2026-10-02T18:00" in local time, the format of <input type="datetime-local">. */
function toLocalInput(value: Date | string): string {
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Tomorrow at 18:00: a sensible default the admin can adjust. */
function tomorrowEvening(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(18, 0, 0, 0);
  return date;
}

@Component({
  selector: 'app-event-editor',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    TranslocoPipe,
    FieldError,
    Icon,
    ErrorState,
    EditorBar,
  ],
  template: `
    <div class="page page-narrow">
      <a routerLink="/admin/events" class="back-link">
        <app-icon name="arrow-left" /> {{ 'eventEditor.back' | transloco }}
      </a>

      @if (loadError(); as message) {
        <app-error-state [message]="message" (retry)="reload()" />
      } @else if (loading()) {
        <div class="skeleton" style="height: 20rem"></div>
      } @else {
        <form [formRoot]="form" class="stack editor">
          <header class="editor-head">
            <h1>{{ (isNew() ? 'eventEditor.new' : 'eventEditor.edit') | transloco }}</h1>
            @if (item(); as saved) {
              <a
                class="btn btn-ghost btn-sm"
                [href]="'/events/' + saved.id"
                target="_blank"
                rel="noopener"
              >
                {{ 'editor.view' | transloco }} <app-icon name="external" />
              </a>
            }
          </header>

          <div class="form-grid">
            <div class="field span-2">
              <label for="title">{{ 'eventEditor.title' | transloco }}</label>
              <input
                id="title"
                class="input title"
                [formField]="form.title"
                [placeholder]="'eventEditor.titlePlaceholder' | transloco"
              />
              <app-field-error [field]="form.title" />
            </div>

            <div class="field">
              <label for="kind">{{ 'eventEditor.kind' | transloco }}</label>
              <select id="kind" class="input" [formField]="form.kind">
                @for (kind of kinds; track kind) {
                  <option [value]="kind">{{ kindMeta[kind].label | transloco }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label for="location">{{ 'eventEditor.location' | transloco }}</label>
              <input
                id="location"
                class="input"
                [formField]="form.location"
                [placeholder]="'eventEditor.locationPlaceholder' | transloco"
              />
            </div>

            <div class="field">
              <label for="start">{{ 'eventEditor.starts' | transloco }}</label>
              <input id="start" class="input" type="datetime-local" [formField]="form.start" />
              <app-field-error [field]="form.start" />
            </div>

            <div class="field">
              <label for="end">
                {{ 'eventEditor.ends' | transloco }}
                <span class="muted">{{ 'common.optional' | transloco }}</span>
              </label>
              <input id="end" class="input" type="datetime-local" [formField]="form.end" />
              <app-field-error [field]="form.end" />
            </div>

            <div class="field span-2">
              <label for="link">
                {{ 'eventEditor.link' | transloco }}
                <span class="muted">{{ 'common.optional' | transloco }}</span>
              </label>
              <input
                id="link"
                class="input"
                type="url"
                inputmode="url"
                [formField]="form.link"
                [placeholder]="'eventEditor.linkPlaceholder' | transloco"
              />
              <span class="hint">{{ 'eventEditor.linkHint' | transloco }}</span>
              <app-field-error [field]="form.link" />
            </div>

            <div class="field span-2">
              <label for="description">{{ 'eventEditor.details' | transloco }}</label>
              <textarea
                id="description"
                class="input"
                [formField]="form.description"
                [placeholder]="'eventEditor.detailsPlaceholder' | transloco"
              ></textarea>
              <span class="hint">{{ 'editor.markdownHint' | transloco }}</span>
            </div>

            <div class="field span-2">
              <label for="results">{{ 'eventEditor.results' | transloco }}</label>
              <textarea
                id="results"
                class="input mono"
                [formField]="form.results"
                [placeholder]="'eventEditor.resultsExample' | transloco"
              ></textarea>
              <span class="hint">{{ 'eventEditor.resultsHint' | transloco }}</span>
            </div>
          </div>

          <app-editor-bar
            [isNew]="isNew()"
            [dirty]="dirty()"
            [saving]="saving()"
            (delete)="remove()"
          />
        </form>
      }
    </div>
  `,
  styleUrl: './editor.scss',
  styles: `
    .mono {
      font-family: ui-monospace, 'Cascadia Code', Menlo, monospace;
      font-size: 0.9rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventEditor extends ResourceEditor<'events', EventForm> {
  protected readonly resource = 'events';
  protected readonly kinds = EVENT_KINDS;
  protected readonly kindMeta = EVENT_KIND_META;

  protected readonly form = form(
    this.model,
    (p) => {
      required(p.title, { message: 'eventEditor.titleRequired' });
      required(p.start, { message: 'eventEditor.startRequired' });
      validate(p.end, ({ value, valueOf }) =>
        value() && value() <= valueOf(p.start)
          ? { kind: 'order', message: 'eventEditor.endOrder' }
          : null,
      );
      pattern(p.link, /^(https:\/\/\S+)?$/, { message: 'eventEditor.linkInvalid' });
    },
    { submission: { action: async () => void (await this.persist()) } },
  );

  protected emptyModel(): EventForm {
    return {
      title: '',
      kind: 'tournament',
      start: toLocalInput(tomorrowEvening()),
      end: '',
      location: CLUB.name,
      link: '',
      description: '',
      results: '',
    };
  }

  protected toModel(event: ClubEvent): EventForm {
    return {
      title: event.title,
      kind: event.kind,
      start: toLocalInput(event.startsAt),
      end: event.endsAt ? toLocalInput(event.endsAt) : '',
      location: event.location,
      link: event.link,
      description: event.description,
      results: event.results,
    };
  }

  protected toInput(f: EventForm): EventInput {
    return {
      title: f.title,
      kind: f.kind,
      startsAt: new Date(f.start).toISOString(),
      endsAt: f.end ? new Date(f.end).toISOString() : null,
      location: f.location,
      link: f.link.trim(),
      description: f.description,
      results: f.results,
    };
  }
}

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { form, FormField, FormRoot, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BOOK_LEVELS, BOOK_STATUSES, type Book, type BookInput } from '../../../../shared/models';
import { FieldError } from '../../ui/field-error';
import { Icon } from '../../ui/icon';
import { ErrorState } from '../../ui/states';
import { LEVEL_META, STATUS_META } from '../books/book-card';
import { EditorBar } from './editor-bar';
import { ResourceEditor } from './resource-editor';

@Component({
  selector: 'app-book-editor',
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
      <a routerLink="/admin/books" class="back-link">
        <app-icon name="arrow-left" /> {{ 'bookEditor.back' | transloco }}
      </a>

      @if (loadError(); as message) {
        <app-error-state [message]="message" (retry)="reload()" />
      } @else if (loading()) {
        <div class="skeleton" style="height: 20rem"></div>
      } @else {
        <form [formRoot]="form" class="stack editor">
          <header class="editor-head">
            <h1>{{ (isNew() ? 'bookEditor.new' : 'bookEditor.edit') | transloco }}</h1>
          </header>

          <div class="form-grid">
            <div class="field span-2">
              <label for="title">{{ 'bookEditor.title' | transloco }}</label>
              <input id="title" class="input title" [formField]="form.title" />
              <app-field-error [field]="form.title" />
            </div>

            <div class="field">
              <label for="author">{{ 'bookEditor.author' | transloco }}</label>
              <input id="author" class="input" [formField]="form.author" />
            </div>

            <div class="field">
              <label for="isbn">
                ISBN <span class="muted">{{ 'common.optional' | transloco }}</span>
              </label>
              <input
                id="isbn"
                class="input"
                inputmode="numeric"
                [formField]="form.isbn"
                placeholder="978…"
              />
              <span class="hint">{{ 'bookEditor.isbnHint' | transloco }}</span>
              <app-field-error [field]="form.isbn" />
            </div>

            <div class="field">
              <label for="level">{{ 'bookEditor.level' | transloco }}</label>
              <select id="level" class="input" [formField]="form.level">
                @for (level of levels; track level) {
                  <option [value]="level">{{ levelMeta[level].label | transloco }}</option>
                }
              </select>
            </div>

            <div class="field">
              <label for="status">{{ 'bookEditor.status' | transloco }}</label>
              <select id="status" class="input" [formField]="form.status">
                @for (status of statuses; track status) {
                  <option [value]="status">{{ statusMeta[status].label | transloco }}</option>
                }
              </select>
            </div>

            @if (model().status === 'on-loan') {
              <div class="field span-2">
                <label for="borrower">{{ 'bookEditor.borrower' | transloco }}</label>
                <input
                  id="borrower"
                  class="input"
                  [formField]="form.borrower"
                  [placeholder]="'bookEditor.borrowerPlaceholder' | transloco"
                />
                <span class="hint"
                  ><app-icon name="lock" /> {{ 'bookEditor.adminOnly' | transloco }}</span
                >
              </div>
            }

            <div class="field span-2">
              <label for="review">{{ 'bookEditor.review' | transloco }}</label>
              <textarea
                id="review"
                class="input"
                [formField]="form.review"
                [placeholder]="'bookEditor.reviewPlaceholder' | transloco"
              ></textarea>
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
    .hint app-icon {
      --icon-size: 0.85rem;
      display: inline-flex;
      vertical-align: -0.1em;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookEditor extends ResourceEditor<'books', BookInput> {
  protected readonly resource = 'books';
  protected readonly levels = BOOK_LEVELS;
  protected readonly statuses = BOOK_STATUSES;
  protected readonly levelMeta = LEVEL_META;
  protected readonly statusMeta = STATUS_META;

  protected readonly form = form(
    this.model,
    (p) => {
      required(p.title, { message: 'bookEditor.titleRequired' });
      pattern(p.isbn, /^[\d\s-]*[\dXx]?$/, {
        message: 'bookEditor.isbnPattern',
      });
    },
    { submission: { action: async () => void (await this.persist()) } },
  );

  protected emptyModel(): BookInput {
    return {
      title: '',
      author: '',
      level: 'beginner',
      isbn: '',
      review: '',
      status: 'available',
      borrower: '',
    };
  }

  protected toModel(book: Book): BookInput {
    const { title, author, level, isbn, review, status, borrower = '' } = book;
    return { title, author, level, isbn, review, status, borrower };
  }

  protected toInput(model: BookInput): BookInput {
    return { ...model, borrower: model.status === 'on-loan' ? model.borrower : '' };
  }
}

import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { BOOK_LEVELS, type Book, type BookLevel } from '../../../../shared/models';
import { ContentApi } from '../../core/content-api';
import { errorMessage, valueOr } from '../../core/errors';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { BookCard, BookDialog, LEVEL_META } from './book-card';

/** Lower case without accents, so "σιαπερας" finds "Σιαπέρας". */
const fold = (text: string) => text.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

@Component({
  selector: 'app-book-list',
  imports: [TranslocoPipe, Icon, BookCard, BookDialog, EmptyState, ErrorState],
  template: `
    <div class="page">
      <header class="page-header">
        <p class="eyebrow">{{ 'books.eyebrow' | transloco }}</p>
        <h1>{{ 'books.title' | transloco }}</h1>
        <p class="lede">{{ 'books.lede' | transloco }}</p>
      </header>

      <div class="toolbar">
        <label class="search">
          <span class="sr-only">{{ 'books.searchLabel' | transloco }}</span>
          <app-icon name="search" />
          <input
            #search
            class="input"
            type="search"
            [placeholder]="'books.searchPlaceholder' | transloco"
            [value]="query()"
            (input)="query.set(search.value)"
          />
        </label>
      </div>

      <div class="chips" role="group" [attr.aria-label]="'books.filterLabel' | transloco">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="level() === 'all'"
          (click)="level.set('all')"
        >
          {{ 'books.allLevels' | transloco }}
          <span class="count">{{ all().length }}</span>
        </button>
        @for (l of levels; track l) {
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="level() === l"
            (click)="level.set(l)"
          >
            {{ levelMeta[l].label | transloco }}
            <span class="count">{{ counts()[l] }}</span>
          </button>
        }
      </div>

      @if (books.error(); as error) {
        <app-error-state [message]="message(error)" (retry)="books.reload()" />
      } @else if (books.isLoading() && books.value().length === 0) {
        <div class="grid">
          @for (i of [1, 2, 3, 4]; track i) {
            <div class="skeleton" style="height: 12.5rem"></div>
          }
        </div>
      } @else {
        <div class="grid">
          @for (book of filtered(); track book.id) {
            <app-book-card [book]="book" (open)="opened.set(book)" />
          } @empty {
            <app-empty-state
              class="span-all"
              icon="book"
              heading="books.empty"
              text="books.emptyText"
            />
          }
        </div>
      }
    </div>

    <app-book-dialog [book]="opened()" (closed)="opened.set(null)" />
  `,
  styles: `
    .toolbar {
      max-width: 32rem;
    }
    .chips {
      margin-bottom: 1.5rem;
    }
    .count {
      margin-left: 0.35rem;
      opacity: 0.6;
      font-variant-numeric: tabular-nums;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 24rem), 1fr));
      gap: 1.25rem;
    }
    .span-all {
      grid-column: 1 / -1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookList {
  protected readonly books = inject(ContentApi).books();
  protected readonly levels = BOOK_LEVELS;
  protected readonly levelMeta = LEVEL_META;
  protected readonly level = signal<BookLevel | 'all'>('all');
  protected readonly query = signal('');
  protected readonly opened = signal<Book | null>(null);
  protected readonly message = errorMessage;

  private readonly all = computed(() => valueOr(this.books, []));

  protected readonly counts = computed(() => {
    const counts: Record<BookLevel, number> = { beginner: 0, intermediate: 0, advanced: 0 };
    for (const book of this.all()) counts[book.level]++;
    return counts;
  });

  protected readonly filtered = computed(() => {
    const level = this.level();
    const words = fold(this.query()).split(/\s+/).filter(Boolean);
    return this.all()
      .filter((b) => {
        if (level !== 'all' && b.level !== level) return false;
        const text = fold(`${b.title} ${b.author}`);
        return words.every((w) => text.includes(w));
      })
      .sort(
        (a, b) =>
          BOOK_LEVELS.indexOf(a.level) - BOOK_LEVELS.indexOf(b.level) ||
          a.title.localeCompare(b.title, 'el'),
      );
  });
}

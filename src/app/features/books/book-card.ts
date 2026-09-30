import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import type { Book, BookLevel, BookStatus } from '../../../../shared/models';
import { Icon, type IconName } from '../../ui/icon';

export const LEVEL_META: Record<BookLevel, { label: string; tone: string }> = {
  beginner: { label: 'level.beginner', tone: 'accent' },
  intermediate: { label: 'level.intermediate', tone: 'blue' },
  advanced: { label: 'level.advanced', tone: 'purple' },
};

export const STATUS_META: Record<
  BookStatus,
  { label: string; tone: string; icon: IconName; hint: string }
> = {
  available: {
    label: 'bookStatus.available',
    tone: 'accent',
    icon: 'check',
    hint: 'books.hint.available',
  },
  'on-loan': {
    label: 'bookStatus.on-loan',
    tone: 'gold',
    icon: 'clock',
    hint: 'books.hint.on-loan',
  },
  wishlist: { label: 'bookStatus.wishlist', tone: '', icon: 'star', hint: 'books.hint.wishlist' },
};

/** Soft cover colours for books without a cover image. */
const COVER_HUES = [150, 25, 210, 280, 45, 340];

/** The Open Library cover for an ISBN, or a drawn cover when there is none. */
@Component({
  selector: 'app-book-cover',
  imports: [TranslocoPipe],
  template: `
    @let b = book();
    <div class="cover" [style.--hue]="hue()">
      @if (url() && !failed()) {
        <img
          [src]="url()"
          [alt]="'books.coverOf' | transloco: { title: b.title }"
          loading="lazy"
          (error)="failed.set(true)"
        />
      } @else {
        <span class="glyph" aria-hidden="true">♞</span>
        <span class="title">{{ b.title }}</span>
        <span class="author">{{ b.author }}</span>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cover {
      position: relative;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      gap: 0.3em;
      aspect-ratio: 2 / 3;
      padding: 0.6em 0.6em 0.7em 0.8em;
      border-radius: 3px 7px 7px 3px;
      background:
        linear-gradient(
          90deg,
          rgb(0 0 0 / 0.22) 0 5%,
          rgb(255 255 255 / 0.08) 5% 6.5%,
          transparent 6.5%
        ),
        linear-gradient(160deg, hsl(var(--hue) 38% 40%), hsl(var(--hue) 42% 22%));
      color: hsl(var(--hue) 30% 95%);
      box-shadow: var(--shadow-md);
      overflow: hidden;
      font-size: var(--cover-font, 0.75rem);
    }
    .cover:has(img) {
      padding: 0;
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .glyph {
      position: absolute;
      top: 0.1em;
      right: 0.1em;
      font-size: 3.6em;
      line-height: 1;
      opacity: 0.16;
    }
    .title,
    .author {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      overflow: hidden;
      overflow-wrap: anywhere;
    }
    .title {
      font-family: var(--font-display);
      font-weight: 650;
      font-size: 1em;
      line-height: 1.2;
      -webkit-line-clamp: 4;
    }
    .author {
      font-size: 0.8em;
      line-height: 1.3;
      opacity: 0.8;
      -webkit-line-clamp: 2;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCover {
  readonly book = input.required<Book>();
  protected readonly failed = signal(false);
  protected readonly hue = computed(() => COVER_HUES[this.book().id % COVER_HUES.length]);
  /** Open Library returns a 404 (not a blank image) for unknown ISBNs with default=false. */
  protected readonly url = computed(() => {
    const isbn = this.book().isbn;
    return isbn ? `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg?default=false` : null;
  });
}

/** Level and availability, as quiet text rather than a row of badges. */
@Component({
  selector: 'app-book-meta',
  imports: [TranslocoPipe, Icon],
  template: `
    <span class="level" [attr.data-tone]="level().tone">
      <span class="dot" aria-hidden="true"></span>{{ level().label | transloco }}
    </span>
    <span class="status" [attr.data-tone]="status().tone">
      <app-icon [name]="status().icon" /> {{ status().label | transloco }}
    </span>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 0.25rem 0.9rem;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
      --icon-size: 0.9rem;
    }
    span {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--tone);
    }
    [data-tone] {
      --tone: var(--text-muted);
    }
    [data-tone='accent'] {
      --tone: var(--accent);
    }
    [data-tone='blue'] {
      --tone: var(--blue);
    }
    [data-tone='purple'] {
      --tone: var(--purple);
    }
    .status[data-tone='accent'] {
      color: var(--accent-text);
    }
    .status[data-tone='gold'] {
      color: var(--gold);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookMeta {
  readonly book = input.required<Book>();
  protected readonly level = computed(() => LEVEL_META[this.book().level]);
  protected readonly status = computed(() => STATUS_META[this.book().status]);
}

@Component({
  selector: 'app-book-card',
  imports: [Icon, TranslocoPipe, BookCover, BookMeta],
  template: `
    @let b = book();
    <article class="card book">
      <app-book-cover [book]="b" class="cover" />
      <div class="body">
        <h3>
          <button type="button" class="open" (click)="open.emit()">{{ b.title }}</button>
        </h3>
        @if (b.author) {
          <p class="author">{{ b.author }}</p>
        }
        <app-book-meta [book]="b" />
        @if (b.review) {
          <p class="review">{{ b.review }}</p>
        }
        <span class="more" aria-hidden="true">
          {{ 'books.details' | transloco }} <app-icon name="chevron-right" />
        </span>
      </div>
    </article>
  `,
  styles: `
    :host {
      display: block;
    }
    .book {
      position: relative;
      display: grid;
      grid-template-columns: 6.5rem minmax(0, 1fr);
      gap: 1.1rem;
      height: 100%;
      padding: 1.1rem;
      transition:
        box-shadow 0.18s,
        border-color 0.18s,
        transform 0.18s;

      &:hover {
        border-color: var(--border-strong);
        box-shadow: var(--shadow-md);
        transform: translateY(-2px);
      }
      &:has(.open:focus-visible) {
        outline: 2px solid var(--accent);
        outline-offset: 2px;
      }
    }
    .cover {
      align-self: start;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 0;
    }
    h3 {
      margin: 0;
      font-size: 1.15rem;
      line-height: 1.3;
    }
    .open {
      padding: 0;
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      text-align: start;
      cursor: pointer;

      &:focus-visible {
        outline: none;
      }
      /* The whole card is the click target. */
      &::after {
        content: '';
        position: absolute;
        inset: 0;
      }
    }
    .author {
      margin: 0;
      font-size: 0.9rem;
      color: var(--text-muted);
    }
    .review {
      display: -webkit-box;
      -webkit-box-orient: vertical;
      -webkit-line-clamp: 3;
      overflow: hidden;
      margin: 0.2rem 0 0;
      font-size: 0.92rem;
      line-height: 1.55;
    }
    .more {
      display: inline-flex;
      align-items: center;
      gap: 0.15rem;
      margin-top: auto;
      padding-top: 0.2rem;
      color: var(--accent-text);
      font-size: 0.88rem;
      font-weight: 650;
      --icon-size: 0.95rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookCard {
  readonly book = input.required<Book>();
  readonly open = output();
}

/** Full details of one book in a modal dialog. */
@Component({
  selector: 'app-book-dialog',
  imports: [TranslocoPipe, Icon, BookCover, BookMeta],
  template: `
    <dialog
      #dialog
      (close)="closed.emit()"
      (click)="backdropClick($event)"
      aria-labelledby="book-title"
    >
      @if (book(); as b) {
        <button
          type="button"
          class="btn btn-ghost btn-icon btn-sm close"
          (click)="dialog.close()"
          [attr.aria-label]="'common.close' | transloco"
        >
          <app-icon name="x" />
        </button>
        <div class="top">
          <app-book-cover [book]="b" class="cover" />
          <div class="info">
            <h2 id="book-title">{{ b.title }}</h2>
            @if (b.author) {
              <p class="author">{{ b.author }}</p>
            }
            <app-book-meta [book]="b" />
            @if (b.isbn) {
              <p class="isbn">ISBN {{ b.isbn }}</p>
            }
          </div>
        </div>
        @if (b.review) {
          <h3 class="label">{{ 'books.reviewHeading' | transloco }}</h3>
          <p class="review">{{ b.review }}</p>
        }
        <p class="hint"><app-icon name="info" /> {{ status(b).hint | transloco }}</p>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(calc(100% - 2rem), 36rem);
      max-height: calc(100dvh - 2rem);
      padding: 1.5rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-lg);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.45);
      backdrop-filter: blur(2px);
    }
    .close {
      position: absolute;
      top: 0.75rem;
      right: 0.75rem;
    }
    .top {
      display: grid;
      grid-template-columns: 7.5rem minmax(0, 1fr);
      gap: 1.25rem;
      align-items: start;
      padding-right: 2rem;
      --cover-font: 0.85rem;

      @media (max-width: 30rem) {
        grid-template-columns: 5.5rem minmax(0, 1fr);
        gap: 1rem;
        --cover-font: 0.7rem;
      }
    }
    .info {
      display: grid;
      gap: 0.5rem;
    }
    h2 {
      margin: 0;
      font-size: 1.4rem;
      line-height: 1.25;
    }
    .author,
    .isbn {
      margin: 0;
      color: var(--text-muted);
    }
    .isbn {
      font-size: 0.8rem;
      font-variant-numeric: tabular-nums;
    }
    .label {
      margin: 1.25rem 0 0.4rem;
      font-family: var(--font-sans);
      font-size: 0.78rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--text-muted);
    }
    .review {
      margin: 0;
      line-height: 1.65;
      white-space: pre-line;
    }
    .hint {
      display: flex;
      gap: 0.5rem;
      margin: 1.25rem 0 0;
      padding: 0.75rem 0.9rem;
      border-radius: var(--radius-sm);
      background: var(--surface-2);
      font-size: 0.9rem;
      --icon-size: 1.05rem;

      app-icon {
        margin-top: 0.1rem;
        color: var(--accent-text);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BookDialog {
  readonly book = input<Book | null>(null);
  readonly closed = output();

  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly status = (b: Book) => STATUS_META[b.status];

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.book() && !dialog.open) dialog.showModal();
      if (!this.book() && dialog.open) dialog.close();
    });
  }

  /** Clicks on the backdrop land on the dialog element itself. */
  protected backdropClick(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const inside =
      event.clientX >= box.left &&
      event.clientX <= box.right &&
      event.clientY >= box.top &&
      event.clientY <= box.bottom;
    if (!inside) dialog.close();
  }
}

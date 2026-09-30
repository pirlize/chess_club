import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { AdminApi, type AdminResource, type AdminResources } from '../../core/admin-api';
import { errorMessage, valueOr } from '../../core/errors';
import { ClubDatePipe, formatDate } from '../../core/format';
import { Language } from '../../core/i18n';
import { Icon, type IconName } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { LEVEL_META, STATUS_META } from '../books/book-card';
import { EVENT_KIND_META } from '../events/event-meta';
import { CATEGORY_META, gameTitle } from '../games/game-card';

interface Row {
  title: string;
  subtitle: string;
  /** undefined for resources without a draft state. */
  draft?: boolean;
}

interface DescribeContext {
  t(key: string, params?: Record<string, unknown>): string;
  locale: string;
}

/** Texts come from the "admin.list.<resource>" translation keys. */
export interface AdminListConfig<R extends AdminResource = AdminResource> {
  resource: R;
  icon: IconName;
  describe(item: AdminResources[R]['summary'], ctx: DescribeContext): Row;
}

const config = <R extends AdminResource>(c: AdminListConfig<R>) => c;
const join = (...parts: (string | null | false | undefined)[]) => parts.filter(Boolean).join(' · ');

export const ADMIN_LISTS = {
  games: config({
    resource: 'games',
    icon: 'board',
    describe: (g, { t, locale }) => ({
      title: gameTitle(g),
      subtitle: join(
        t(CATEGORY_META[g.category].label),
        g.event,
        g.playedOn && formatDate(g.playedOn, 'date', locale),
      ),
      draft: !g.published,
    }),
  }),
  posts: config({
    resource: 'posts',
    icon: 'news',
    describe: (p, { t }) => ({
      title: p.title,
      subtitle: join(`/blog/${p.slug}`, t('blog.minRead', { n: p.readingMinutes })),
      draft: !p.published,
    }),
  }),
  events: config({
    resource: 'events',
    icon: 'calendar',
    describe: (e, { t, locale }) => ({
      title: e.title,
      subtitle: join(
        t(EVENT_KIND_META[e.kind].label),
        `${formatDate(e.startsAt, 'day', locale)} ${formatDate(e.startsAt, 'time', locale)}`,
        e.location,
      ),
    }),
  }),
  books: config({
    resource: 'books',
    icon: 'book',
    describe: (b, { t }) => ({
      title: b.title,
      subtitle: join(
        b.author,
        t(LEVEL_META[b.level].label),
        b.status === 'on-loan' && b.borrower
          ? t('admin.onLoanTo', { name: b.borrower })
          : t(STATUS_META[b.status].label),
      ),
    }),
  }),
} satisfies { [R in AdminResource]: AdminListConfig<R> };

@Component({
  selector: 'app-admin-list',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe, Icon, EmptyState, ErrorState],
  template: `
    @let r = list().resource;
    <div class="page">
      <header class="head">
        <h1>{{ 'admin.' + r | transloco }}</h1>
        <a routerLink="new" class="btn btn-primary">
          <app-icon name="plus" /> {{ 'admin.list.' + r + '.new' | transloco }}
        </a>
      </header>

      @if (count() > 8) {
        <label class="search toolbar">
          <span class="sr-only">{{ 'common.search' | transloco }}</span>
          <app-icon name="search" />
          <input
            #q
            class="input"
            type="search"
            [placeholder]="'admin.search' | transloco"
            (input)="query.set(q.value)"
          />
        </label>
      }

      @if (items.error(); as error) {
        <app-error-state [message]="message(error)" (retry)="items.reload()" />
      } @else if (items.isLoading() && items.value().length === 0) {
        <div class="stack">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton" style="height: 4rem"></div>
          }
        </div>
      } @else if (rows().length === 0 && !query()) {
        <app-empty-state
          [icon]="list().icon"
          [heading]="'admin.list.' + r + '.empty'"
          [text]="'admin.list.' + r + '.emptyText'"
        >
          <a routerLink="new" class="btn btn-primary">
            <app-icon name="plus" /> {{ 'admin.list.' + r + '.new' | transloco }}
          </a>
        </app-empty-state>
      } @else {
        <ul class="rows card">
          @for (row of rows(); track row.id) {
            <li>
              <a [routerLink]="[row.id]" class="row">
                <span class="main">
                  <strong>{{ row.title }}</strong>
                  <span class="sub">{{ row.subtitle }}</span>
                </span>
                @if (row.draft === true) {
                  <span class="badge" data-tone="gold">{{ 'admin.draft' | transloco }}</span>
                } @else if (row.draft === false) {
                  <span class="badge" data-tone="accent">{{ 'admin.published' | transloco }}</span>
                }
                <span class="updated">{{ row.updatedAt | clubDate: 'relative' }}</span>
                <app-icon name="chevron-right" class="chev" />
              </a>
            </li>
          } @empty {
            <li class="none">{{ 'admin.noMatch' | transloco: { q: query() } }}</li>
          }
        </ul>
      }
    </div>
  `,
  styles: `
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.25rem;
    }
    h1 {
      margin: 0;
      font-size: 1.9rem;
    }
    .search {
      display: block;
    }
    .rows {
      list-style: none;
      margin: 0;
      padding: 0;
      overflow: hidden;
    }
    li + li {
      border-top: 1px solid var(--border);
    }
    .row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.85rem 1rem;
      color: inherit;
      text-decoration: none;
      transition: background-color 0.12s;
    }
    .row:hover {
      background: var(--surface-hover);
    }
    .main {
      flex: 1;
      display: grid;
      gap: 0.1rem;
      min-width: 0;
    }
    .main strong,
    .sub {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .sub {
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .updated {
      display: none;
      font-size: 0.8rem;
      color: var(--text-muted);
      white-space: nowrap;
    }
    @media (min-width: 40rem) {
      .updated {
        display: inline;
      }
    }
    .chev {
      color: var(--text-faint);
    }
    .none {
      padding: 1.25rem 1rem;
      color: var(--text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminList {
  /** Bound from route data. */
  readonly list = input.required<AdminListConfig>();

  private readonly language = inject(Language);
  protected readonly items = inject(AdminApi).list(() => this.list().resource);
  protected readonly count = computed(() => valueOr(this.items, []).length);
  protected readonly query = signal('');
  protected readonly message = errorMessage;

  protected readonly rows = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const list = this.list();
    this.language.current(); // re-describe rows when the language changes
    const ctx: DescribeContext = {
      t: (key, params) => this.language.t(key, params),
      locale: this.language.locale(),
    };
    return valueOr(this.items, [])
      .map((item) => ({ id: item.id, updatedAt: item.updatedAt, ...list.describe(item, ctx) }))
      .filter((row) =>
        words.every((w) => `${row.title} ${row.subtitle}`.toLowerCase().includes(w)),
      );
  });
}

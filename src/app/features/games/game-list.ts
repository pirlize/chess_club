import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { GameCategory } from '../../../../shared/models';
import { ContentApi } from '../../core/content-api';
import { errorMessage, valueOr } from '../../core/errors';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { CATEGORY_OPTIONS, GameCard } from './game-card';

@Component({
  selector: 'app-game-list',
  imports: [RouterLink, TranslocoPipe, GameCard, Icon, EmptyState, ErrorState],
  template: `
    <div class="page">
      <header class="page-header head">
        <div>
          <p class="eyebrow">{{ 'games.eyebrow' | transloco }}</p>
          <h1>{{ 'games.title' | transloco }}</h1>
          <p class="lede">{{ 'games.lede' | transloco }}</p>
        </div>
        <a routerLink="/analysis" class="btn btn-secondary">
          <app-icon name="analysis" /> {{ 'games.analysisBoard' | transloco }}
        </a>
      </header>

      <div class="toolbar">
        <label class="search">
          <span class="sr-only">{{ 'games.searchLabel' | transloco }}</span>
          <app-icon name="search" />
          <input
            #search
            class="input"
            type="search"
            [placeholder]="'games.searchPlaceholder' | transloco"
            [value]="query()"
            (input)="query.set(search.value)"
          />
        </label>
      </div>

      <div class="chips" role="group" [attr.aria-label]="'games.filterLabel' | transloco">
        <button
          type="button"
          class="chip"
          [attr.aria-pressed]="category() === 'all'"
          (click)="category.set('all')"
        >
          {{ 'games.all' | transloco }}
        </button>
        @for (c of categories; track c.value) {
          <button
            type="button"
            class="chip"
            [attr.aria-pressed]="category() === c.value"
            (click)="category.set(c.value)"
          >
            {{ c.plural | transloco }}
          </button>
        }
      </div>

      <div class="results">
        @if (games.error(); as error) {
          <app-error-state [message]="message(error)" (retry)="games.reload()" />
        } @else if (games.isLoading() && games.value().length === 0) {
          <div class="card-grid">
            @for (i of [1, 2, 3, 4]; track i) {
              <div class="skeleton" style="height: 8.25rem"></div>
            }
          </div>
        } @else {
          @if (filtered().length) {
            <p class="count">
              @if (filtered().length === 1) {
                {{ 'games.countOne' | transloco }}
              } @else {
                {{ 'games.count' | transloco: { n: filtered().length } }}
              }
            </p>
          }
          <div class="card-grid">
            @for (game of filtered(); track game.id) {
              <app-game-card [game]="game" />
            } @empty {
              <app-empty-state
                class="span-all"
                icon="board"
                [heading]="games.value().length ? 'games.noMatch' : 'games.empty'"
                [text]="games.value().length ? 'games.noMatchText' : 'games.emptyText'"
              />
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: `
    .head {
      display: flex;
      flex-wrap: wrap;
      align-items: flex-end;
      justify-content: space-between;
      gap: 1rem;
    }
    .chips {
      margin-bottom: 1.25rem;
    }
    .count {
      margin: 0 0 0.75rem;
      font-size: 0.85rem;
      color: var(--text-muted);
    }
    .span-all {
      grid-column: 1 / -1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameList {
  protected readonly games = inject(ContentApi).games();
  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly query = signal('');
  protected readonly category = signal<GameCategory | 'all'>('all');
  protected readonly message = errorMessage;

  protected readonly filtered = computed(() => {
    const words = this.query().toLowerCase().split(/\s+/).filter(Boolean);
    const category = this.category();
    return valueOr(this.games, []).filter((g) => {
      if (category !== 'all' && g.category !== category) return false;
      const haystack = [g.title, g.white, g.black, g.event, g.opening, g.eco]
        .join(' ')
        .toLowerCase();
      return words.every((w) => haystack.includes(w));
    });
  });
}

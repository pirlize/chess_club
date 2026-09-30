import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { translate, TranslocoPipe } from '@jsverse/transloco';
import { GAME_CATEGORIES, type GameCategory, type GameSummary } from '../../../../shared/models';
import { BoardThumbnail } from '../../chess/board/board';
import { ClubDatePipe, ResultPipe } from '../../core/format';

/** Labels are translation keys. */
export const CATEGORY_META: Record<GameCategory, { label: string; plural: string; tone: string }> =
  {
    club: { label: 'category.club', plural: 'categoryPlural.club', tone: 'accent' },
    lesson: { label: 'category.lesson', plural: 'categoryPlural.lesson', tone: 'blue' },
    tournament: { label: 'category.tournament', plural: 'categoryPlural.tournament', tone: 'gold' },
    classic: { label: 'category.classic', plural: 'categoryPlural.classic', tone: 'purple' },
  };

export const CATEGORY_OPTIONS = GAME_CATEGORIES.map((value) => ({
  value,
  ...CATEGORY_META[value],
}));

/** The game's title, or "White – Black" in the active language. */
export const gameTitle = (g: Pick<GameSummary, 'title' | 'white' | 'black'>) =>
  g.title || translate('games.vs', { white: g.white, black: g.black });

@Component({
  selector: 'app-game-card',
  imports: [RouterLink, TranslocoPipe, BoardThumbnail, ClubDatePipe, ResultPipe],
  template: `
    @let g = game();
    <a class="card game-card" [routerLink]="['/games', g.id]">
      <div class="thumb">
        @defer (on viewport) {
          <app-board-thumbnail
            [fen]="g.finalFen"
            [label]="'games.finalPosition' | transloco: { title: title() }"
          />
        } @placeholder {
          <div class="thumb-placeholder"></div>
        }
      </div>
      <div class="body">
        <div class="meta">
          <span class="badge" [attr.data-tone]="category().tone">{{
            category().label | transloco
          }}</span>
          @if (g.playedOn) {
            <span class="date">{{ g.playedOn | clubDate }}</span>
          }
        </div>
        @if (g.title) {
          <h3 class="title">{{ g.title }}</h3>
        }
        <div class="players">
          <div class="player">
            <span class="piece-dot white"></span><span>{{ g.white }}</span>
          </div>
          <div class="player">
            <span class="piece-dot black"></span><span>{{ g.black }}</span>
          </div>
        </div>
        <div class="foot">
          <span class="result">{{ g.result | result }}</span>
          @if (g.opening || g.event) {
            <span class="sep" aria-hidden="true">·</span>
            <span class="context">{{ g.opening || g.event }}</span>
          }
        </div>
      </div>
    </a>
  `,
  styles: `
    .game-card {
      display: grid;
      grid-template-columns: 6.75rem minmax(0, 1fr);
      gap: 1rem;
      padding: 0.75rem;
      height: 100%;
    }
    .thumb,
    .thumb-placeholder {
      aspect-ratio: 1;
      border-radius: var(--radius-sm);
    }
    .thumb-placeholder {
      background: repeating-conic-gradient(var(--sq-dark) 0 25%, var(--sq-light) 0 50%) 0 0 / 25%
        25%;
      opacity: 0.35;
    }
    .body {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      min-width: 0;
      padding-block: 0.1rem;
    }
    .meta {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }
    .date {
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .title {
      margin: 0;
      font-size: 1.05rem;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .players {
      font-size: 0.93rem;
    }
    .foot {
      margin-top: auto;
      display: flex;
      gap: 0.4rem;
      font-size: 0.82rem;
      color: var(--text-muted);
      min-width: 0;
    }
    .result {
      font-weight: 700;
      color: var(--text);
      font-variant-numeric: tabular-nums;
    }
    .context {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameCard {
  readonly game = input.required<GameSummary>();
  protected readonly category = computed(() => CATEGORY_META[this.game().category]);
  protected readonly title = computed(() => gameTitle(this.game()));
}

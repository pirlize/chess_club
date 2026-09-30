import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Progress } from '../../core/progress';
import { Icon } from '../../ui/icon';

/** "You are a Knight · 23 stars · 4-day streak", with progress to the next rank. */
@Component({
  selector: 'app-progress-card',
  imports: [TranslocoPipe, Icon],
  template: `
    @let rank = progress.rank();
    <div class="card progress">
      <span class="symbol" aria-hidden="true">{{ rank.symbol }}</span>
      <div class="main">
        <p class="label">{{ 'learn.yourRank' | transloco }}</p>
        <p class="rank">{{ 'rank.' + rank.id | transloco }}</p>
        @if (progress.nextRank(); as next) {
          <div
            class="bar"
            role="progressbar"
            [attr.aria-valuenow]="progress.stars()"
            [attr.aria-valuemax]="next.stars"
          >
            <span [style.width.%]="next.progress * 100"></span>
          </div>
          <p class="next">
            {{
              'learn.nextRank'
                | transloco
                  : { stars: next.stars - progress.stars(), rank: ('rank.' + next.id | transloco) }
            }}
          </p>
        } @else {
          <p class="next">{{ 'learn.topRank' | transloco }}</p>
        }
      </div>
      <div class="stats">
        <span class="stat"><app-icon name="star" /> {{ progress.stars() }}</span>
        <span class="stat" [class.hot]="progress.streak() > 0">
          <app-icon name="flame" /> {{ 'learn.streak' | transloco: { n: progress.streak() } }}
        </span>
      </div>
    </div>
  `,
  styles: `
    .progress {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      gap: 0.25rem 1rem;
      align-items: center;
      padding: 1.1rem 1.25rem;
      background:
        radial-gradient(
          120% 140% at 0% 0%,
          color-mix(in srgb, var(--gold) 16%, transparent),
          transparent 60%
        ),
        var(--surface);

      @media (min-width: 40rem) {
        grid-template-columns: auto minmax(0, 1fr) auto;
      }
    }
    .symbol {
      display: grid;
      place-items: center;
      width: 3.5rem;
      height: 3.5rem;
      border-radius: 50%;
      background: var(--gold-soft);
      color: var(--gold);
      font-size: 2.2rem;
      line-height: 1;
    }
    .label,
    .next {
      margin: 0;
      font-size: 0.8rem;
      color: var(--text-muted);
    }
    .rank {
      margin: 0 0 0.35rem;
      font-family: var(--font-display);
      font-size: 1.4rem;
      font-weight: 650;
    }
    .bar {
      height: 6px;
      border-radius: 999px;
      background: var(--surface-2);
      overflow: hidden;
      margin-bottom: 0.3rem;

      span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: var(--gold);
        transition: width 0.4s ease-out;
      }
    }
    .stats {
      grid-column: 1 / -1;
      display: flex;
      gap: 0.5rem;

      @media (min-width: 40rem) {
        grid-column: auto;
        flex-direction: column;
        align-items: flex-end;
      }
    }
    .stat {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      padding: 0.3rem 0.7rem;
      border-radius: 999px;
      background: var(--surface-2);
      font-weight: 700;
      font-size: 0.9rem;
      --icon-size: 1rem;

      app-icon {
        color: var(--gold);
      }
      &.hot app-icon {
        color: var(--nag-mistake);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProgressCard {
  protected readonly progress = inject(Progress);
}

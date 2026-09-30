import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Language } from '../../core/i18n';
import { PRACTICE_THEMES, THEME_GLYPHS } from '../../core/lichess';
import { Progress } from '../../core/progress';
import { Icon } from '../../ui/icon';
import { exerciseCount, LESSONS } from './lessons';
import { ProgressCard } from './progress-card';

/** Entry point for learners: the beginner course, puzzles and practice tools. */
@Component({
  selector: 'app-learn-hub',
  imports: [RouterLink, TranslocoPipe, Icon, ProgressCard],
  template: `
    <div class="page hub" [class.beginner]="doneCount() < lessons.length">
      <header class="page-header">
        <p class="eyebrow">{{ 'learn.eyebrow' | transloco }}</p>
        <h1>{{ 'learn.title' | transloco }}</h1>
        <p class="lede">{{ 'learn.lede' | transloco }}</p>
      </header>

      <app-progress-card />

      <section class="section tactics" aria-labelledby="tactics">
        <div class="section-head">
          <h2 id="tactics">{{ 'learn.tacticsTitle' | transloco }}</h2>
          <a routerLink="/learn/puzzles" fragment="practice">{{
            'learn.tacticsAll' | transloco
          }}</a>
        </div>
        <p class="muted intro">{{ 'learn.tacticsText' | transloco }}</p>
        <div class="tactic-grid">
          @for (t of tactics; track t) {
            <a
              class="card tactic"
              routerLink="/learn/puzzles"
              [queryParams]="{ theme: t }"
              fragment="practice"
            >
              <span class="glyph" aria-hidden="true">{{ glyphs[t] }}</span>
              <strong>{{ 'theme.' + t | transloco }}</strong>
              <span class="desc">{{ 'tactic.' + t | transloco }}</span>
            </a>
          }
        </div>
      </section>

      <section class="section practice" aria-labelledby="practice">
        <h2 id="practice" class="group">{{ 'learn.practice' | transloco }}</h2>
        <div class="tools">
          <a routerLink="/learn/puzzles" class="card tool featured">
            <span class="tool-icon"><app-icon name="sparkle" /></span>
            <strong>{{ 'learn.dailyTitle' | transloco }}</strong>
            <span>
              @if (progress.dailySolvedToday()) {
                {{ 'learn.dailyDone' | transloco }}
              } @else {
                {{ 'learn.dailyText' | transloco }}
              }
            </span>
          </a>
          <a routerLink="/games" class="card tool">
            <span class="tool-icon"><app-icon name="board" /></span>
            <strong>{{ 'learn.guessTitle' | transloco }}</strong>
            <span>{{ 'learn.guessText' | transloco }}</span>
          </a>
          <a routerLink="/analysis" class="card tool">
            <span class="tool-icon"><app-icon name="analysis" /></span>
            <strong>{{ 'learn.analysisTitle' | transloco }}</strong>
            <span>{{ 'learn.analysisText' | transloco }}</span>
          </a>
          <a routerLink="/books" class="card tool">
            <span class="tool-icon"><app-icon name="book" /></span>
            <strong>{{ 'learn.booksTitle' | transloco }}</strong>
            <span>{{ 'learn.booksText' | transloco }}</span>
          </a>
        </div>
      </section>

      <section class="section basics" aria-labelledby="basics">
        <div class="section-head">
          <h2 id="basics">{{ 'learn.basicsTitle' | transloco }}</h2>
          <span class="muted done">{{
            'learn.lessonsDone' | transloco: { done: doneCount(), total: lessons.length }
          }}</span>
        </div>
        <p class="muted intro">{{ 'learn.basicsText' | transloco }}</p>
        <ol class="lessons">
          @for (lesson of lessons; track lesson.slug; let i = $index) {
            <li>
              <a
                class="card lesson"
                [routerLink]="['/learn', lesson.slug]"
                [class.done]="progress.lessons().has(lesson.slug)"
              >
                <span class="number">
                  @if (progress.lessons().has(lesson.slug)) {
                    <app-icon name="check" />
                  } @else {
                    {{ i + 1 }}
                  }
                </span>
                <span class="text">
                  <strong>{{ lesson.title[lang()] }}</strong>
                  <span>{{ lesson.summary[lang()] }}</span>
                </span>
                @if (exercises(lesson); as n) {
                  <span class="badge" data-tone="gold"><app-icon name="star" /> {{ n }}</span>
                }
                <app-icon name="chevron-right" class="chev" />
              </a>
            </li>
          }
        </ol>
      </section>
    </div>
  `,
  styles: `
    /* Tactics come right after the progress card. Beginners then see the
       lessons; once those are done, the practice tools lead. */
    .hub {
      display: flex;
      flex-direction: column;
    }
    .page-header {
      order: 1;
    }
    app-progress-card {
      order: 2;
    }
    .tactics {
      order: 3;
    }
    .practice {
      order: 4;
    }
    .basics {
      order: 5;
    }
    .hub.beginner .basics {
      order: 4;
    }
    .hub.beginner .practice {
      order: 5;
    }
    /* Phones: one swipeable row. Wider screens: a grid. */
    .tactic-grid {
      display: grid;
      grid-auto-flow: column;
      grid-auto-columns: 12.5rem;
      gap: 0.75rem;
      margin-inline: calc(-1 * var(--gutter));
      padding: 0.25rem var(--gutter) 0.5rem;
      overflow-x: auto;
      scroll-snap-type: x mandatory;
      scroll-padding-inline: var(--gutter);
      scrollbar-width: none;

      &::-webkit-scrollbar {
        display: none;
      }

      @media (min-width: 48rem) {
        grid-auto-flow: row;
        grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
        margin-inline: 0;
        padding: 0;
        overflow: visible;
      }
    }
    .tactic {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr);
      align-content: start;
      gap: 0.15rem 0.75rem;
      padding: 0.9rem 1rem;
      scroll-snap-align: start;

      strong {
        align-self: center;
        font-size: 0.98rem;
        line-height: 1.3;
      }
    }
    /* Phones: symbol on top, so every card in the row reads the same. */
    @media (max-width: 47.99rem) {
      .tactic {
        grid-template-columns: 1fr;
        gap: 0.2rem;
      }
      .tactic .glyph {
        grid-row: auto;
        margin-bottom: 0.35rem;
      }
      .tactic .desc {
        display: -webkit-box;
        -webkit-box-orient: vertical;
        -webkit-line-clamp: 4;
        overflow: hidden;
      }
    }
    .glyph {
      grid-row: span 2;
      display: grid;
      place-items: center;
      width: 2.6rem;
      height: 2.6rem;
      border-radius: 50%;
      background: var(--gold-soft);
      color: var(--gold);
      font-size: 1.6rem;
      line-height: 1;
    }
    .desc {
      font-size: 0.83rem;
      line-height: 1.4;
      color: var(--text-muted);
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
    .tools {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 10rem), 1fr));
      gap: 0.85rem;
    }
    .tool {
      display: grid;
      gap: 0.3rem;
      padding: 1.1rem;
      align-content: start;

      strong {
        font-size: 1.05rem;
      }
      span:last-child {
        font-size: 0.88rem;
        color: var(--text-muted);
      }
    }
    .tool.featured {
      border-color: color-mix(in srgb, var(--gold) 45%, var(--border));
      background:
        radial-gradient(
          100% 120% at 100% 0%,
          color-mix(in srgb, var(--gold) 14%, transparent),
          transparent 60%
        ),
        var(--surface);
    }
    .tool-icon {
      display: grid;
      place-items: center;
      width: 2.4rem;
      height: 2.4rem;
      margin-bottom: 0.25rem;
      border-radius: var(--radius-sm);
      background: var(--accent-soft);
      color: var(--accent-text);
    }
    .featured .tool-icon {
      background: var(--gold-soft);
      color: var(--gold);
    }
    .done {
      font-size: 0.85rem;
    }
    .intro {
      margin: -0.5rem 0 1rem;
    }
    .lessons {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 0.6rem;
    }
    .lesson {
      display: flex;
      align-items: center;
      gap: 0.9rem;
      padding: 0.85rem 1rem;
    }
    .number {
      display: grid;
      place-items: center;
      flex: none;
      width: 2.25rem;
      height: 2.25rem;
      border-radius: 50%;
      background: var(--surface-2);
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      --icon-size: 1.1rem;
    }
    .lesson.done .number {
      background: var(--accent);
      color: var(--on-accent);
    }
    .text {
      flex: 1;
      display: grid;
      gap: 0.1rem;
      min-width: 0;

      span {
        font-size: 0.88rem;
        color: var(--text-muted);
      }
    }
    .badge {
      --icon-size: 0.8rem;
    }
    .chev {
      color: var(--text-faint);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LearnHub {
  protected readonly progress = inject(Progress);
  protected readonly tactics = PRACTICE_THEMES;
  protected readonly glyphs = THEME_GLYPHS;
  protected readonly lang = inject(Language).current;
  protected readonly lessons = LESSONS;
  protected readonly exercises = exerciseCount;
  protected readonly doneCount = computed(
    () => LESSONS.filter((l) => this.progress.lessons().has(l.slug)).length,
  );
}

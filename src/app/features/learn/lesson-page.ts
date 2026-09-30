import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  linkedSignal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { BoardThumbnail } from '../../chess/board/board';
import { PuzzleBoard } from '../../chess/puzzle-board/puzzle-board';
import { MarkdownPipe } from '../../core/format';
import { SanTextPipe } from '../../core/notation';
import { Language } from '../../core/i18n';
import { Progress } from '../../core/progress';
import { pageTitle } from '../../core/title';
import { Toaster } from '../../core/toaster';
import { Icon } from '../../ui/icon';
import { EmptyState } from '../../ui/states';
import { exerciseCount, lessonBySlug, LESSONS } from './lessons';

/** One beginner lesson: explanations with boards, and small exercises. */
@Component({
  selector: 'app-lesson-page',
  imports: [
    RouterLink,
    TranslocoPipe,
    MarkdownPipe,
    SanTextPipe,
    BoardThumbnail,
    PuzzleBoard,
    Icon,
    EmptyState,
  ],
  template: `
    <div class="page page-narrow">
      <a routerLink="/learn" class="back-link">
        <app-icon name="arrow-left" /> {{ 'learn.title' | transloco }}
      </a>

      @if (lesson(); as l) {
        <header class="page-header">
          <p class="eyebrow">
            {{ 'learn.lessonOf' | transloco: { n: index() + 1, total: total } }}
          </p>
          <h1>{{ l.title[lang()] }}</h1>
          <p class="lede">{{ l.summary[lang()] }}</p>
        </header>

        <ol class="steps">
          @for (step of l.steps; track $index; let i = $index) {
            <li class="step card">
              <div class="prose text" [innerHTML]="step.text[lang()] | sanText | markdown"></div>
              @if (step.exercise; as ex) {
                <div class="exercise">
                  <p class="task">
                    <app-icon name="sparkle" /> {{ ex.task[lang()] | sanText }}
                    @if (solved().has(i)) {
                      <span class="badge" data-tone="accent"><app-icon name="check" /></span>
                    }
                  </p>
                  <app-puzzle-board
                    [fen]="ex.fen"
                    [solution]="ex.solution"
                    [anyMate]="ex.anyMate ?? false"
                    (solved)="markSolved(i)"
                  />
                </div>
              } @else if (step.fen) {
                <app-board-thumbnail
                  class="illustration"
                  [fen]="step.fen"
                  [shapes]="step.shapes ?? []"
                  [orientation]="step.orientation ?? 'white'"
                  [coordinates]="true"
                  [label]="l.title[lang()]"
                />
              }
            </li>
          }
        </ol>

        <footer class="finish card" [class.complete]="complete()">
          @if (complete()) {
            <p class="done"><app-icon name="trophy" /> {{ 'learn.lessonComplete' | transloco }}</p>
          } @else if (exercises() > 0) {
            <p class="muted">
              {{ 'learn.lessonRemaining' | transloco: { n: exercises() - solved().size } }}
            </p>
          } @else {
            <button type="button" class="btn btn-primary" (click)="finishReading()">
              <app-icon name="check" /> {{ 'learn.markRead' | transloco }}
            </button>
          }
          <div class="nav">
            @if (next(); as n) {
              <a class="btn btn-primary" [routerLink]="['/learn', n.slug]">
                {{ 'learn.nextLesson' | transloco }}: {{ n.title[lang()] }}
                <app-icon name="chevron-right" />
              </a>
            } @else {
              <a class="btn btn-primary" routerLink="/learn/puzzles">
                {{ 'learn.toPuzzles' | transloco }} <app-icon name="chevron-right" />
              </a>
            }
          </div>
        </footer>
      } @else {
        <app-empty-state icon="book" heading="learn.notFound" text="learn.notFoundText" />
      }
    </div>
  `,
  styles: `
    .steps {
      list-style: none;
      margin: 0;
      padding: 0;
      display: grid;
      gap: 1rem;
    }
    .step {
      display: grid;
      gap: 1rem;
      padding: 1.25rem;
    }
    .text {
      font-size: 1.05rem;
    }
    .illustration {
      width: min(100%, 22rem);
      justify-self: center;
    }
    .exercise {
      display: grid;
      gap: 0.6rem;
      width: min(100%, 26rem);
      justify-self: center;
    }
    .task {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      font-weight: 700;
      color: var(--accent-text);
      --icon-size: 1.1rem;

      .badge {
        margin-left: auto;
        --icon-size: 0.9rem;
      }
    }
    .finish {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 1.5rem;
      padding: 1rem 1.25rem;

      p {
        margin: 0;
      }
    }
    .finish.complete {
      background: var(--accent-soft);
      border-color: transparent;
    }
    .done {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 700;
      color: var(--accent-text);
      animation: pop 0.4s ease-out;
    }
    @keyframes pop {
      from {
        transform: scale(0.8);
        opacity: 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LessonPage {
  readonly slug = input.required<string>();

  protected readonly lang = inject(Language).current;
  private readonly language = inject(Language);
  private readonly progress = inject(Progress);
  private readonly toaster = inject(Toaster);
  private readonly setTitle = pageTitle();

  protected readonly total = LESSONS.length;
  protected readonly lesson = computed(() => lessonBySlug(this.slug()));
  protected readonly index = computed(() => LESSONS.findIndex((l) => l.slug === this.slug()));
  protected readonly next = computed(() => LESSONS[this.index() + 1]);
  protected readonly exercises = computed(() => {
    const lesson = this.lesson();
    return lesson ? exerciseCount(lesson) : 0;
  });

  /** Solved exercise step indexes; resets when the lesson changes. */
  protected readonly solved = linkedSignal<Set<number>>(() => (this.slug(), new Set()));

  protected readonly complete = computed(
    () =>
      this.progress.lessons().has(this.slug()) ||
      (this.exercises() > 0 && this.solved().size >= this.exercises()),
  );

  constructor() {
    effect(() => this.setTitle(this.lesson()?.title[this.lang()]));
  }

  protected markSolved(step: number): void {
    this.solved.update((set) => new Set(set).add(step));
    if (this.solved().size >= this.exercises()) this.award();
  }

  protected finishReading(): void {
    this.award();
  }

  private award(): void {
    const stars = this.progress.completeLesson(this.slug(), Math.max(1, this.exercises()));
    if (stars > 0) this.toaster.show(this.language.t('learn.starsEarned', { n: stars }), 'success');
  }
}

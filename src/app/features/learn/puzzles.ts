import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  signal,
  type OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { PuzzleBoard, type PuzzleResult } from '../../chess/puzzle-board/puzzle-board';
import { Language } from '../../core/i18n';
import {
  DIFFICULTIES,
  LichessPuzzles,
  isPracticeTheme,
  NAMED_THEMES,
  PRACTICE_THEMES,
  type Puzzle,
} from '../../core/lichess';
import { Progress } from '../../core/progress';
import { Toaster } from '../../core/toaster';
import { Icon } from '../../ui/icon';
import { ErrorState } from '../../ui/states';
import { ProgressCard } from './progress-card';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; puzzle: Puzzle };

/** Daily puzzle (builds the streak) and endless practice by theme, from Lichess. */
@Component({
  selector: 'app-puzzles',
  imports: [RouterLink, TranslocoPipe, PuzzleBoard, Icon, ErrorState, ProgressCard],
  templateUrl: './puzzles.html',
  styleUrl: './puzzles.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Puzzles implements OnInit {
  private readonly lichess = inject(LichessPuzzles);
  protected readonly progress = inject(Progress);
  private readonly language = inject(Language);
  private readonly toaster = inject(Toaster);

  protected readonly themes = PRACTICE_THEMES;
  protected readonly difficulties = DIFFICULTIES;
  protected readonly namedThemes = (puzzle: Puzzle) =>
    puzzle.themes.filter((t) => NAMED_THEMES.has(t)).slice(0, 3);
  protected readonly daily = signal<Load>({ status: 'loading' });
  protected readonly practice = signal<Load | null>(null);
  /** `?theme=fork` (from the Learn page) opens practice on that theme. */
  readonly theme = input<string>();
  protected readonly activeTheme = signal<string>('mateIn1');
  protected readonly difficulty = signal<string>('easiest');

  ngOnInit(): void {
    void this.loadDaily();
    const theme = this.theme();
    if (isPracticeTheme(theme)) this.choose(theme);
  }

  protected async loadDaily(): Promise<void> {
    this.daily.set({ status: 'loading' });
    try {
      this.daily.set({ status: 'ready', puzzle: await this.lichess.daily() });
    } catch {
      this.daily.set({ status: 'error' });
    }
  }

  protected async nextPractice(): Promise<void> {
    this.practice.set({ status: 'loading' });
    try {
      this.practice.set({
        status: 'ready',
        puzzle: await this.lichess.next(this.activeTheme(), this.difficulty()),
      });
    } catch {
      this.practice.set({ status: 'error' });
    }
  }

  protected choose(theme: string): void {
    this.activeTheme.set(theme);
    void this.nextPractice();
  }

  protected chooseDifficulty(difficulty: string): void {
    this.difficulty.set(difficulty);
    if (this.practice()) void this.nextPractice();
  }

  protected onSolved(puzzle: Puzzle, result: PuzzleResult, daily: boolean): void {
    // Revealed solutions earn nothing, but still keep the daily streak alive.
    const stars = result.revealed ? 0 : result.mistakes === 0 ? 3 : 1;
    const earned = this.progress.solvePuzzle(puzzle.id, stars, daily);
    if (earned > 0)
      this.toaster.show(this.language.t('learn.starsEarned', { n: earned }), 'success');
  }
}

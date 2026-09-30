import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoveSounds } from '../../core/sound';
import { Icon } from '../../ui/icon';
import { GameSession } from '../game-session';

const AUTOPLAY_MS = 1600;

type Step = 'first' | 'prev' | 'next' | 'last' | 'flip';

const KEYS: Record<string, Step> = {
  ArrowLeft: 'prev',
  ArrowRight: 'next',
  ArrowUp: 'first',
  Home: 'first',
  ArrowDown: 'last',
  End: 'last',
  f: 'flip',
};

/**
 * Step-through buttons plus keyboard shortcuts:
 * ←/→ previous/next, Home/End or ↑/↓ first/last, F flip, Space autoplay.
 */
@Component({
  selector: 'app-game-controls',
  imports: [Icon, TranslocoPipe],
  templateUrl: './game-controls.html',
  styleUrl: './game-controls.scss',
  host: { '(document:keydown)': 'onKey($event)' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameControls {
  /** Hide autoplay where it makes no sense (the editor). */
  readonly autoplay = input(true);

  protected readonly session = inject(GameSession);
  protected readonly sounds = inject(MoveSounds);
  protected readonly playing = signal(false);

  constructor() {
    effect((onCleanup) => {
      if (!this.playing()) return;
      const timer = setInterval(() => {
        if (this.session.hasNext()) this.session.next();
        else this.playing.set(false);
      }, AUTOPLAY_MS);
      onCleanup(() => clearInterval(timer));
    });
  }

  protected step(step: Step): void {
    this.playing.set(false);
    this.session[step]();
  }

  protected togglePlay(): void {
    if (!this.playing() && !this.session.hasNext()) this.session.first();
    this.playing.update((p) => !p);
  }

  protected onKey(event: KeyboardEvent): void {
    const target = event.target;
    if (event.altKey || event.ctrlKey || event.metaKey || isTextInput(target)) return;
    if (event.key === ' ') {
      // A focused button handles Space itself.
      if (!this.autoplay() || target instanceof HTMLButtonElement) return;
      event.preventDefault();
      this.togglePlay();
      return;
    }
    const step = KEYS[event.key];
    if (step) {
      event.preventDefault();
      this.step(step);
    }
  }
}

function isTextInput(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
  );
}

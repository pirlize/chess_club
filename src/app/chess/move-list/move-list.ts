import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SanPipe } from '../../core/notation';
import { GameSession } from '../game-session';
import { buildLines } from './move-lines';

/** Book-style notation with notes and variations. Reads the surrounding `GameSession`. */
@Component({
  selector: 'app-move-list',
  imports: [TranslocoPipe, SanPipe],
  templateUrl: './move-list.html',
  styleUrl: './move-list.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MoveList {
  readonly result = input<string>();
  /** Translation key. */
  readonly emptyText = input('moveList.empty');

  protected readonly session = inject(GameSession);
  private readonly host: HTMLElement = inject(ElementRef).nativeElement;

  protected readonly lines = computed(() => {
    this.session.version();
    const tree = this.session.tree();
    return tree ? buildLines(tree.root) : [];
  });

  protected readonly resultLabel = computed(() => {
    const result = this.result();
    return result && result !== '*' ? result.replace('1/2', '½').replace('-', '–') : null;
  });

  constructor() {
    // Keep the selected move visible when the list scrolls on its own (desktop panel).
    afterRenderEffect(() => {
      const id = this.session.current()?.id;
      const list = this.host;
      const target = list.querySelector<HTMLElement>(`[data-node="${id}"]`);
      if (!target || list.scrollHeight <= list.clientHeight) return;
      const top = target.offsetTop - list.offsetTop;
      if (top < list.scrollTop || top > list.scrollTop + list.clientHeight - target.offsetHeight) {
        list.scrollTo({ top: top - list.clientHeight / 3, behavior: 'smooth' });
      }
    });
  }
}

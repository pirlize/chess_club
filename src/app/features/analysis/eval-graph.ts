import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { SanPipe } from '../../core/notation';
import { moveLabel } from '../../chess/game-tree';
import type { MoveNode } from '../../chess/model';
import type { ReviewedMove } from './engine-analysis';

const MARKED = new Set(['inaccuracy', 'mistake', 'blunder']);

/**
 * White's winning chances across the game, lichess-style: the shaded area is
 * White's share. Mistakes get markers; hovering shows the move and eval, and a
 * click jumps there. The move list next to it is the table view.
 */
@Component({
  selector: 'app-eval-graph',
  imports: [TranslocoPipe, SanPipe],
  template: `
    <div
      class="plot"
      (pointermove)="hover($event)"
      (pointerleave)="hovered.set(null)"
      (click)="pick($event)"
    >
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <path class="area" [attr.d]="area()" />
        <line class="mid" x1="0" y1="50" x2="100" y2="50" />
        <path class="line" [attr.d]="line()" />
        @if (cursorX(); as x) {
          <line class="cursor" [attr.x1]="x" y1="0" [attr.x2]="x" y2="100" />
        }
      </svg>
      @for (m of markers(); track m.move.node.id) {
        <button
          type="button"
          class="marker"
          [attr.data-verdict]="m.move.verdict"
          [style.left.%]="m.x"
          [style.top.%]="m.y"
          [attr.aria-label]="
            (label(m.move.node) | san) + ' · ' + ('engine.verdict.' + m.move.verdict | transloco)
          "
          (click)="$event.stopPropagation(); select.emit(m.move.node)"
        ></button>
      }
      @if (tip(); as t) {
        <div class="tip" [style.left.%]="t.x" [class.flip]="t.x > 60">
          <strong>{{ t.label | san }}</strong> {{ t.move.evalText }}
          @if (t.marked) {
            <span class="verdict" [attr.data-verdict]="t.move.verdict">
              {{ 'engine.verdict.' + t.move.verdict | transloco }}
            </span>
          }
        </div>
      }
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .plot {
      position: relative;
      height: 6.5rem;
      border: 1px solid var(--border-strong);
      border-radius: var(--radius-sm);
      background: var(--eval-black);
      overflow: visible;
      cursor: pointer;
      touch-action: pan-y;
    }
    svg {
      display: block;
      width: 100%;
      height: 100%;
      border-radius: inherit;
      overflow: hidden;
    }
    .area {
      fill: var(--eval-white);
    }
    .line {
      fill: none;
      stroke: var(--accent);
      stroke-width: 2px;
      stroke-linejoin: round;
      vector-effect: non-scaling-stroke;
    }
    .mid {
      stroke: rgb(128 128 128 / 0.55);
      stroke-width: 1px;
      vector-effect: non-scaling-stroke;
    }
    .cursor {
      stroke: var(--text-muted);
      stroke-width: 1px;
      vector-effect: non-scaling-stroke;
    }
    .marker {
      position: absolute;
      width: 1.5rem;
      height: 1.5rem;
      margin: -0.75rem 0 0 -0.75rem;
      padding: 0;
      border: 0;
      background: transparent;
      cursor: pointer;

      &::after {
        content: '';
        position: absolute;
        inset: 0.25rem;
        border-radius: 50%;
        border: 2px solid var(--surface);
        background: var(--marker);
      }
    }
    [data-verdict='inaccuracy'] {
      --marker: var(--nag-dubious);
    }
    [data-verdict='mistake'] {
      --marker: var(--nag-mistake);
    }
    [data-verdict='blunder'] {
      --marker: var(--nag-blunder);
    }
    .tip {
      position: absolute;
      bottom: calc(100% + 0.4rem);
      transform: translateX(-50%);
      padding: 0.35rem 0.6rem;
      border-radius: var(--radius-xs);
      background: var(--inverse-bg);
      color: var(--inverse-text);
      font-size: 0.8rem;
      white-space: nowrap;
      pointer-events: none;
      box-shadow: var(--shadow-md);
      z-index: 2;
    }
    .verdict {
      margin-left: 0.3rem;
      font-weight: 650;

      &::before {
        content: '';
        display: inline-block;
        width: 0.5rem;
        height: 0.5rem;
        margin-right: 0.3rem;
        border-radius: 50%;
        background: var(--marker);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EvalGraph {
  readonly moves = input.required<readonly ReviewedMove[]>();
  /** White's win % in the starting position. */
  readonly startWin = input(50);
  readonly currentPly = input(0);
  readonly select = output<MoveNode>();

  protected readonly hovered = signal<number | null>(null);
  protected readonly label = moveLabel;

  /** [x, y] per ply including the start; x and y in 0–100 (y = 0 is White winning). */
  private readonly points = computed(() => {
    const moves = this.moves();
    const steps = Math.max(1, moves.length);
    return [this.startWin(), ...moves.map((m) => m.win)].map(
      (win, i) => [(i / steps) * 100, 100 - win] as const,
    );
  });

  protected readonly line = computed(() =>
    this.points()
      .map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`)
      .join(' '),
  );

  protected readonly area = computed(() => `${this.line()} L100 100 L0 100 Z`);

  protected readonly markers = computed(() => {
    const points = this.points();
    return this.moves()
      .map((move, i) => ({ move, x: points[i + 1][0], y: points[i + 1][1] }))
      .filter((m) => MARKED.has(m.move.verdict));
  });

  /** The hovered move, or else the selected one. */
  private readonly focus = computed(() => {
    const index = this.hovered() ?? this.currentPly() - 1;
    return index >= 0 && index < this.moves().length ? index : null;
  });

  protected readonly cursorX = computed(() => {
    const index = this.focus();
    return index === null ? null : this.points()[index + 1][0];
  });

  protected readonly tip = computed(() => {
    const index = this.hovered();
    if (index === null || index >= this.moves().length) return null;
    const move = this.moves()[index];
    return {
      move,
      x: this.points()[index + 1][0],
      label: moveLabel(move.node),
      marked: MARKED.has(move.verdict),
    };
  });

  protected hover(event: PointerEvent): void {
    if (event.pointerType === 'mouse') this.hovered.set(this.indexAt(event));
  }

  protected pick(event: MouseEvent): void {
    const index = this.indexAt(event);
    if (index !== null) this.select.emit(this.moves()[index].node);
  }

  /** The move nearest the pointer (point i+1 sits at (i+1)/count of the width). */
  private indexAt(event: MouseEvent): number | null {
    const box = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const count = this.moves().length;
    if (!count || !box.width) return null;
    const index = Math.round(((event.clientX - box.left) / box.width) * count) - 1;
    return Math.max(0, Math.min(count - 1, index));
  }
}

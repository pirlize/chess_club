import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { moveSound, MoveSounds } from '../../core/sound';
import { BoardRenderer, type BoardHandle, type BoardView } from '../board-renderer';
import type { BoardShape, Color, MoveInput } from '../model';

/** A chessboard. Rendering is delegated to whichever `BoardRenderer` is provided. */
@Component({
  selector: 'app-board',
  template: '',
  styleUrl: './board.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Board {
  readonly view = input.required<BoardView>();
  readonly moved = output<MoveInput>();
  readonly shapesChange = output<BoardShape[]>();

  private readonly host: HTMLElement = inject(ElementRef).nativeElement;
  private readonly renderer = inject(BoardRenderer);
  private readonly sounds = inject(MoveSounds);
  private handle?: BoardHandle;
  private shown?: BoardView;

  constructor() {
    afterNextRender(() => {
      this.handle = this.renderer.mount(this.host, this.view(), {
        onMove: (move) => this.moved.emit(move),
        onShapesChange: (shapes) => this.shapesChange.emit(shapes),
      });
    });
    effect(() => {
      const view = this.view();
      this.handle?.update(view);
      // A new position reached by a move (not the first draw, a flip or arrows): play it.
      const before = this.shown;
      this.shown = view;
      if (before && before.fen !== view.fen && view.lastMove) {
        this.sounds.play(moveSound(before.fen, view));
      }
    });
    inject(DestroyRef).onDestroy(() => this.handle?.destroy());
  }
}

/** A small read-only board for lists and cards. */
@Component({
  selector: 'app-board-thumbnail',
  imports: [Board],
  template: `<app-board [view]="view()" />`,
  host: { role: 'img', '[attr.aria-label]': 'label()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardThumbnail {
  readonly fen = input.required<string>();
  readonly orientation = input<Color>('white');
  readonly label = input('Chess position');
  /** Arrows and highlighted squares, e.g. to show how a piece moves. */
  readonly shapes = input<readonly BoardShape[]>([]);
  readonly coordinates = input(false);

  protected readonly view = computed<BoardView>(() => ({
    fen: this.fen(),
    orientation: this.orientation(),
    turn: 'white',
    check: false,
    shapes: this.shapes(),
    movable: null,
    editableShapes: false,
    coordinates: this.coordinates(),
  }));
}

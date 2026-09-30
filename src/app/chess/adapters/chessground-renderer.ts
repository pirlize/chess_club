import { Injectable } from '@angular/core';
import { Chessground } from 'chessground';
import type { Config } from 'chessground/config';
import type { DrawShape } from 'chessground/draw';
import type { Key } from 'chessground/types';
import {
  BoardRenderer,
  type BoardCallbacks,
  type BoardHandle,
  type BoardView,
} from '../board-renderer';
import type { BoardShape, ShapeColor, Square } from '../model';

/**
 * BoardRenderer backed by chessground (GPL-3.0-or-later), the board used by lichess.
 * Its stylesheets are listed in angular.json and themed in src/styles/_board.scss.
 */
@Injectable()
export class ChessgroundRenderer extends BoardRenderer {
  mount(host: HTMLElement, view: BoardView, callbacks: BoardCallbacks): BoardHandle {
    const api = Chessground(host, {
      ...toConfig(view, callbacks),
      animation: { enabled: true, duration: 180 },
      disableContextMenu: true,
      highlight: { lastMove: true, check: true },
    });
    return {
      update: (next) => api.set(toConfig(next, callbacks)),
      destroy: () => api.destroy(),
    };
  }
}

function toConfig(view: BoardView, callbacks: BoardCallbacks): Config {
  const shapes = view.shapes.map(toDrawShape);
  const overlay = (view.overlay ?? []).map(toDrawShape);
  return {
    fen: view.fen,
    orientation: view.orientation,
    turnColor: view.turn,
    lastMove: view.lastMove,
    check: view.check ? view.turn : false,
    coordinates: view.coordinates,
    viewOnly: view.movable === null && !view.editableShapes,
    movable: {
      free: false,
      color: view.movable ? view.turn : undefined,
      dests: view.movable ?? new Map(),
      showDests: true,
      events: {
        after: (orig, dest) => callbacks.onMove({ from: orig as Square, to: dest as Square }),
      },
    },
    drawable: {
      enabled: view.editableShapes,
      visible: true,
      eraseOnClick: false,
      // Editable shapes belong to the user layer; read-only ones are "auto" shapes.
      shapes: view.editableShapes ? shapes : [],
      autoShapes: view.editableShapes ? overlay : [...shapes, ...overlay],
      onChange: (drawn) => callbacks.onShapesChange(drawn.flatMap(fromDrawShape)),
    },
  };
}

const toDrawShape = (s: BoardShape): DrawShape => ({
  orig: s.from as Key,
  dest: s.from === s.to ? undefined : (s.to as Key),
  brush: s.color,
});

const SHAPE_COLORS: readonly string[] = ['green', 'red', 'yellow', 'blue'] satisfies ShapeColor[];

function fromDrawShape(s: DrawShape): BoardShape[] {
  if (s.orig === 'a0' || !s.brush || !SHAPE_COLORS.includes(s.brush)) return [];
  const from = s.orig as Square;
  return [{ from, to: (s.dest ?? from) as Square, color: s.brush as ShapeColor }];
}

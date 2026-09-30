import { effect, inject, Injectable, Pipe, signal, type PipeTransform } from '@angular/core';
import { readStorage, writeStorage } from './storage';

/** English (Nf3) or Greek (Ιf3) piece letters. Independent of the UI language. */
export type NotationStyle = 'en' | 'el';

const STORAGE_KEY = 'cc:notation';

/** Ρήγας (βασιλιάς), Βασίλισσα, Πύργος, Αξιωματικός, Ίππος. Squares stay a–h, 1–8. */
const GREEK_PIECES: Record<string, string> = { K: 'Ρ', Q: 'Β', R: 'Π', B: 'Α', N: 'Ι' };

/**
 * Moves in Greek notation: "Nf3" → "Ιf3", "exd8=Q+" → "exd8=Β+", "15. Bxd7+" → "15. Αxd7+".
 * Only for text made of moves and move numbers: every capital K/Q/R/B/N is taken as a piece.
 */
export const toGreekNotation = (moves: string) =>
  moves.replace(/[KQRBN]/g, (piece) => GREEK_PIECES[piece]);

/**
 * The move notation shown on screen, remembered per device. Stored games and
 * exported PGN always use standard (English) SAN.
 */
@Injectable({ providedIn: 'root' })
export class Notation {
  readonly style = signal<NotationStyle>(readStorage(STORAGE_KEY) === 'el' ? 'el' : 'en');

  constructor() {
    effect(() => writeStorage(STORAGE_KEY, this.style()));
  }

  toggle(): void {
    this.style.update((s) => (s === 'en' ? 'el' : 'en'));
  }

  /** Moves (e.g. "Nf3", "14… Qe6", "15. Bxd7+ Nxd7") in the chosen notation. Safe to destructure. */
  readonly format = (moves: string): string =>
    this.style() === 'el' ? toGreekNotation(moves) : moves;
}

/** `{{ node.san | san }}`: moves in the chosen notation. Impure so it follows the switch. */
@Pipe({ name: 'san', pure: false })
export class SanPipe implements PipeTransform {
  private readonly notation = inject(Notation);

  transform(moves: string | null | undefined): string {
    return moves ? this.notation.format(moves) : '';
  }
}

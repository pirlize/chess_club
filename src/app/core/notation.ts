import {
  DOCUMENT,
  effect,
  inject,
  Injectable,
  Pipe,
  signal,
  type PipeTransform,
} from '@angular/core';
import { readStorage, writeStorage } from './storage';

/** English (Nf3) or Greek (Ιζ3) notation. Independent of the UI language. */
export type NotationStyle = 'en' | 'el';

const STORAGE_KEY = 'cc:notation';

/**
 * Greek notation: Ρήγας (βασιλιάς), Βασίλισσα, Πύργος, Αξιωματικός, Ίππος,
 * and files α–θ for a–h. Capitals are pieces, small letters are files.
 */
const GREEK: Record<string, string> = {
  K: 'Ρ',
  Q: 'Β',
  R: 'Π',
  B: 'Α',
  N: 'Ι',
  a: 'α',
  b: 'β',
  c: 'γ',
  d: 'δ',
  e: 'ε',
  f: 'ζ',
  g: 'η',
  h: 'θ',
};

/**
 * Moves in Greek notation: "Nf3" → "Ιζ3", "exd8=Q+" → "εxδ8=Β+", "15. Bxd7+" → "15. Αxδ7+".
 * Only for strings made of moves and move numbers (labels, lines).
 */
export const toGreekNotation = (moves: string) =>
  moves.replace(/[KQRBNa-h]/g, (letter) => GREEK[letter]);

/**
 * A move or square written inside prose: "Nf3", "exd5", "e8=Q+", "O-O", "e4".
 * Not glued to other letters or digits, so words, URLs and "e2e4" are left alone.
 */
const MOVE_IN_TEXT =
  /(?<![\p{L}\p{N}])(?:O-O(?:-O)?|[KQRBN][a-h]?[1-8]?x?[a-h][1-8]|[a-h](?:x[a-h])?[1-8](?:=[QRBN])?)[+#]?(?![\p{L}\p{N}])/gu;

/**
 * Prose (notes, lessons) with its moves and squares in Greek notation.
 * Text in \`backticks\` is kept as written, for examples of both notations.
 */
export const toGreekText = (text: string) =>
  text
    .split(/(`[^`]*`)/)
    .map((part, i) => (i % 2 ? part : part.replace(MOVE_IN_TEXT, toGreekNotation)))
    .join('');

/**
 * The move notation shown on screen, remembered per device. Stored games and
 * exported PGN always use standard (English) SAN; this only changes the display.
 */
@Injectable({ providedIn: 'root' })
export class Notation {
  private readonly document = inject(DOCUMENT);
  readonly style = signal<NotationStyle>(readStorage(STORAGE_KEY) === 'el' ? 'el' : 'en');

  constructor() {
    effect(() => {
      const style = this.style();
      writeStorage(STORAGE_KEY, style);
      // Lets CSS relabel the board's files (see styles/_board.scss).
      this.document.documentElement.dataset['notation'] = style;
    });
  }

  toggle(): void {
    this.style.update((s) => (s === 'en' ? 'el' : 'en'));
  }

  /** Moves ("Nf3", "14… Qe6", "15. Bxd7+ Nxd7") in the chosen notation. Safe to destructure. */
  readonly format = (moves: string): string =>
    this.style() === 'el' ? toGreekNotation(moves) : moves;

  /** Prose with moves in it (the coach's notes, lessons) in the chosen notation. */
  readonly formatText = (text: string): string =>
    this.style() === 'el' ? toGreekText(text) : text;
}

/** `{{ node.san | san }}`: moves in the chosen notation. Impure so it follows the switch. */
@Pipe({ name: 'san', pure: false })
export class SanPipe implements PipeTransform {
  private readonly notation = inject(Notation);

  transform(moves: string | null | undefined): string {
    return moves ? this.notation.format(moves) : '';
  }
}

/** `{{ node.comment | sanText }}`: moves mentioned in prose, in the chosen notation. */
@Pipe({ name: 'sanText', pure: false })
export class SanTextPipe implements PipeTransform {
  private readonly notation = inject(Notation);

  transform(text: string | null | undefined): string {
    return text ? this.notation.formatText(text) : '';
  }
}

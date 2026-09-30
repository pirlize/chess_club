/** Numeric Annotation Glyphs: the !, ?, ± symbols used in annotated games. */

export type NagTone =
  'brilliant' | 'good' | 'interesting' | 'dubious' | 'mistake' | 'blunder' | 'position';

export interface Nag {
  code: number;
  symbol: string;
  /** Translation key. */
  label: string;
  tone: NagTone;
}

export const MOVE_NAGS: readonly Nag[] = [
  { code: 3, symbol: '!!', label: 'nag.3', tone: 'brilliant' },
  { code: 1, symbol: '!', label: 'nag.1', tone: 'good' },
  { code: 5, symbol: '!?', label: 'nag.5', tone: 'interesting' },
  { code: 6, symbol: '?!', label: 'nag.6', tone: 'dubious' },
  { code: 2, symbol: '?', label: 'nag.2', tone: 'mistake' },
  { code: 4, symbol: '??', label: 'nag.4', tone: 'blunder' },
];

export const POSITION_NAGS: readonly Nag[] = [
  { code: 10, symbol: '=', label: 'nag.10', tone: 'position' },
  { code: 13, symbol: '∞', label: 'nag.13', tone: 'position' },
  { code: 14, symbol: '⩲', label: 'nag.14', tone: 'position' },
  { code: 15, symbol: '⩱', label: 'nag.15', tone: 'position' },
  { code: 16, symbol: '±', label: 'nag.16', tone: 'position' },
  { code: 17, symbol: '∓', label: 'nag.17', tone: 'position' },
  { code: 18, symbol: '+−', label: 'nag.18', tone: 'position' },
  { code: 19, symbol: '−+', label: 'nag.19', tone: 'position' },
];

const BY_CODE = new Map([...MOVE_NAGS, ...POSITION_NAGS].map((nag) => [nag.code, nag]));

export const nagInfo = (code: number): Nag | undefined => BY_CODE.get(code);

/** Toggles a glyph, keeping at most one move assessment and one position assessment. */
export function toggleNag(nags: readonly number[], code: number): number[] {
  if (nags.includes(code)) return nags.filter((n) => n !== code);
  const group = MOVE_NAGS.some((n) => n.code === code) ? MOVE_NAGS : POSITION_NAGS;
  return [...nags.filter((n) => !group.some((g) => g.code === n)), code];
}

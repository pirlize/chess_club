import { GAME_RESULTS, type GameInput, type GameResult } from '../../../../shared/models';

/** The game's details as edited in the form (dates as "" rather than null). */
export type GameMeta = Omit<GameInput, 'pgn' | 'finalFen' | 'playedOn'> & { playedOn: string };

export const EMPTY_GAME_META: GameMeta = {
  title: '',
  white: '',
  black: '',
  result: '*',
  event: '',
  playedOn: '',
  eco: '',
  opening: '',
  category: 'club',
  summary: '',
  published: false,
};

/** Details found in PGN tags. Unknown values ("?", "????.??.??") come back empty. */
export function metaFromHeaders(headers: Map<string, string>): Partial<GameMeta> {
  const get = (key: string) => {
    const value = headers.get(key)?.trim() ?? '';
    return /^[?.]*$/.test(value) ? '' : value;
  };
  const date = /^(\d{4})\.(\d{2})\.(\d{2})$/.exec(get('Date'));
  const result = get('Result');
  const eco = get('ECO').toUpperCase();
  return {
    white: get('White'),
    black: get('Black'),
    event: get('Event'),
    playedOn: date ? `${date[1]}-${date[2]}-${date[3]}` : '',
    result: (GAME_RESULTS as readonly string[]).includes(result) ? (result as GameResult) : '*',
    eco: /^[A-E]\d\d$/.test(eco) ? eco : '',
    opening: get('Opening'),
  };
}

const SEVEN_TAG_ROSTER = ['Event', 'Site', 'Date', 'Round', 'White', 'Black', 'Result'];

/** Writes the edited details back into the PGN tags, keeping any other tags (FEN, Round…). */
export function writeHeaders(headers: Map<string, string>, meta: GameMeta): void {
  const roster: Record<string, string> = {
    Event: meta.event || '?',
    Date: meta.playedOn ? meta.playedOn.replaceAll('-', '.') : '????.??.??',
    White: meta.white,
    Black: meta.black,
    Result: meta.result,
  };
  const optional: Record<string, string> = { ECO: meta.eco.toUpperCase(), Opening: meta.opening };

  const ordered = new Map<string, string>();
  for (const key of SEVEN_TAG_ROSTER) {
    const value = roster[key] ?? headers.get(key);
    if (value) ordered.set(key, value);
  }
  for (const [key, value] of headers) {
    if (!ordered.has(key) && !(key in optional)) ordered.set(key, value);
  }
  for (const [key, value] of Object.entries(optional)) {
    if (value) ordered.set(key, value);
  }

  headers.clear();
  for (const [key, value] of ordered) headers.set(key, value);
}

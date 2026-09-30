import { EMPTY_GAME_META, metaFromHeaders, writeHeaders } from './game-meta';

describe('game details ↔ PGN tags', () => {
  it('reads details and ignores unknown placeholders', () => {
    const headers = new Map([
      ['Event', '?'],
      ['Date', '2026.09.18'],
      ['White', 'Anna'],
      ['Black', 'Leo'],
      ['Result', '1-0'],
      ['ECO', 'c41'],
    ]);
    expect(metaFromHeaders(headers)).toEqual({
      white: 'Anna',
      black: 'Leo',
      event: '',
      playedOn: '2026-09-18',
      result: '1-0',
      eco: 'C41',
      opening: '',
    });
  });

  it('treats partial dates and odd results as unknown', () => {
    const meta = metaFromHeaders(
      new Map([
        ['Date', '1858.??.??'],
        ['Result', '1-1'],
      ]),
    );
    expect(meta.playedOn).toBe('');
    expect(meta.result).toBe('*');
  });

  it('writes the standard tags first and keeps other tags', () => {
    const headers = new Map([
      ['FEN', '8/8/8/8/8/8/8/K1k5 w - - 0 1'],
      ['White', 'old'],
      ['Round', '3'],
    ]);
    writeHeaders(headers, {
      ...EMPTY_GAME_META,
      white: 'Anna',
      black: 'Leo',
      playedOn: '2026-09-18',
      eco: 'c41',
    });

    expect([...headers]).toEqual([
      ['Event', '?'],
      ['Date', '2026.09.18'],
      ['Round', '3'],
      ['White', 'Anna'],
      ['Black', 'Leo'],
      ['Result', '*'],
      ['FEN', '8/8/8/8/8/8/8/K1k5 w - - 0 1'],
      ['ECO', 'C41'],
    ]);
  });
});

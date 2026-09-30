import { moveSound } from './sound';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const AFTER_E4 = 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1';
const SCANDI = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
const AFTER_EXD5 = 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2';

describe('move sounds', () => {
  it('tells quiet moves, captures and checks apart', () => {
    expect(moveSound(START, { fen: AFTER_E4, check: false })).toBe('move');
    expect(moveSound(SCANDI, { fen: AFTER_EXD5, check: false })).toBe('capture');
    expect(moveSound(SCANDI, { fen: AFTER_EXD5, check: true })).toBe('check');
  });

  it('plays a quiet move when stepping back over a capture', () => {
    expect(moveSound(AFTER_EXD5, { fen: SCANDI, check: false })).toBe('move');
  });
});

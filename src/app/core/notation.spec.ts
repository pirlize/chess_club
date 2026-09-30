import { toGreekNotation } from './notation';

describe('Greek notation', () => {
  it('swaps piece letters and keeps squares, captures, checks and castling', () => {
    expect(toGreekNotation('Nf3')).toBe('Ιf3');
    expect(toGreekNotation('Qxd8+')).toBe('Βxd8+');
    expect(toGreekNotation('Rd8#')).toBe('Πd8#');
    expect(toGreekNotation('Bxb5+')).toBe('Αxb5+');
    expect(toGreekNotation('Kf1')).toBe('Ρf1');
    expect(toGreekNotation('exd8=Q+')).toBe('exd8=Β+');
    expect(toGreekNotation('O-O-O')).toBe('O-O-O');
    expect(toGreekNotation('e4')).toBe('e4');
    // The b-file is a square, not a bishop.
    expect(toGreekNotation('bxc6')).toBe('bxc6');
  });

  it('works on labels and whole lines', () => {
    expect(toGreekNotation('14… Qe6')).toBe('14… Βe6');
    expect(toGreekNotation('15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#')).toBe(
      '15. Αxd7+ Ιxd7 16. Βb8+ Ιxb8 17. Πd8#',
    );
  });
});

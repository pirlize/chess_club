import { toGreekNotation, toGreekText } from './notation';

describe('Greek notation', () => {
  it('uses Greek letters for pieces and files', () => {
    expect(toGreekNotation('Nf3')).toBe('Ιζ3');
    expect(toGreekNotation('e4')).toBe('ε4');
    expect(toGreekNotation('Qxd8+')).toBe('Βxδ8+');
    expect(toGreekNotation('Rd8#')).toBe('Πδ8#');
    expect(toGreekNotation('Bxb5+')).toBe('Αxβ5+');
    expect(toGreekNotation('Kf1')).toBe('Ρζ1');
    expect(toGreekNotation('exd8=Q+')).toBe('εxδ8=Β+');
    expect(toGreekNotation('Nbd7')).toBe('Ιβδ7');
    expect(toGreekNotation('O-O-O')).toBe('O-O-O');
    // Capital B is a bishop, small b is the b-file.
    expect(toGreekNotation('bxc6')).toBe('βxγ6');
  });

  it('works on labels and whole lines', () => {
    expect(toGreekNotation('14… Qe6')).toBe('14… Βε6');
    expect(toGreekNotation('15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8#')).toBe(
      '15. Αxδ7+ Ιxδ7 16. Ββ8+ Ιxβ8 17. Πδ8#',
    );
  });

  it('converts only the moves inside prose', () => {
    expect(toGreekText('Αναγκαστικό. Μετά το 4...dxe5 5.Qxd8+ Kxd8 6.Nxe5 κερδίζουν.')).toBe(
      'Αναγκαστικό. Μετά το 4...δxε5 5.Βxδ8+ Ρxδ8 6.Ιxε5 κερδίζουν.',
    );
    expect(toGreekText('Better was 15. Bxf6, then O-O.')).toBe('Better was 15. Αxζ6, then O-O.');
    expect(toGreekText('Το τετράγωνο **e4**.')).toBe('Το τετράγωνο **ε4**.');
    // Words, UCI moves and links stay as they are.
    expect(toGreekText('Bishop a king e2e4 lichess.org/abc1d2')).toBe(
      'Bishop a king e2e4 lichess.org/abc1d2',
    );
    // `Backticks` keep examples as written.
    expect(toGreekText('Το `Nf3` γράφεται και `Ιζ3`, όπως το Nf3.')).toBe(
      'Το `Nf3` γράφεται και `Ιζ3`, όπως το Ιζ3.',
    );
  });
});

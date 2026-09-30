import { slugify } from './slug';

describe('slugify', () => {
  it('transliterates Greek titles', () => {
    expect(slugify('Φθινοπωρινό Open Chess Square 2026')).toBe(
      'fthinoporino-open-chess-square-2026',
    );
    expect(slugify('Καλώς ήρθατε στην εφαρμογή!')).toBe('kalos-irthate-stin-efarmogi');
    expect(slugify('Μπλιτς του Σαββάτου')).toBe('blits-tou-savvatou');
  });

  it('handles Latin text and punctuation', () => {
    expect(slugify('  How to read an annotated game?  ')).toBe('how-to-read-an-annotated-game');
    expect(slugify('Café & Chess')).toBe('cafe-chess');
  });
});

import { PgnError } from '../chess-rules';
import { mainline, STANDARD_START_FEN } from '../game-tree';
import { ChessopsRules } from './chessops-rules';

const OPERA = `[Event "Paris"]
[White "Paul Morphy"]
[Black "Duke Karl / Count Isouard"]
[Result "1-0"]

{A model of development.} 1. e4 e5 2. Nf3 d6 3. d4 Bg4 $6 {Pins the knight.} (3... exd4 {is usual} 4. Nxd4) 4. dxe5 Bxf3
5. Qxf3 dxe5 6. Bc4 {[%cal Gc4f7,Rf3f7] Aiming at f7.} Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5
11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ $3 Nxb8 17. Rd8# {[%csl Re8]} 1-0`;

describe('ChessopsRules', () => {
  const rules = new ChessopsRules();

  it('reads moves, notes, symbols, arrows and side lines', () => {
    const [{ tree, warnings }] = rules.parsePgn(OPERA);
    const line = mainline(tree.root);

    expect(warnings).toEqual([]);
    expect(tree.headers.get('White')).toBe('Paul Morphy');
    expect(tree.root.comment).toBe('A model of development.');
    expect(line).toHaveLength(33);

    const bg4 = line[5];
    expect(bg4.san).toBe('Bg4');
    expect(bg4.nags).toEqual([6]);
    expect(bg4.comment).toBe('Pins the knight.');
    expect(bg4.parent.children.map((c) => c.san)).toEqual(['Bg4', 'exd4']);
    expect(bg4.parent.children[1].children[0].san).toBe('Nxd4');

    expect(line[10].shapes).toEqual([
      { from: 'c4', to: 'f7', color: 'green' },
      { from: 'f3', to: 'f7', color: 'red' },
    ]);
    expect(line[10].comment).toBe('Aiming at f7.');

    const mate = line[32];
    expect(mate.san).toBe('Rd8#');
    expect(mate.check).toBe(true);
    expect(mate.shapes).toEqual([{ from: 'e8', to: 'e8', color: 'red' }]);
  });

  it('records castling as the king’s move', () => {
    const [{ tree }] = rules.parsePgn(OPERA);
    const castle = mainline(tree.root)[22];
    expect(castle.san).toBe('O-O-O');
    expect(castle.uci).toBe('e1c1');
    expect([castle.from, castle.to]).toEqual(['e1', 'c1']);
  });

  it('writes PGN that reads back to the same tree', () => {
    const [{ tree }] = rules.parsePgn(OPERA);
    const [{ tree: again }] = rules.parsePgn(rules.writePgn(tree));
    const flatten = (t: typeof tree) =>
      mainline(t.root).map((n) => [n.san, n.comment, n.nags, n.shapes, n.children.length]);

    expect(flatten(again)).toEqual(flatten(tree));
    expect(again.root.comment).toBe(tree.root.comment);
    expect(again.headers).toEqual(tree.headers);
  });

  it('stops a line at an illegal move and says where', () => {
    const [{ tree, warnings }] = rules.parsePgn('1. e4 e5 2. Ke3 Nc6 *');
    expect(mainline(tree.root).map((n) => n.san)).toEqual(['e4', 'e5']);
    expect(warnings).toEqual([{ code: 'illegal-move', move: '2. Ke3' }]);
  });

  it('validates and normalises FENs', () => {
    expect(rules.normalizeFen('  8/8/8/8/8/8/8/K1k5 w - - 0 1 ')).toBe(
      '8/8/8/8/8/8/8/K1k5 w - - 0 1',
    );
    expect(rules.normalizeFen('not a position')).toBeNull();
    // Both kings adjacent: parses as FEN, but is not a legal position.
    expect(rules.normalizeFen('8/8/8/8/8/8/8/Kk6 w - - 0 1')).toBeNull();
  });

  it('reads every game in a multi-game file', () => {
    expect(rules.parsePgn('[White "A"]\n\n1. e4 *\n\n[White "B"]\n\n1. d4 *')).toHaveLength(2);
  });

  it('rejects text with no moves', () => {
    expect(() => rules.parsePgn('Hello coach, see you Friday!')).toThrow(PgnError);
  });

  it('plays legal moves and refuses illegal ones', () => {
    expect(rules.play(STANDARD_START_FEN, { from: 'e2', to: 'e4' })).toMatchObject({
      san: 'e4',
      uci: 'e2e4',
      check: false,
    });
    expect(rules.play(STANDARD_START_FEN, { from: 'e2', to: 'e5' })).toBeNull();
    expect(rules.legalDests(STANDARD_START_FEN).get('g1')).toEqual(['f3', 'h3']);
    expect(rules.turn(STANDARD_START_FEN)).toBe('white');
  });

  it('detects promotions and plays the chosen piece', () => {
    const fen = '8/4P3/8/8/8/8/k7/4K3 w - - 0 1';
    expect(rules.isPromotion(fen, { from: 'e7', to: 'e8' })).toBe(true);
    expect(rules.isPromotion(fen, { from: 'e1', to: 'e2' })).toBe(false);
    expect(rules.play(fen, { from: 'e7', to: 'e8', promotion: 'knight' })).toMatchObject({
      san: 'e8=N',
      uci: 'e7e8n',
    });
  });
});

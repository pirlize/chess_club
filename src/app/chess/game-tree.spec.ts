import { ChessopsRules } from './adapters/chessops-rules';
import {
  deleteMove,
  hasAnnotations,
  isOnMainline,
  mainline,
  moveLabel,
  nodeAtPly,
  plyOfFen,
  promoteLine,
  STANDARD_START_FEN,
} from './game-tree';
import { buildLines, type MovesLine } from './move-list/move-lines';
import { toggleNag } from './nags';

const rules = new ChessopsRules();
const parse = (pgn: string) => rules.parsePgn(pgn)[0].tree;

describe('game tree helpers', () => {
  it('works out the ply of a FEN', () => {
    expect(plyOfFen(STANDARD_START_FEN)).toBe(0);
    expect(plyOfFen('rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1')).toBe(1);
    expect(plyOfFen('8/8/8/8/8/8/8/K1k5 w - - 0 30')).toBe(58);
  });

  it('labels moves the way players write them', () => {
    const [e4, e5] = mainline(parse('1. e4 e5 *').root);
    expect(moveLabel(e4)).toBe('1. e4');
    expect(moveLabel(e5)).toBe('1… e5');
  });

  it('finds main-line moves by ply', () => {
    const tree = parse('1. e4 e5 2. Nf3 *');
    expect((nodeAtPly(tree.root, 2) as { san: string }).san).toBe('e5');
    expect((nodeAtPly(tree.root, 99) as { san: string }).san).toBe('Nf3');
  });

  it('promotes a side line and deletes moves', () => {
    const tree = parse('1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *');
    const c5 = tree.root.children[0].children[1];
    expect(isOnMainline(c5)).toBe(false);

    promoteLine(c5.children[0]);
    expect(tree.root.children[0].children[0].san).toBe('c5');
    expect(isOnMainline(c5)).toBe(true);

    expect(deleteMove(c5)).toBe(tree.root.children[0]);
    expect(tree.root.children[0].children.map((c) => c.san)).toEqual(['e5']);
  });

  it('knows when a line carries annotations', () => {
    const [e4, e5, nf3] = mainline(parse('1. e4 e5 2. Nf3 {develops} *').root);
    expect(hasAnnotations(e4)).toBe(true);
    expect(hasAnnotations(nf3)).toBe(true);
    expect(hasAnnotations(e5.children[0])).toBe(true);
    expect(hasAnnotations(mainline(parse('1. e4 e5 *').root)[0])).toBe(false);
  });

  it('keeps one move symbol and one position symbol', () => {
    expect(toggleNag([], 1)).toEqual([1]);
    expect(toggleNag([1], 2)).toEqual([2]);
    expect(toggleNag([2, 16], 4)).toEqual([16, 4]);
    expect(toggleNag([2, 16], 18)).toEqual([2, 18]);
    expect(toggleNag([2], 2)).toEqual([]);
  });
});

describe('buildLines', () => {
  it('lays out notation like a book: numbers, notes and indented side lines', () => {
    const tree = parse('{Intro} 1. e4 e5 2. Nf3 {develops} Nc6 (2... d6 {solid} 3. d4) 3. Bb5 *');
    const lines = buildLines(tree.root);
    const text = lines.map((line) =>
      line.kind === 'comment'
        ? `[${line.depth}] "${line.text}"`
        : `[${line.depth}] ` +
          (line as MovesLine).items
            .map((i) => (i.kind === 'note' ? `(${i.text})` : `${i.number ?? ''}${i.node.san}`))
            .join(' '),
    );

    expect(text).toEqual([
      '[0] "Intro"',
      '[0] 1.e4 e5 2.Nf3',
      '[0] "develops"',
      '[0] 2…Nc6',
      '[1] 2…d6 (solid) 3.d4',
      '[0] 3.Bb5',
    ]);
  });
});

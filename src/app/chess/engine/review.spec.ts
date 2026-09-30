import {
  classifyMove,
  formatEval,
  moveAccuracy,
  reconcile,
  winningChances,
  winPercent,
} from './review';

const at = (cp: number, best = 'e2e4') => ({ depth: 12, cp, pv: [best] });

describe('game review maths', () => {
  it('turns centipawns into winning chances', () => {
    expect(winningChances({ cp: 0 })).toBe(0);
    expect(winPercent({ cp: 0 })).toBe(50);
    expect(winningChances({ cp: 300 })).toBeCloseTo(0.5, 1);
    expect(winningChances({ mate: 3 })).toBeCloseTo(winningChances({ cp: 1000 }));
    expect(winningChances({ mate: -2 })).toBeLessThan(-0.9);
  });

  it('classifies moves by the drop in the mover’s chances', () => {
    expect(classifyMove(at(20), at(10), 'white', 'e2e4')).toBe('best');
    expect(classifyMove(at(20), at(10), 'white', 'd2d4')).toBe('good');
    expect(classifyMove(at(40), at(-40), 'white', 'd2d4')).toBe('inaccuracy');
    expect(classifyMove(at(50), at(-60), 'white', 'd2d4')).toBe('mistake');
    expect(classifyMove(at(0), at(150), 'black', 'e7e5')).toBe('mistake');
    expect(classifyMove(at(0), at(300), 'black', 'e7e5')).toBe('blunder');
    expect(classifyMove(at(0), at(900), 'black', 'e7e5')).toBe('blunder');
    // A move that improves the mover's position is never an error.
    expect(classifyMove(at(-200), at(100), 'white', 'd2d4')).toBe('good');
  });

  it('trusts the deeper evaluation when the game followed the engine', () => {
    // The Opera game, 15. Bxd7+ Nxd7 16. Qb8+: at depth 12 the engine misses the
    // queen sacrifice after 15. Bxd7+ and only sees the mate a move later.
    const evals = [
      { depth: 12, cp: 801, pv: ['g5f6'] }, // before 15. Bxd7+
      { depth: 12, cp: 242, pv: ['f6d7'] }, // before 15... Nxd7 (horizon effect)
      { depth: 12, mate: 2, pv: ['b3b8'] }, // before 16. Qb8+
    ];
    const played = ['b5d7', 'f6d7'];
    const fixed = reconcile(evals, played);
    expect(fixed[1].mate).toBe(2);
    expect(fixed[0].cp).toBe(801); // 15. Bxd7+ wasn't the engine's choice: kept
    expect(classifyMove(fixed[0], fixed[1], 'white', played[0])).toBe('good');
    expect(classifyMove(fixed[1], fixed[2], 'black', played[1])).toBe('best');
    // Without reconciling, the winning sacrifice would be called a blunder.
    expect(classifyMove(evals[0], evals[1], 'white', played[0])).toBe('blunder');
  });

  it('scores accuracy near 100 for good moves and low for blunders', () => {
    expect(moveAccuracy(at(20), at(20), 'white')).toBeGreaterThan(99.9);
    expect(moveAccuracy(at(20), at(15), 'white')).toBeGreaterThan(97);
    expect(moveAccuracy(at(0), at(-900), 'white')).toBeLessThan(25);
    expect(moveAccuracy(at(0), at(900), 'black')).toBeLessThan(25);
  });

  it('formats evaluations the way players read them', () => {
    expect(formatEval({ cp: 134 })).toBe('+1.3');
    expect(formatEval({ cp: -40 })).toBe('−0.4');
    expect(formatEval({ cp: 0 })).toBe('0.0');
    expect(formatEval({ mate: 3 })).toBe('#3');
    expect(formatEval({ mate: -2 })).toBe('−#2');
  });
});

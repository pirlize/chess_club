import { ChessopsRules } from '../../chess/adapters/chessops-rules';
import { uciToMove } from '../../chess/chess-rules';
import { LESSONS } from './lessons';

const rules = new ChessopsRules();

describe('beginner lessons', () => {
  it('have unique slugs and texts in both languages', () => {
    expect(new Set(LESSONS.map((l) => l.slug)).size).toBe(LESSONS.length);
    for (const lesson of LESSONS) {
      for (const step of lesson.steps) {
        expect(step.text.el.length, lesson.slug).toBeGreaterThan(0);
        expect(step.text.en.length, lesson.slug).toBeGreaterThan(0);
      }
    }
  });

  for (const lesson of LESSONS) {
    for (const [index, step] of lesson.steps.entries()) {
      const exercise = step.exercise;
      if (!exercise) continue;

      it(`${lesson.slug} #${index + 1}: position is legal and every accepted answer works`, () => {
        const fen = rules.normalizeFen(exercise.fen);
        expect(fen, 'legal position').not.toBeNull();
        let position = fen!;
        for (const [ply, step] of exercise.solution.entries()) {
          const options = typeof step === 'string' ? [step] : [...step];
          for (const uci of options) {
            const played = rules.play(position, uciToMove(uci));
            expect(played, `${uci} is legal`).not.toBeNull();
            const last = ply === exercise.solution.length - 1;
            if (last && exercise.anyMate) {
              expect(rules.status(played!.fen).checkmate, `${uci} mates`).toBe(true);
            }
          }
          position = rules.play(position, uciToMove(options[0]))!.fen;
        }
      });
    }
  }
});

import type { BoardShape, Color } from '../../chess/model';
import type { PuzzleStep } from '../../chess/puzzle-board/puzzle-board';
import type { IconName } from '../../ui/icon';

/**
 * "First steps" course for complete beginners. Texts are Markdown in both
 * languages; boards are static illustrations unless the step has an exercise.
 * lessons.spec.ts checks every exercise position and answer is legal.
 */

export interface Localized {
  el: string;
  en: string;
}

export interface Exercise {
  task: Localized;
  solution: readonly PuzzleStep[];
  /** Accept any checkmate as the answer. */
  anyMate?: boolean;
}

export interface LessonStep {
  text: Localized;
  fen?: string;
  shapes?: BoardShape[];
  orientation?: Color;
  exercise?: Exercise & { fen: string };
}

export interface Lesson {
  slug: string;
  icon: IconName;
  title: Localized;
  summary: Localized;
  steps: LessonStep[];
}

const EMPTY = '8/8/8/8/8/8/8/8 w - - 0 1';
const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const arrows = (
  from: string,
  targets: string[],
  color: BoardShape['color'] = 'green',
): BoardShape[] => targets.map((to) => ({ from, to, color }) as BoardShape);
const dots = (squares: string[], color: BoardShape['color'] = 'green'): BoardShape[] =>
  squares.map((sq) => ({ from: sq, to: sq, color }) as BoardShape);

export const LESSONS: Lesson[] = [
  {
    slug: 'board',
    icon: 'board',
    title: { el: 'Η σκακιέρα', en: 'The board' },
    summary: {
      el: 'Τετράγωνα, γραμμές, στήλες και η αρχική θέση.',
      en: 'Squares, ranks, files and the starting position.',
    },
    steps: [
      {
        text: {
          el: 'Η σκακιέρα έχει **64 τετράγωνα**, 8 × 8, εναλλάξ ανοιχτά και σκούρα. Τοποθετείται έτσι ώστε κάθε παίκτης να έχει **ανοιχτό τετράγωνο στη δεξιά γωνία**.',
          en: 'The board has **64 squares**, 8 × 8, alternating light and dark. It is placed so that each player has a **light square in the right-hand corner**.',
        },
        fen: EMPTY,
        shapes: dots(['h1'], 'yellow'),
      },
      {
        text: {
          el: 'Οι κάθετες **στήλες** έχουν γράμματα **a–h** και οι οριζόντιες **γραμμές** αριθμούς **1–8**. Έτσι κάθε τετράγωνο έχει όνομα: εδώ φωτίζεται το **e4**.',
          en: 'The vertical **files** are lettered **a–h** and the horizontal **ranks** numbered **1–8**, so every square has a name: here **e4** is highlighted.',
        },
        fen: EMPTY,
        shapes: [...dots(['e4']), ...arrows('e1', ['e4'], 'blue'), ...arrows('a4', ['e4'], 'blue')],
      },
      {
        text: {
          el: 'Η **αρχική θέση**: πιόνια μπροστά, πύργοι στις γωνίες, μετά ίπποι, αξιωματικοί, και στη μέση βασίλισσα και βασιλιάς. Κανόνας: **η βασίλισσα μπαίνει στο χρώμα της** (λευκή σε λευκό τετράγωνο). Τα λευκά παίζουν πρώτα.',
          en: 'The **starting position**: pawns in front, rooks in the corners, then knights, bishops, and the queen and king in the middle. Rule of thumb: **the queen goes on her own colour**. White moves first.',
        },
        fen: START,
        shapes: dots(['d1', 'd8'], 'yellow'),
      },
      {
        text: {
          el: [
            'Κάθε κομμάτι έχει ένα **γράμμα**, για να γράφουμε τις κινήσεις. Υπάρχουν δύο συνήθειες, η αγγλική (διεθνής) και η ελληνική:',
            '',
            '| Κομμάτι | Αγγλικά | Ελληνικά |',
            '|---|---|---|',
            '| Βασιλιάς | K | Ρ (Ρήγας) |',
            '| Βασίλισσα | Q | Β |',
            '| Πύργος | R | Π |',
            '| Αξιωματικός | B | Α |',
            '| Ίππος | N | Ι |',
            '',
            'Τα πιόνια δεν έχουν γράμμα. Με το κουμπί **Nf3 / Ιf3** πάνω δεξιά διαλέγεις ποια σημειογραφία βλέπεις σε όλη την εφαρμογή.',
          ].join('\n'),
          en: [
            'Each piece has a **letter** used to write moves down. There are two conventions, English (international) and Greek:',
            '',
            '| Piece | English | Greek |',
            '|---|---|---|',
            '| King | K | Ρ (Ρήγας) |',
            '| Queen | Q | Β |',
            '| Rook | R | Π |',
            '| Bishop | B | Α |',
            '| Knight | N | Ι |',
            '',
            'Pawns have no letter. The **Nf3 / Ιf3** button at the top right picks which notation you see throughout the app.',
          ].join('\n'),
        },
        fen: START,
        shapes: dots(['e1', 'd1', 'a1', 'c1', 'b1'], 'blue'),
      },
    ],
  },
  {
    slug: 'rook-bishop',
    icon: 'arrow-up',
    title: { el: 'Πύργος και αξιωματικός', en: 'Rook and bishop' },
    summary: {
      el: 'Οι δύο κομμάτια που κινούνται σε ευθείες.',
      en: 'The two pieces that move in straight lines.',
    },
    steps: [
      {
        text: {
          el: 'Ο **πύργος** κινείται όσα τετράγωνα θέλει **οριζόντια ή κάθετα**, αρκεί να μην τον εμποδίζει άλλο κομμάτι.',
          en: 'The **rook** moves any number of squares **horizontally or vertically**, as long as nothing is in the way.',
        },
        fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
        shapes: arrows('d4', ['d8', 'd1', 'a4', 'h4']),
      },
      {
        text: {
          el: 'Τα κομμάτια **τρώνε** πηγαίνοντας στο τετράγωνο ενός αντίπαλου κομματιού.',
          en: 'Pieces **capture** by moving onto the square of an enemy piece.',
        },
        exercise: {
          fen: '4k3/8/8/3p4/8/8/3R4/4K3 w - - 0 1',
          task: { el: 'Φάε το πιόνι με τον πύργο.', en: 'Capture the pawn with the rook.' },
          solution: ['d2d5'],
        },
      },
      {
        text: {
          el: 'Ο **αξιωματικός** κινείται όσα τετράγωνα θέλει **διαγώνια**. Γι’ αυτό μένει πάντα στο ίδιο χρώμα τετραγώνων.',
          en: 'The **bishop** moves any number of squares **diagonally**, so it always stays on the same colour of square.',
        },
        fen: '8/8/8/8/3B4/8/8/8 w - - 0 1',
        shapes: arrows('d4', ['h8', 'a7', 'a1', 'g1']),
      },
      {
        text: { el: 'Δοκίμασε τώρα με τον αξιωματικό.', en: 'Now try with the bishop.' },
        exercise: {
          fen: '4k3/8/8/8/5n2/8/3B4/4K3 w - - 0 1',
          task: {
            el: 'Φάε τον ίππο με τον αξιωματικό.',
            en: 'Capture the knight with the bishop.',
          },
          solution: ['d2f4'],
        },
      },
    ],
  },
  {
    slug: 'queen-king',
    icon: 'sparkle',
    title: { el: 'Βασίλισσα και βασιλιάς', en: 'Queen and king' },
    summary: {
      el: 'Το πιο δυνατό κομμάτι και το πιο σημαντικό.',
      en: 'The strongest piece and the most important one.',
    },
    steps: [
      {
        text: {
          el: 'Η **βασίλισσα** κινείται σαν πύργος **και** σαν αξιωματικός: σε όλες τις κατευθύνσεις, όσα τετράγωνα θέλει. Είναι το πιο δυνατό κομμάτι.',
          en: 'The **queen** moves like a rook **and** a bishop: in every direction, as far as she likes. She is the strongest piece.',
        },
        fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
        shapes: arrows('d4', ['d8', 'd1', 'a4', 'h4', 'h8', 'a7', 'a1', 'g1']),
      },
      {
        text: { el: 'Χρησιμοποίησε τη δύναμή της.', en: 'Use her power.' },
        exercise: {
          fen: '4k3/8/8/1r6/8/8/8/1Q2K3 w - - 0 1',
          task: { el: 'Φάε τον πύργο με τη βασίλισσα.', en: 'Capture the rook with the queen.' },
          solution: ['b1b5'],
        },
      },
      {
        text: {
          el: 'Ο **βασιλιάς** κινείται **ένα τετράγωνο** προς κάθε κατεύθυνση. Δεν επιτρέπεται ποτέ να μπει σε τετράγωνο που απειλείται. Αν χαθεί ο βασιλιάς, χάνεται η παρτίδα!',
          en: 'The **king** moves **one square** in any direction. He may never move onto a square that is attacked. Lose the king and you lose the game!',
        },
        fen: '8/8/8/8/3K4/8/8/8 w - - 0 1',
        shapes: dots(['c3', 'c4', 'c5', 'd3', 'd5', 'e3', 'e4', 'e5']),
      },
      {
        text: {
          el: 'Ο βασιλιάς μπορεί να φάει κομμάτια που δεν προστατεύονται.',
          en: 'The king can capture pieces that are not protected.',
        },
        exercise: {
          fen: '8/8/8/8/3k4/8/3p4/4K3 w - - 0 1',
          task: {
            el: 'Το πιόνι κάνει σαχ! Φάε το με τον βασιλιά.',
            en: 'The pawn gives check! Take it with the king.',
          },
          solution: ['e1d2'],
        },
      },
    ],
  },
  {
    slug: 'knight',
    icon: 'pawn',
    title: { el: 'Ο ίππος', en: 'The knight' },
    summary: { el: 'Το μόνο κομμάτι που πηδάει.', en: 'The only piece that jumps.' },
    steps: [
      {
        text: {
          el: 'Ο **ίππος** κινείται σε σχήμα **Γ**: δύο τετράγωνα προς μία κατεύθυνση και ένα στο πλάι. Είναι το μόνο κομμάτι που **πηδάει πάνω από άλλα**. Κάθε φορά αλλάζει χρώμα τετραγώνου.',
          en: 'The **knight** moves in an **L-shape**: two squares one way and one to the side. It is the only piece that **jumps over others**, and it changes square colour every move.',
        },
        fen: '8/8/8/8/3N4/8/8/8 w - - 0 1',
        shapes: dots(['b3', 'b5', 'c2', 'c6', 'e2', 'e6', 'f3', 'f5']),
      },
      {
        text: { el: 'Βρες το άλμα του ίππου.', en: 'Find the knight’s jump.' },
        exercise: {
          fen: '4k3/8/8/4r3/8/3N4/8/4K3 w - - 0 1',
          task: { el: 'Φάε τον πύργο με τον ίππο.', en: 'Capture the rook with the knight.' },
          solution: ['d3e5'],
        },
      },
    ],
  },
  {
    slug: 'pawn',
    icon: 'pawn',
    title: { el: 'Το πιόνι', en: 'The pawn' },
    summary: {
      el: 'Μικρό, αλλά μπορεί να γίνει βασίλισσα.',
      en: 'Small, but it can become a queen.',
    },
    steps: [
      {
        text: {
          el: 'Το **πιόνι** προχωρά **ένα τετράγωνο ευθεία μπροστά**. Στην **πρώτη του κίνηση** μπορεί να προχωρήσει **δύο**. Δεν γυρίζει ποτέ πίσω.',
          en: 'The **pawn** moves **one square straight ahead**. On its **first move** it may move **two**. It never moves backwards.',
        },
        fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
        shapes: arrows('e2', ['e3', 'e4']),
      },
      {
        text: {
          el: 'Προσοχή: το πιόνι **τρώει διαγώνια**, ένα τετράγωνο μπροστά.',
          en: 'Careful: the pawn **captures diagonally**, one square forward.',
        },
        exercise: {
          fen: '4k3/8/8/3n4/4P3/8/8/4K3 w - - 0 1',
          task: { el: 'Φάε τον ίππο με το πιόνι.', en: 'Capture the knight with the pawn.' },
          solution: ['e4d5'],
        },
      },
      {
        text: {
          el: 'Όταν ένα πιόνι φτάσει στην **τελευταία γραμμή**, γίνεται **προαγωγή**: αλλάζει σε βασίλισσα, πύργο, αξιωματικό ή ίππο. Σχεδόν πάντα διαλέγουμε βασίλισσα!',
          en: 'When a pawn reaches the **last rank** it **promotes**: it becomes a queen, rook, bishop or knight. Almost always, choose a queen!',
        },
        exercise: {
          fen: '4k3/1P6/8/8/8/8/8/4K3 w - - 0 1',
          task: { el: 'Κάνε το πιόνι βασίλισσα.', en: 'Promote the pawn to a queen.' },
          solution: ['b7b8q'],
        },
      },
    ],
  },
  {
    slug: 'special-moves',
    icon: 'sparkle',
    title: { el: 'Ειδικές κινήσεις', en: 'Special moves' },
    summary: { el: 'Το ροκέ και το αν πασάν.', en: 'Castling and en passant.' },
    steps: [
      {
        text: {
          el: 'Το **ροκέ** κρύβει τον βασιλιά και φέρνει τον πύργο στο παιχνίδι: ο βασιλιάς πηγαίνει **δύο τετράγωνα** προς τον πύργο και ο πύργος πηδάει δίπλα του. Επιτρέπεται μόνο αν δεν έχουν κινηθεί ούτε ο βασιλιάς ούτε ο πύργος, τα τετράγωνα ανάμεσα είναι άδεια και ο βασιλιάς δεν είναι ή δεν περνάει από σαχ.',
          en: '**Castling** tucks the king away and brings a rook into play: the king moves **two squares** towards the rook and the rook jumps next to it. It is only allowed if neither has moved, the squares between are empty, and the king is not in, or passing through, check.',
        },
        exercise: {
          fen: '4k3/8/8/8/8/8/8/4K2R w K - 0 1',
          task: {
            el: 'Κάνε μικρό ροκέ: σύρε τον βασιλιά δύο τετράγωνα δεξιά.',
            en: 'Castle short: move the king two squares to the right.',
          },
          solution: ['e1g1'],
        },
      },
      {
        text: {
          el: 'Το **αν πασάν** («εν διελεύσει»): αν ένα αντίπαλο πιόνι προχωρήσει δύο τετράγωνα και σταθεί δίπλα στο δικό σου, μπορείς **αμέσως** να το φας σαν να είχε προχωρήσει μόνο ένα.',
          en: '**En passant** (“in passing”): if an enemy pawn moves two squares and lands beside yours, you may capture it **straight away** as if it had moved only one.',
        },
        exercise: {
          fen: '4k3/8/8/3pP3/8/8/8/4K3 w - d6 0 1',
          task: {
            el: 'Το μαύρο πιόνι μόλις ήρθε στο d5. Φάε το αν πασάν.',
            en: 'The black pawn just moved to d5. Capture it en passant.',
          },
          solution: ['e5d6'],
        },
      },
    ],
  },
  {
    slug: 'check-mate',
    icon: 'trophy',
    title: { el: 'Σαχ, ματ και πατ', en: 'Check, mate and stalemate' },
    summary: {
      el: 'Πώς κερδίζεται (ή δεν κερδίζεται) μια παρτίδα.',
      en: 'How a game is won, or not.',
    },
    steps: [
      {
        text: {
          el: '**Σαχ** σημαίνει ότι ο βασιλιάς απειλείται. Πρέπει αμέσως να σωθεί: να φύγει, να μπει κάποιο κομμάτι στη μέση ή να φαγωθεί το κομμάτι που κάνει σαχ.',
          en: '**Check** means the king is attacked. It must be saved at once: move the king, block, or capture the checking piece.',
        },
        fen: '4k3/8/8/8/8/8/8/4R1K1 b - - 0 1',
        shapes: arrows('e1', ['e8'], 'red'),
      },
      {
        text: {
          el: '**Ματ** είναι σαχ από το οποίο ο βασιλιάς δεν μπορεί να σωθεί. Όποιος κάνει ματ **κερδίζει**. Ένα κλασικό: το ματ στην τελευταία γραμμή, όταν τα πιόνια φυλακίζουν τον δικό τους βασιλιά.',
          en: '**Checkmate** is a check the king cannot escape. Whoever gives mate **wins**. A classic: the back-rank mate, when the king is trapped by its own pawns.',
        },
        exercise: {
          fen: '6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1',
          task: { el: 'Κάνε ματ σε μία κίνηση.', en: 'Checkmate in one move.' },
          solution: ['a1a8'],
          anyMate: true,
        },
      },
      {
        text: {
          el: 'Βασίλισσα και βασιλιάς μαζί κάνουν ματ εύκολα: ο βασιλιάς προστατεύει τη βασίλισσα που πλησιάζει τον αντίπαλο βασιλιά.',
          en: 'Queen and king together mate easily: the king protects the queen as she walks up to the enemy king.',
        },
        exercise: {
          fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1',
          task: {
            el: 'Κάνε ματ σε μία κίνηση με τη βασίλισσα.',
            en: 'Checkmate in one with the queen.',
          },
          solution: ['g1g7'],
          anyMate: true,
        },
      },
      {
        text: {
          el: '**Πατ** είναι όταν ο παίκτης που παίζει **δεν έχει καμία νόμιμη κίνηση** αλλά **δεν** είναι σε σαχ. Η παρτίδα λήγει **ισόπαλη**! Εδώ παίζουν τα μαύρα και δεν μπορούν να κουνηθούν. Όταν κερδίζεις, πρόσεχε να αφήνεις χώρο στον αντίπαλο βασιλιά.',
          en: '**Stalemate** is when the player to move **has no legal move** but is **not** in check. The game is a **draw**! Here Black is to move and cannot. When you are winning, leave the enemy king some room.',
        },
        fen: '7k/5Q2/6K1/8/8/8/8/8 b - - 0 1',
        shapes: dots(['g8', 'h7', 'g7'], 'red'),
      },
    ],
  },
  {
    slug: 'notation',
    icon: 'news',
    title: { el: 'Πώς γράφουμε τις κινήσεις', en: 'Writing moves down' },
    summary: {
      el: 'Για να διαβάζεις τις παρτίδες του συλλόγου.',
      en: 'So you can read the club’s games.',
    },
    steps: [
      {
        text: {
          el: 'Κάθε κίνηση γράφεται με το **γράμμα του κομματιού** και το **τετράγωνο** που πηγαίνει. Τα γράμματα είναι αγγλικά ή ελληνικά: **K / Ρ** βασιλιάς, **Q / Β** βασίλισσα, **R / Π** πύργος, **B / Α** αξιωματικός, **N / Ι** ίππος. Έτσι η ίδια κίνηση γράφεται **Nf3** ή **Ιf3**. Τα πιόνια δεν έχουν γράμμα: **e4** σημαίνει «πιόνι στο e4». Στα βιβλία και στο διαδίκτυο θα βρεις και τα δύο· εδώ διαλέγεις με το κουμπί **Nf3 / Ιf3** πάνω δεξιά.',
          en: 'A move is written as the **piece letter** plus the **square** it goes to. The letters are English or Greek: **K / Ρ** king, **Q / Β** queen, **R / Π** rook, **B / Α** bishop, **N / Ι** knight, so the same move is **Nf3** or **Ιf3**. Pawns have no letter: **e4** means “pawn to e4”. Books and websites use both; here you choose with the **Nf3 / Ιf3** button at the top right.',
        },
        fen: 'rnbqkbnr/pppppppp/8/8/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1',
        shapes: [...arrows('e2', ['e4']), ...arrows('g1', ['f3'])],
      },
      {
        text: {
          el: 'Άλλα σύμβολα: **x** τρώει (Nxe5 ή Ιxe5), **+** σαχ, **#** ματ, **O-O** μικρό ροκέ, **O-O-O** μεγάλο ροκέ. Τα **!** και **?** είναι σχόλια: καλή κίνηση ή λάθος.',
          en: 'Other symbols: **x** captures (Nxe5), **+** check, **#** mate, **O-O** castles short, **O-O-O** castles long. **!** and **?** are comments: good move or mistake.',
        },
        exercise: {
          fen: START,
          task: {
            el: 'Παίξε την κίνηση Nf3 (στα ελληνικά Ιf3).',
            en: 'Play the move Nf3 (Ιf3 in Greek).',
          },
          solution: ['g1f3'],
        },
      },
    ],
  },
  {
    slug: 'opening-principles',
    icon: 'analysis',
    title: { el: 'Αξίες κομματιών και σωστό ξεκίνημα', en: 'Piece values and a good start' },
    summary: {
      el: 'Τι αξίζει κάθε κομμάτι και πώς ξεκινάμε.',
      en: 'What each piece is worth and how to begin.',
    },
    steps: [
      {
        text: {
          el: 'Οι **αξίες** των κομματιών (σε πιόνια): πιόνι **1**, ίππος **3**, αξιωματικός **3**, πύργος **5**, βασίλισσα **9**. Ο βασιλιάς είναι ανεκτίμητος. Όταν μπορείς να φας, πάρε το πιο πολύτιμο!',
          en: 'Piece **values** (in pawns): pawn **1**, knight **3**, bishop **3**, rook **5**, queen **9**. The king is priceless. When you can capture, take the most valuable piece!',
        },
        exercise: {
          fen: '4k3/8/8/1r1p4/8/2N5/8/4K3 w - - 0 1',
          task: {
            el: 'Ο ίππος μπορεί να φάει πιόνι ή πύργο. Διάλεξε σωστά.',
            en: 'The knight can take a pawn or a rook. Choose well.',
          },
          solution: ['c3b5'],
        },
      },
      {
        text: {
          el: 'Τρεις κανόνες για το άνοιγμα: **1)** πιάσε το **κέντρο** με πιόνια (e4, d4), **2)** βγάλε **ίππους και αξιωματικούς**, **3)** κάνε **ροκέ** νωρίς. Μην βγάζεις τη βασίλισσα από την αρχή.',
          en: 'Three opening rules: **1)** take the **centre** with pawns (e4, d4), **2)** bring out **knights and bishops**, **3)** **castle** early. Don’t bring the queen out at the start.',
        },
        exercise: {
          fen: START,
          task: { el: 'Παίξε ένα πιόνι στο κέντρο.', en: 'Play a pawn to the centre.' },
          solution: [['e2e4', 'd2d4']],
          anyMate: false,
        },
      },
      {
        text: { el: 'Τώρα ένα κομμάτι.', en: 'Now a piece.' },
        exercise: {
          fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
          task: {
            el: 'Βγάλε έναν ίππο προς το κέντρο.',
            en: 'Develop a knight towards the centre.',
          },
          solution: [['g1f3', 'b1c3']],
          anyMate: false,
        },
      },
    ],
  },
  {
    slug: 'first-traps',
    icon: 'trophy',
    title: { el: 'Η πρώτη παγίδα: το ματ του μαθητή', en: 'Your first trap: Scholar’s Mate' },
    summary: {
      el: 'Πώς γίνεται, και πώς να μην σου το κάνουν.',
      en: 'How it works, and how to avoid it.',
    },
    steps: [
      {
        text: {
          el: 'Το **ματ του μαθητή**: η βασίλισσα και ο αξιωματικός επιτίθενται μαζί στο **f7**, το αδύναμο σημείο δίπλα στον βασιλιά. Εδώ τα μαύρα μόλις έπαιξαν Nf6, που δεν προστατεύει το f7.',
          en: '**Scholar’s Mate**: the queen and bishop attack **f7** together, the weak square next to the king. Black has just played Nf6, which doesn’t defend f7.',
        },
        exercise: {
          fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
          task: { el: 'Κάνε ματ σε μία κίνηση.', en: 'Checkmate in one move.' },
          solution: ['h5f7'],
          anyMate: true,
        },
      },
      {
        text: {
          el: 'Τώρα από την άλλη πλευρά: η λευκή βασίλισσα και ο αξιωματικός απειλούν ματ στο f7. Είσαι με τα **μαύρα**: προστάτεψε το f7 ή κλείσε τη διαγώνιο της βασίλισσας.',
          en: 'Now from the other side: White’s queen and bishop threaten mate on f7. You are **Black**: defend f7 or block the queen’s diagonal.',
        },
        exercise: {
          fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
          task: { el: 'Σώσε τα μαύρα από το ματ.', en: 'Save Black from mate.' },
          solution: [['d8e7', 'd8f6', 'g7g6']],
          anyMate: false,
        },
      },
    ],
  },
];

export const lessonBySlug = (slug: string) => LESSONS.find((l) => l.slug === slug);

export const exerciseCount = (lesson: Lesson) => lesson.steps.filter((s) => s.exercise).length;

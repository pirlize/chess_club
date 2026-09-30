import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import { form, FormField, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Notation, SanPipe } from '../../core/notation';
import { GAME_RESULTS, type GameDetail, type GameInput } from '../../../../shared/models';
import { Board } from '../../chess/board/board';
import { ChessRules, PgnError, type ParsedGame, type ParseWarning } from '../../chess/chess-rules';
import { GameControls } from '../../chess/game-controls/game-controls';
import { GameSession } from '../../chess/game-session';
import {
  createTree,
  endOfLine,
  hasAnnotations,
  isOnMainline,
  mainline,
  moveLabel,
} from '../../chess/game-tree';
import { isMove, type MoveInput, type PromotionPiece } from '../../chess/model';
import { MoveList } from '../../chess/move-list/move-list';
import { MOVE_NAGS, POSITION_NAGS } from '../../chess/nags';
import { ClubDatePipe, formatResult } from '../../core/format';
import { readStorage, removeStorage, writeStorage } from '../../core/storage';
import { FieldError } from '../../ui/field-error';
import { Icon } from '../../ui/icon';
import { ErrorState } from '../../ui/states';
import { CATEGORY_OPTIONS } from '../games/game-card';
import { EditorBar } from './editor-bar';
import { EMPTY_GAME_META, metaFromHeaders, writeHeaders, type GameMeta } from './game-meta';
import { ResourceEditor } from './resource-editor';

interface GameBackup {
  savedAt: string;
  meta: GameMeta;
  pgn: string;
}

const PROMOTION_PIECES: { piece: PromotionPiece; white: string; black: string }[] = [
  { piece: 'queen', white: '♕', black: '♛' },
  { piece: 'rook', white: '♖', black: '♜' },
  { piece: 'bishop', white: '♗', black: '♝' },
  { piece: 'knight', white: '♘', black: '♞' },
];

/**
 * Import a PGN (pasted from the coach's email or dropped as a file), then
 * annotate: notes per move, !/? symbols, arrows, and extra lines played on the board.
 */
@Component({
  selector: 'app-game-editor',
  providers: [GameSession],
  imports: [
    SanPipe,
    FormRoot,
    FormField,
    RouterLink,
    TranslocoPipe,
    Board,
    GameControls,
    MoveList,
    FieldError,
    Icon,
    ErrorState,
    EditorBar,
    ClubDatePipe,
  ],
  templateUrl: './game-editor.html',
  styleUrl: './game-editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameEditor extends ResourceEditor<'games', GameMeta> {
  protected readonly resource = 'games';

  protected readonly session = inject(GameSession);
  private readonly rules = inject(ChessRules);
  private readonly notation = inject(Notation);

  protected readonly stage = signal<'import' | 'pick' | 'edit'>('import');
  protected readonly pgnText = signal('');
  /** Translation key of the last import problem. */
  protected readonly importError = signal<string | null>(null);
  protected readonly candidates = signal<ParsedGame[]>([]);
  protected readonly warnings = signal<ParseWarning[]>([]);
  protected readonly tab = signal<'notes' | 'details'>('notes');
  protected readonly promotion = signal<MoveInput | null>(null);
  protected readonly dragging = signal(false);
  protected readonly backup = signal<GameBackup | null>(null);
  /** Tree version at the last load/save; anything newer is unsaved. */
  private readonly savedVersion = signal(0);

  protected readonly categories = CATEGORY_OPTIONS;
  protected readonly results = GAME_RESULTS.map((value) => ({
    value,
    symbol: value === '*' ? '*' : formatResult(value),
  }));
  protected readonly moveNags = MOVE_NAGS;
  protected readonly positionNags = POSITION_NAGS;
  protected readonly promotionPieces = PROMOTION_PIECES;

  protected readonly form = form(
    this.model,
    (p) => {
      required(p.white, { message: 'gameEditor.whiteRequired' });
      required(p.black, { message: 'gameEditor.blackRequired' });
      pattern(p.eco, /^([A-Ea-e]\d\d)?$/, { message: 'gameEditor.ecoPattern' });
      maxLength(p.title, 120, { message: 'gameEditor.titleMax' });
    },
    {
      submission: {
        action: async () => void (await this.persist()),
        onInvalid: () => this.tab.set('details'),
      },
    },
  );

  protected readonly headline = computed(() => {
    const m = this.model();
    const { t } = this.language;
    this.language.current();
    if (m.title) return m.title;
    if (m.white || m.black) return t('games.vs', { white: m.white || '?', black: m.black || '?' });
    return t(this.isNew() ? 'gameEditor.newGame' : 'gameEditor.editGame');
  });

  /** The selected move, or null at the starting position. */
  protected readonly selected = computed(() => {
    this.session.version();
    const node = this.session.current();
    if (!node || !isMove(node)) return null;
    return {
      node,
      label: moveLabel(node),
      comment: node.comment,
      nags: node.nags,
      inVariation: !isOnMainline(node),
      shapes: node.shapes.length,
    };
  });

  protected readonly rootShapes = computed(() => {
    this.session.version();
    return this.session.tree()?.root.shapes.length ?? 0;
  });

  protected readonly promotionColor = computed(() => {
    const node = this.session.current();
    return node ? this.rules.turn(node.fen) : 'white';
  });

  private readonly backupKey = computed(() => `cc:game-draft:${this.id() ?? 'new'}`);

  constructor() {
    super();
    this.session.editable.set(true);

    // Keep a local copy of unsaved work so a closed tab or flat battery loses nothing.
    effect((onCleanup) => {
      const meta = this.model();
      this.session.version();
      if (this.stage() !== 'edit' || !this.dirty()) return;
      const timer = setTimeout(() => untracked(() => this.writeBackup(meta)), 800);
      onCleanup(() => clearTimeout(timer));
    });
  }

  override ngOnInit(): void {
    super.ngOnInit();
    if (this.isNew()) this.offerBackup(null);
  }

  // ---- ResourceEditor hooks ------------------------------------------------

  protected emptyModel(): GameMeta {
    return { ...EMPTY_GAME_META };
  }

  protected toModel(game: GameDetail): GameMeta {
    const { pgn: _pgn, finalFen: _fen, id: _id, updatedAt: _updated, ...meta } = game;
    return { ...meta, playedOn: game.playedOn ?? '' };
  }

  protected toInput(meta: GameMeta): GameInput {
    const tree = this.session.tree();
    if (!tree) throw new Error('No game loaded');
    writeHeaders(tree.headers, meta);
    return {
      ...meta,
      eco: meta.eco.toUpperCase(),
      playedOn: meta.playedOn || null,
      pgn: this.rules.writePgn(tree),
      finalFen: endOfLine(tree.root).fen,
    };
  }

  protected override hasOtherChanges(): boolean {
    return this.stage() === 'edit' && this.session.version() !== this.savedVersion();
  }

  protected override afterLoad(game: GameDetail): void {
    try {
      const [{ tree, warnings }] = this.rules.parsePgn(game.pgn);
      this.session.load(tree);
      this.warnings.set(warnings);
    } catch (error) {
      this.loadError.set(
        this.language.t(error instanceof PgnError ? 'pgn.noMoves' : 'game.unreadable'),
      );
      return;
    }
    this.savedVersion.set(this.session.version());
    this.stage.set('edit');
    this.offerBackup(game.updatedAt);
  }

  protected override afterSave(): void {
    this.savedVersion.set(this.session.version());
    removeStorage(this.backupKey());
  }

  protected override afterDelete(): void {
    removeStorage(this.backupKey());
  }

  // ---- Import --------------------------------------------------------------

  protected importPgn(): void {
    this.importError.set(null);
    try {
      const games = this.rules.parsePgn(this.pgnText());
      if (games.length === 1) {
        this.useGame(games[0]);
      } else {
        this.candidates.set(games);
        this.stage.set('pick');
      }
    } catch (error) {
      this.importError.set(error instanceof PgnError ? 'pgn.noMoves' : 'gameEditor.unreadable');
    }
  }

  protected useGame({ tree, warnings }: ParsedGame): void {
    // A note before the first move becomes the game's introduction.
    const intro = tree.root.comment;
    tree.root.comment = '';
    this.session.load(tree);
    this.warnings.set(warnings);
    this.model.update((m) => ({
      ...m,
      ...metaFromHeaders(tree.headers),
      summary: m.summary || intro,
    }));
    this.stage.set('edit');
    this.tab.set(this.model().white && this.model().black ? 'notes' : 'details');
  }

  protected startFromBoard(): void {
    this.session.load(createTree());
    this.warnings.set([]);
    this.stage.set('edit');
    this.tab.set('details');
  }

  protected describe(game: ParsedGame) {
    const h = metaFromHeaders(game.tree.headers);
    const moves = Math.ceil(mainline(game.tree.root).length / 2);
    const { t } = this.language;
    return {
      title: t('games.vs', { white: h.white || '?', black: h.black || '?' }),
      subtitle: [
        h.event,
        h.playedOn,
        t('gameEditor.movesCount', { n: moves }),
        h.result !== '*' && formatResult(h.result ?? '*'),
      ]
        .filter(Boolean)
        .join(' · '),
    };
  }

  protected async onFileChosen(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (file) await this.readFile(file);
  }

  protected async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.dragging.set(false);
    const file = event.dataTransfer?.files[0];
    if (file) {
      await this.readFile(file);
    } else {
      const text = event.dataTransfer?.getData('text/plain');
      if (text) this.pgnText.set(text);
    }
  }

  private async readFile(file: File): Promise<void> {
    if (file.size > 2_000_000) {
      this.importError.set('gameEditor.tooLarge');
      return;
    }
    this.pgnText.set(await file.text());
    this.importPgn();
  }

  // ---- Annotating ----------------------------------------------------------

  protected onBoardMove(move: MoveInput): void {
    const node = this.session.current();
    if (node && this.rules.isPromotion(node.fen, move)) {
      this.promotion.set(move);
      return;
    }
    this.session.play(move);
  }

  protected choosePromotion(piece: PromotionPiece | null): void {
    const move = this.promotion();
    this.promotion.set(null);
    if (move && piece) this.session.play({ ...move, promotion: piece });
    else this.session.snapBack();
  }

  protected async deleteFromHere(): Promise<void> {
    const node = this.session.current();
    if (!node || !isMove(node)) return;
    if (node.children.length > 0 || hasAnnotations(node)) {
      const confirmed = await this.confirm.ask({
        title: this.language.t('gameEditor.deleteMovesTitle', {
          move: this.notation.format(moveLabel(node)),
        }),
        message: this.language.t('gameEditor.deleteMovesMessage'),
        confirmLabel: this.language.t('gameEditor.deleteMoves'),
        danger: true,
      });
      if (!confirmed) return;
    }
    this.session.deleteCurrent();
  }

  // ---- Local backup --------------------------------------------------------

  private writeBackup(meta: GameMeta): void {
    const tree = this.session.tree();
    if (!tree) return;
    const backup: GameBackup = {
      savedAt: new Date().toISOString(),
      meta,
      pgn: this.rules.writePgn(tree),
    };
    writeStorage(this.backupKey(), JSON.stringify(backup));
  }

  private offerBackup(serverUpdatedAt: string | null): void {
    const raw = readStorage(this.backupKey());
    if (!raw) return;
    try {
      const backup = JSON.parse(raw) as GameBackup;
      if (!serverUpdatedAt || backup.savedAt > serverUpdatedAt) this.backup.set(backup);
      else removeStorage(this.backupKey());
    } catch {
      removeStorage(this.backupKey());
    }
  }

  protected restoreBackup(): void {
    const backup = this.backup();
    this.backup.set(null);
    if (!backup) return;
    try {
      const [{ tree, warnings }] = this.rules.parsePgn(backup.pgn);
      this.session.load(tree);
      this.warnings.set(warnings);
      this.model.set(backup.meta);
      this.stage.set('edit');
      this.toaster.show(this.language.t('gameEditor.restored'), 'success');
    } catch {
      this.toaster.show(this.language.t('gameEditor.restoreFailed'), 'error');
    }
  }

  /** Import problems are codes; this turns one into a sentence in the active language. */
  protected describeWarning(warning: ParseWarning): string {
    return warning.code === 'illegal-move'
      ? this.language.t('pgn.illegalMove', { move: warning.move })
      : this.language.t('pgn.badFen');
  }

  protected discardBackup(): void {
    removeStorage(this.backupKey());
    this.backup.set(null);
  }
}

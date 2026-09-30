import { DecimalPipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
  type OnInit,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SanPipe } from '../../core/notation';
import { firstValueFrom } from 'rxjs';
import type { GameDetail } from '../../../../shared/models';
import { Board } from '../../chess/board/board';
import { ChessRules } from '../../chess/chess-rules';
import { GameControls } from '../../chess/game-controls/game-controls';
import { GameSession } from '../../chess/game-session';
import { createTree, mainline, moveLabel } from '../../chess/game-tree';
import { isMove, type GameTree, type MoveInput, type MoveNode } from '../../chess/model';
import { MoveList } from '../../chess/move-list/move-list';
import { Language } from '../../core/i18n';
import { readStorage, writeStorage } from '../../core/storage';
import { Toaster } from '../../core/toaster';
import { Icon } from '../../ui/icon';
import { EngineAnalysis } from './engine-analysis';
import { EvalGraph } from './eval-graph';

const STORAGE_KEY = 'cc:analysis';
const LEVELS = ['beginner', 'intermediate', 'advanced'] as const;
const SIDES = ['white', 'black'] as const;

/** Only the tags Lichess needs: juniors' names and events never leave the app. */
const SAFE_TAGS = new Set(['Result', 'FEN', 'SetUp', 'Variant']);

/**
 * A free analysis board: paste a PGN or FEN, play through and try moves,
 * write notes, then export — as PGN, as a ready-made prompt for any AI
 * assistant, or to Lichess for a free engine review.
 */
@Component({
  selector: 'app-analysis',
  providers: [GameSession, EngineAnalysis],
  imports: [TranslocoPipe, SanPipe, DecimalPipe, Board, GameControls, MoveList, Icon, EvalGraph],
  templateUrl: './analysis.html',
  styleUrl: './analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analysis implements OnInit {
  protected readonly session = inject(GameSession);
  protected readonly engine = inject(EngineAnalysis);
  private readonly rules = inject(ChessRules);
  private readonly http = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly language = inject(Language);
  private readonly toaster = inject(Toaster);

  protected readonly levels = LEVELS;
  protected readonly sides = SIDES;
  protected readonly verdictKinds = ['inaccuracy', 'mistake', 'blunder'] as const;
  protected readonly moveLabel = moveLabel;
  protected readonly pasted = signal('');
  /** Translation key of the last load problem. */
  protected readonly loadError = signal<string | null>(null);
  protected readonly level = signal<(typeof LEVELS)[number]>('beginner');
  protected readonly side = signal<(typeof SIDES)[number]>('white');
  protected readonly sending = signal(false);
  private readonly ready = signal(false);

  /** The board plus the engine's best-move arrow. */
  protected readonly boardView = computed(() => {
    const view = this.session.boardView();
    return view && { ...view, overlay: this.engine.bestArrow() };
  });

  protected readonly plyNow = computed(() => this.session.current()?.ply ?? 0);

  protected readonly hasMoves = computed(() => {
    this.session.version();
    const tree = this.session.tree();
    return !!tree && tree.root.children.length > 0;
  });

  /** The moves the review flagged as mistakes, for the "key moments" list. */
  protected readonly keyMoments = computed(() => {
    const review = this.engine.review();
    return review.status === 'ready'
      ? review.moves.filter((m) => m.verdict === 'mistake' || m.verdict === 'blunder')
      : [];
  });

  /** The move (or starting position) the note box edits. */
  protected readonly selected = computed(() => {
    this.session.version();
    const node = this.session.current();
    if (!node) return null;
    return { label: isMove(node) ? moveLabel(node) : null, comment: node.comment };
  });

  constructor() {
    this.session.editable.set(true);

    // Keep the board between visits (per device only).
    effect((onCleanup) => {
      this.session.version();
      const tree = this.session.tree();
      if (!tree || !this.ready()) return;
      const timer = setTimeout(
        () => untracked(() => writeStorage(STORAGE_KEY, this.rules.writePgn(tree))),
        500,
      );
      onCleanup(() => clearTimeout(timer));
    });
  }

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const gameId = params.get('game');
    const ply = Number(params.get('ply')) || undefined;
    if (gameId && (await this.loadClubGame(gameId, ply))) {
      this.ready.set(true);
      return;
    }
    const saved = readStorage(STORAGE_KEY);
    const restored = saved && this.tryLoad(saved);
    if (restored && mainline(this.session.tree()!.root).length > 0) {
      this.toaster.show(this.language.t('analysis.restored'));
    }
    if (!restored) this.session.load(createTree());
    this.ready.set(true);
  }

  // ---- Loading -----------------------------------------------------------------

  protected load(): void {
    const text = this.pasted().trim();
    if (!text) return;
    if (this.tryLoad(text)) {
      this.engine.clearReview();
      this.loadError.set(null);
      this.pasted.set('');
      this.toaster.show(this.language.t('analysis.loaded'), 'success');
    } else {
      this.loadError.set('analysis.invalid');
    }
  }

  protected newBoard(): void {
    this.engine.clearReview();
    this.session.load(createTree());
    this.loadError.set(null);
  }

  /** A FEN or a PGN; returns whether it could be read. */
  private tryLoad(text: string): boolean {
    const fen = this.rules.normalizeFen(text);
    if (fen) {
      this.session.load(createTree(fen));
      return true;
    }
    try {
      const [{ tree }] = this.rules.parsePgn(text);
      this.session.load(tree);
      return true;
    } catch {
      return false;
    }
  }

  private async loadClubGame(id: string, ply?: number): Promise<boolean> {
    try {
      const game = await firstValueFrom(
        this.http.get<GameDetail>(`/api/games/${encodeURIComponent(id)}`),
      );
      const [{ tree }] = this.rules.parsePgn(game.pgn);
      this.session.load(tree, ply);
      return true;
    } catch {
      return false;
    }
  }

  // ---- Editing -------------------------------------------------------------------

  protected onBoardMove(move: MoveInput): void {
    const node = this.session.current();
    // Analysis keeps it quick: pawns always promote to a queen.
    const promotion = node && this.rules.isPromotion(node.fen, move) ? 'queen' : undefined;
    this.session.play({ ...move, promotion });
  }

  protected jumpTo(node: MoveNode): void {
    this.session.goTo(node);
  }

  protected applyReview(): void {
    const changed = this.engine.applyReview();
    this.toaster.show(this.language.t('engine.applied', { count: changed }), 'success');
  }

  protected setLevel(value: string): void {
    const level = LEVELS.find((l) => l === value);
    if (level) this.level.set(level);
  }

  // ---- Export --------------------------------------------------------------------

  private pgn(tree: GameTree | null = this.session.tree()): string {
    return tree ? this.rules.writePgn(tree) : '';
  }

  protected async copyPgn(): Promise<void> {
    await this.copy(this.pgn(), 'common.copied');
  }

  protected downloadPgn(): void {
    const url = URL.createObjectURL(
      new Blob([this.pgn()], { type: 'application/x-chess-pgn;charset=utf-8' }),
    );
    Object.assign(document.createElement('a'), {
      href: url,
      download: 'chess-square-analysis.pgn',
    }).click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  protected async copyForAi(): Promise<void> {
    const { t } = this.language;
    const prompt = t('analysis.prompt', {
      level: t(`analysis.levelPhrase.${this.level()}`),
      side: t(`analysis.sidePhrase.${this.side()}`),
      pgn: this.pgn(),
    });
    await this.copy(prompt, 'analysis.aiCopied');
  }

  /**
   * Imports the game into Lichess (anonymously, without names) and opens it there,
   * where "Request a computer analysis" gives a free engine review.
   */
  protected async openInLichess(): Promise<void> {
    const tree = this.session.tree();
    if (!tree) return;
    // Open the tab now, inside the click, so pop-up blockers allow it.
    const tab = window.open('', '_blank');
    if (tab) tab.opener = null;
    this.sending.set(true);
    let url: string;
    try {
      const anonymous: GameTree = {
        ...tree,
        headers: new Map([...tree.headers].filter(([tag]) => SAFE_TAGS.has(tag))),
      };
      const response = await fetch('https://lichess.org/api/import', {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new URLSearchParams({ pgn: this.pgn(anonymous) }),
      });
      if (!response.ok) throw new Error(`Lichess answered ${response.status}`);
      url = ((await response.json()) as { url: string }).url;
    } catch {
      url = lichessBoardUrl(tree);
      this.toaster.show(this.language.t('analysis.lichessFailed'));
    } finally {
      this.sending.set(false);
    }
    if (tab) tab.location.href = url;
    else window.open(url, '_blank', 'noopener');
  }

  private async copy(text: string, successKey: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      this.toaster.show(this.language.t(successKey), 'success');
    } catch {
      this.toaster.show(this.language.t('errors.generic'), 'error');
    }
  }
}

/** Lichess's plain analysis board for the main line (no upload needed). */
function lichessBoardUrl(tree: GameTree): string {
  const start = tree.root.fen.replace(/ /g, '_');
  const moves = mainline(tree.root)
    .map((n) => n.san)
    .join('_');
  return tree.headers.has('FEN')
    ? `https://lichess.org/analysis/standard/${start}`
    : `https://lichess.org/analysis/pgn/${encodeURIComponent(moves)}`;
}

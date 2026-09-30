import { Location } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { SanPipe, SanTextPipe } from '../../core/notation';
import { Board } from '../../chess/board/board';
import { ChessRules, PgnError } from '../../chess/chess-rules';
import { GameControls } from '../../chess/game-controls/game-controls';
import { GameSession } from '../../chess/game-session';
import { endOfLine, isOnMainline, moveLabel } from '../../chess/game-tree';
import { isMove } from '../../chess/model';
import { MoveList } from '../../chess/move-list/move-list';
import { nagInfo } from '../../chess/nags';
import { Swipe } from '../../chess/swipe';
import { ContentApi } from '../../core/content-api';
import { errorMessage, isNotFound, valueOr } from '../../core/errors';
import { Language } from '../../core/i18n';
import { ClubDatePipe, MarkdownPipe, ResultPipe } from '../../core/format';
import { pageTitle } from '../../core/title';
import { Toaster } from '../../core/toaster';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';
import { CATEGORY_META, gameTitle } from './game-card';
import { GuessGame } from './guess-game';

@Component({
  selector: 'app-game-view',
  providers: [GameSession],
  imports: [
    SanPipe,
    SanTextPipe,
    GuessGame,
    RouterLink,
    TranslocoPipe,
    Board,
    GameControls,
    MoveList,
    Swipe,
    Icon,
    EmptyState,
    ErrorState,
    ClubDatePipe,
    MarkdownPipe,
    ResultPipe,
  ],
  templateUrl: './game-view.html',
  styleUrl: './game-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GameView {
  readonly id = input.required<string>();

  protected readonly session = inject(GameSession);
  protected readonly game = inject(ContentApi).game(() => this.id());
  /** Translation key of a problem reading the PGN. */
  protected readonly parseError = signal<string | null>(null);
  /** "Guess the move" mode replaces the viewer while active. */
  protected readonly guessing = signal(false);
  protected readonly categories = CATEGORY_META;
  protected readonly errorMessage = errorMessage;
  protected readonly isNotFound = isNotFound;

  private readonly rules = inject(ChessRules);
  private readonly route = inject(ActivatedRoute);
  private readonly location = inject(Location);
  private readonly toaster = inject(Toaster);
  private readonly language = inject(Language);
  private readonly setTitle = pageTitle();

  protected readonly title = computed(() => {
    const game = valueOr(this.game, undefined);
    return game ? gameTitle(game) : '';
  });

  /** What the note card shows for the selected move. */
  protected readonly note = computed(() => {
    this.session.version();
    const node = this.session.current();
    if (!node) return null;
    if (!isMove(node)) return { atStart: true as const, comment: node.comment };
    return {
      atStart: false as const,
      label: moveLabel(node),
      comment: node.comment,
      nags: node.nags.map(nagInfo).filter((n) => n !== undefined),
      alternatives: node.parent.children.filter((c) => c !== node),
    };
  });

  /** Share of the main line played so far, for the progress bar. */
  protected readonly progress = computed(() => {
    this.session.version();
    const tree = this.session.tree();
    const node = this.session.current();
    if (!tree || !node) return 0;
    const total = endOfLine(tree.root).ply - tree.root.ply;
    return total > 0 ? Math.min(1, (node.ply - tree.root.ply) / total) : 0;
  });

  /** Main-line ply of the selected move, so "Analyse" opens at the same position. */
  protected readonly currentPly = computed(() => {
    const node = this.session.current();
    return node && isMove(node) && isOnMainline(node) ? node.ply : null;
  });

  protected readonly moveLabel = moveLabel;

  constructor() {
    effect(() => {
      const game = valueOr(this.game, undefined);
      if (!game) return;
      untracked(() => {
        this.setTitle(gameTitle(game));
        try {
          const [{ tree }] = this.rules.parsePgn(game.pgn);
          const ply = Number(this.route.snapshot.queryParamMap.get('ply')) || undefined;
          this.session.load(tree, ply);
          this.parseError.set(null);
        } catch (error) {
          this.parseError.set(error instanceof PgnError ? 'pgn.noMoves' : 'game.unreadable');
        }
      });
    });

    // Mirror the selected main-line move in the URL so a shared link opens at it.
    effect(() => {
      const node = this.session.current();
      const tree = this.session.tree();
      if (!node || !tree) return;
      const ply = isMove(node) && isOnMainline(node) ? `ply=${node.ply}` : '';
      this.location.replaceState(`/games/${untracked(this.id)}`, ply);
    });
  }

  protected async share(): Promise<void> {
    const url = location.href;
    if (navigator.share) {
      await navigator.share({ title: this.title(), url }).catch(() => undefined);
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      this.toaster.show(this.language.t('game.linkCopied'), 'success');
    } catch {
      this.toaster.show(this.language.t('game.copyFailed'), 'error');
    }
  }
}

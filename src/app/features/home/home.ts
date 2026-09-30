import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { CLUB } from '../../club.config';
import { downloadCalendarFile } from '../../core/calendar';
import { ContentApi } from '../../core/content-api';
import { valueOr } from '../../core/errors';
import { ClubDatePipe, weekdayName } from '../../core/format';
import { Language } from '../../core/i18n';
import { Progress } from '../../core/progress';
import { Pwa } from '../../core/pwa';
import { Icon } from '../../ui/icon';
import { Logo } from '../../ui/logo';
import { PostCard } from '../blog/post-card';
import { EventRow, EVENT_KIND_META, isPast } from '../events/event-meta';
import { GameCard } from '../games/game-card';
import { LESSONS } from '../learn/lessons';

@Component({
  selector: 'app-home',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe, Icon, Logo, GameCard, PostCard, EventRow],
  templateUrl: './home.html',
  styleUrl: './home.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home {
  private readonly api = inject(ContentApi);
  private readonly language = inject(Language);
  protected readonly pwa = inject(Pwa);
  protected readonly progress = inject(Progress);
  protected readonly lessonTotal = LESSONS.length;
  protected readonly lessonsDone = computed(
    () => LESSONS.filter((l) => this.progress.lessons().has(l.slug)).length,
  );
  protected readonly club = CLUB;
  protected readonly kinds = EVENT_KIND_META;
  protected readonly mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(CLUB.mapsQuery)}`;

  protected readonly games = this.api.games();
  protected readonly posts = this.api.posts();
  protected readonly events = this.api.events();

  protected readonly upcoming = computed(() => valueOr(this.events, []).filter((e) => !isPast(e)));
  protected readonly nextEvent = computed(() => this.upcoming()[0] ?? null);
  protected readonly laterEvents = computed(() => this.upcoming().slice(1, 3));
  protected readonly latestGames = computed(() => valueOr(this.games, []).slice(0, 4));
  protected readonly latestPosts = computed(() => valueOr(this.posts, []).slice(0, 3));

  /** The regular week with weekday names in the active language. */
  protected readonly week = computed(() => {
    const locale = this.language.locale();
    return CLUB.week.map((d) => ({ ...d, name: weekdayName(d.day, locale) }));
  });

  protected readonly showInstall = computed(
    () =>
      !this.pwa.standalone &&
      !this.pwa.installDismissed() &&
      (!!this.pwa.canPromptInstall() || this.pwa.isIos),
  );

  protected addToCalendar(): void {
    const event = this.nextEvent();
    if (event) downloadCalendarFile(event);
  }
}

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { filter, map } from 'rxjs';
import { CLUB } from './club.config';
import { Language } from './core/i18n';
import { Notation } from './core/notation';
import { Pwa } from './core/pwa';
import { Theme } from './core/theme';
import { ConfirmDialog } from './ui/confirm-dialog';
import { Icon, type IconName } from './ui/icon';
import { Logo } from './ui/logo';
import { SoundMenu } from './ui/sound-menu';
import { Toasts } from './ui/toasts';

interface NavItem {
  path: string;
  label: string;
  icon: IconName;
  exact?: boolean;
  /** Desktop header only; the phone tab bar keeps five items. */
  desktopOnly?: boolean;
}

const NAV: readonly NavItem[] = [
  { path: '/', label: 'nav.home', icon: 'home', exact: true },
  { path: '/games', label: 'nav.games', icon: 'board' },
  { path: '/learn', label: 'nav.learn', icon: 'cap' },
  { path: '/events', label: 'nav.events', icon: 'calendar' },
  { path: '/blog', label: 'nav.blog', icon: 'news' },
  { path: '/books', label: 'nav.books', icon: 'book', desktopOnly: true },
  { path: '/analysis', label: 'nav.analysis', icon: 'analysis', desktopOnly: true },
];

const THEME_META: Record<string, { icon: IconName; label: string }> = {
  system: { icon: 'monitor', label: 'app.themeSystem' },
  light: { icon: 'sun', label: 'app.themeLight' },
  dark: { icon: 'moon', label: 'app.themeDark' },
};

@Component({
  selector: 'app-root',
  imports: [
    SoundMenu,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TranslocoPipe,
    Icon,
    Logo,
    Toasts,
    ConfirmDialog,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  host: { '[class.with-tabs]': '!inAdmin()' },
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly club = CLUB;
  protected readonly nav = NAV;
  protected readonly tabs = NAV.filter((item) => !item.desktopOnly);
  protected readonly theme = inject(Theme);
  protected readonly pwa = inject(Pwa);
  protected readonly language = inject(Language);
  protected readonly notation = inject(Notation);

  protected readonly inAdmin = toSignal(
    inject(Router).events.pipe(
      filter((e) => e instanceof NavigationEnd),
      map((e) => e.urlAfterRedirects.startsWith('/admin')),
    ),
    { initialValue: location.pathname.startsWith('/admin') },
  );

  protected readonly themeMeta = computed(() => THEME_META[this.theme.preference()]);

  /** With two languages the switch is a toggle; it shows the language you'd switch to. */
  protected readonly otherLanguage = computed(() =>
    this.language.options.find((l) => l.code !== this.language.current())!,
  );
}

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Auth } from '../../core/auth';
import { Icon, type IconName } from '../../ui/icon';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslocoPipe, Icon],
  template: `
    <div class="admin-bar">
      <div class="inner">
        <nav class="segmented" [attr.aria-label]="'admin.sections' | transloco">
          @for (section of sections; track section.path) {
            <a [routerLink]="section.path" routerLinkActive="active" ariaCurrentWhenActive="page">
              <app-icon [name]="section.icon" /> {{ 'admin.' + section.path | transloco }}
            </a>
          }
        </nav>
        <div class="who">
          <span class="name">{{ auth.user()?.name }}</span>
          <a routerLink="/" class="btn btn-ghost btn-sm" [title]="'admin.viewSite' | transloco">
            <app-icon name="external" /><span class="wide">{{ 'admin.site' | transloco }}</span>
          </a>
          <button
            type="button"
            class="btn btn-ghost btn-sm"
            (click)="signOut()"
            [title]="'admin.signOut' | transloco"
          >
            <app-icon name="logout" /><span class="wide">{{ 'admin.signOut' | transloco }}</span>
          </button>
        </div>
      </div>
    </div>
    <router-outlet />
  `,
  styles: `
    .admin-bar {
      border-bottom: 1px solid var(--border);
      background: var(--surface);
    }
    .inner {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      width: min(100% - 2 * var(--gutter), var(--content-width));
      margin-inline: auto;
      padding-block: 0.6rem;
    }
    .segmented {
      flex: 1 1 auto;
      max-width: 30rem;
    }
    .segmented a {
      flex: 1;
      justify-content: center;
      --icon-size: 1rem;
    }
    /* Phones: four equal text tabs so every section is visible. */
    @media (max-width: 34rem) {
      .segmented a {
        padding-inline: 0.25rem;
        font-size: 0.85rem;
      }
      .segmented app-icon {
        display: none;
      }
    }
    .who {
      margin-left: auto;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      flex: none;
    }
    .name {
      font-size: 0.88rem;
      color: var(--text-muted);
      margin-right: 0.25rem;
    }
    .name,
    .wide {
      display: none;
    }
    @media (min-width: 52rem) {
      .name,
      .wide {
        display: inline;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminShell {
  protected readonly auth = inject(Auth);
  protected readonly sections: { path: string; icon: IconName }[] = [
    { path: 'games', icon: 'board' },
    { path: 'posts', icon: 'news' },
    { path: 'events', icon: 'calendar' },
    { path: 'books', icon: 'book' },
  ];
  private readonly router = inject(Router);

  protected async signOut(): Promise<void> {
    await this.auth.logout();
    await this.router.navigate(['/']);
  }
}

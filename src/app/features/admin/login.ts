import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { email, form, FormField, FormRoot, required } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { Auth } from '../../core/auth';
import { errorMessage } from '../../core/errors';
import { Pwa } from '../../core/pwa';
import { FieldError } from '../../ui/field-error';
import { Icon } from '../../ui/icon';
import { Logo } from '../../ui/logo';

@Component({
  selector: 'app-login',
  imports: [FormRoot, FormField, RouterLink, TranslocoPipe, FieldError, Icon, Logo],
  template: `
    <div class="page login-page">
      <div class="card login">
        <app-logo class="mark" />
        <h1>{{ 'login.title' | transloco }}</h1>
        <p class="muted intro">{{ 'login.intro' | transloco }}</p>

        @if (expired) {
          <div class="callout">
            <app-icon name="info" />
            <p>{{ 'login.expired' | transloco }}</p>
          </div>
        }
        @if (!pwa.online()) {
          <div class="callout">
            <app-icon name="offline" />
            <p>{{ 'login.offline' | transloco }}</p>
          </div>
        }

        <form [formRoot]="form" class="stack">
          <div class="field">
            <label for="email">{{ 'login.email' | transloco }}</label>
            <input
              id="email"
              class="input"
              type="email"
              autocomplete="username"
              [formField]="form.email"
            />
            <app-field-error [field]="form.email" />
          </div>
          <div class="field">
            <label for="password">{{ 'login.password' | transloco }}</label>
            <div class="password">
              <input
                id="password"
                class="input"
                [type]="showPassword() ? 'text' : 'password'"
                autocomplete="current-password"
                [formField]="form.password"
              />
              <button
                type="button"
                class="btn btn-ghost btn-icon btn-sm reveal"
                (click)="showPassword.update((v) => !v)"
                [attr.aria-label]="
                  (showPassword() ? 'login.hidePassword' : 'login.showPassword') | transloco
                "
              >
                <app-icon [name]="showPassword() ? 'eye-off' : 'eye'" />
              </button>
            </div>
            <app-field-error [field]="form.password" />
          </div>

          @if (error(); as message) {
            <div class="callout" data-tone="danger" role="alert">
              <p>{{ message }}</p>
            </div>
          }

          <button type="submit" class="btn btn-primary" [disabled]="form().submitting()">
            @if (form().submitting()) {
              <span class="spinner"></span>
            }
            {{ 'login.submit' | transloco }}
          </button>
        </form>
      </div>
      <a routerLink="/" class="home-link">
        <app-icon name="arrow-left" /> {{ 'login.back' | transloco }}
      </a>
    </div>
  `,
  styles: `
    .login-page {
      display: grid;
      justify-items: center;
      align-content: start;
      gap: 1.25rem;
      padding-top: 3rem;
    }
    .login {
      width: min(100%, 25rem);
      padding: 2rem 1.75rem;
    }
    .mark {
      width: 3rem;
      height: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0;
      font-size: 1.7rem;
    }
    .intro {
      margin: 0.35rem 0 1.5rem;
    }
    .callout {
      margin-bottom: 1rem;
      font-size: 0.9rem;
    }
    .password {
      position: relative;
    }
    .password .input {
      padding-right: 3rem;
    }
    .reveal {
      position: absolute;
      right: 0.25rem;
      top: 50%;
      transform: translateY(-50%);
    }
    .home-link {
      display: inline-flex;
      align-items: center;
      gap: 0.35rem;
      font-size: 0.9rem;
      font-weight: 600;
      text-decoration: none;
      --icon-size: 1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly pwa = inject(Pwa);

  protected readonly expired = this.route.snapshot.queryParamMap.has('expired');
  protected readonly showPassword = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly credentials = signal({ email: '', password: '' });

  protected readonly form = form(
    this.credentials,
    (p) => {
      required(p.email, { message: 'login.emailRequired' });
      email(p.email, { message: 'login.emailInvalid' });
      required(p.password, { message: 'login.passwordRequired' });
    },
    { submission: { action: () => this.signIn() } },
  );

  private async signIn(): Promise<undefined> {
    this.error.set(null);
    try {
      await this.auth.login(this.credentials());
      const next = this.route.snapshot.queryParamMap.get('next');
      await this.router.navigateByUrl(next?.startsWith('/admin') ? next : '/admin');
    } catch (error) {
      this.error.set(errorMessage(error));
    }
    return undefined;
  }
}

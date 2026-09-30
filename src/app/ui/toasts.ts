import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toaster } from '../core/toaster';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from './icon';

@Component({
  selector: 'app-toasts',
  imports: [Icon, TranslocoPipe],
  template: `
    <div class="stack" role="status" aria-live="polite">
      @for (toast of toaster.toasts(); track toast.id) {
        <div class="toast" [attr.data-tone]="toast.tone">
          @switch (toast.tone) {
            @case ('success') {
              <app-icon name="check" />
            }
            @case ('error') {
              <app-icon name="info" />
            }
          }
          <span class="text">{{ toast.text }}</span>
          @if (toast.action; as action) {
            <button type="button" class="action" (click)="action.run(); toaster.dismiss(toast.id)">
              {{ action.label }}
            </button>
          }
          <button
            type="button"
            class="close"
            (click)="toaster.dismiss(toast.id)"
            [attr.aria-label]="'common.dismiss' | transloco"
          >
            <app-icon name="x" />
          </button>
        </div>
      }
    </div>
  `,
  styles: `
    .stack {
      position: fixed;
      z-index: 50;
      inset-inline: 0;
      bottom: calc(var(--bottom-nav-height, 0px) + env(safe-area-inset-bottom) + 0.75rem);
      display: grid;
      justify-items: center;
      gap: 0.5rem;
      padding-inline: 1rem;
      pointer-events: none;
    }
    /* Wide screens: top of the page, clear of the editors' save bar. */
    @media (min-width: 48rem) {
      .stack {
        top: calc(var(--header-height) + 0.75rem);
        bottom: auto;
      }
    }
    .toast {
      pointer-events: auto;
      display: flex;
      align-items: center;
      gap: 0.6rem;
      width: min(100%, 28rem);
      padding: 0.6rem 0.5rem 0.6rem 0.9rem;
      border-radius: var(--radius-md);
      background: var(--inverse-bg);
      color: var(--inverse-text);
      box-shadow: var(--shadow-lg);
      animation: toast-in 0.2s ease-out;
    }
    .toast[data-tone='success'] app-icon {
      color: var(--success-on-inverse);
    }
    .toast[data-tone='error'] app-icon {
      color: var(--danger-on-inverse);
    }
    .text {
      flex: 1;
      font-size: 0.925rem;
    }
    .action,
    .close {
      border: 0;
      background: none;
      color: inherit;
      font: inherit;
      cursor: pointer;
      border-radius: var(--radius-xs);
    }
    .action {
      font-weight: 700;
      color: var(--accent-on-inverse);
      padding: 0.35rem 0.5rem;
    }
    .close {
      display: grid;
      place-items: center;
      padding: 0.35rem;
      opacity: 0.7;
      --icon-size: 1rem;
    }
    @keyframes toast-in {
      from {
        opacity: 0;
        transform: translateY(0.5rem);
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Toasts {
  protected readonly toaster = inject(Toaster);
}

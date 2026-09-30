import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Confirm } from '../core/confirm';

@Component({
  selector: 'app-confirm-dialog',
  imports: [TranslocoPipe],
  template: `
    <dialog
      #dialog
      (cancel)="answer(false)"
      (close)="answer(false)"
      aria-labelledby="confirm-title"
    >
      @if (confirm.request(); as req) {
        <h2 id="confirm-title">{{ req.title }}</h2>
        @if (req.message) {
          <p>{{ req.message }}</p>
        }
        <div class="actions">
          <button type="button" class="btn btn-ghost" (click)="answer(false)">
            {{ req.cancelLabel ?? ('common.cancel' | transloco) }}
          </button>
          <button
            type="button"
            class="btn"
            [class.btn-danger]="req.danger"
            [class.btn-primary]="!req.danger"
            (click)="answer(true)"
            autofocus
          >
            {{ req.confirmLabel ?? ('common.ok' | transloco) }}
          </button>
        </div>
      }
    </dialog>
  `,
  styles: `
    dialog {
      width: min(calc(100% - 2rem), 26rem);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-lg);
    }
    dialog::backdrop {
      background: rgb(0 0 0 / 0.45);
      backdrop-filter: blur(2px);
    }
    h2 {
      margin: 0 0 0.5rem;
      font-size: 1.25rem;
    }
    p {
      margin: 0;
      color: var(--text-muted);
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmDialog {
  protected readonly confirm = inject(Confirm);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  constructor() {
    effect(() => {
      const dialog = this.dialog().nativeElement;
      if (this.confirm.request() && !dialog.open) dialog.showModal();
      if (!this.confirm.request() && dialog.open) dialog.close();
    });
  }

  protected answer(confirmed: boolean): void {
    this.confirm.request()?.resolve(confirmed);
  }
}

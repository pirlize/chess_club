import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon } from '../../ui/icon';

/** Sticky footer with save status, Save and Delete. Place it inside the <form>. */
@Component({
  selector: 'app-editor-bar',
  imports: [Icon, TranslocoPipe],
  template: `
    <div class="bar">
      @if (!isNew()) {
        <button type="button" class="btn btn-ghost delete" (click)="delete.emit()">
          <app-icon name="trash" /><span class="label">{{ 'editor.delete' | transloco }}</span>
        </button>
      }
      <span class="status" aria-live="polite">
        @if (saving()) {
          {{ 'editor.saving' | transloco }}
        } @else if (dirty()) {
          <span class="dot"></span> {{ 'editor.unsaved' | transloco }}
        } @else if (!isNew()) {
          <app-icon name="check" /> {{ 'editor.allSaved' | transloco }}
        }
      </span>
      <button
        type="submit"
        class="btn btn-primary save"
        [disabled]="saving() || (!dirty() && !isNew())"
      >
        @if (saving()) {
          <span class="spinner"></span>
        }
        {{ (isNew() ? 'editor.create' : 'editor.save') | transloco }}
      </button>
    </div>
  `,
  styles: `
    :host {
      position: sticky;
      bottom: 0;
      z-index: 10;
      display: block;
      margin-top: 1.5rem;
      padding-block: 0.75rem calc(0.75rem + env(safe-area-inset-bottom));
      background: linear-gradient(to top, var(--bg) 70%, transparent);
    }
    .bar {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.6rem 0.6rem 0.75rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
      box-shadow: var(--shadow-md);
    }
    .delete {
      color: var(--danger);
      padding-inline: 0.75rem;
    }
    .label {
      display: none;
    }
    @media (min-width: 30rem) {
      .label {
        display: inline;
      }
    }
    .status {
      flex: 1;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
      font-size: 0.88rem;
      color: var(--text-muted);
      --icon-size: 1rem;
    }
    .dot {
      width: 0.5rem;
      height: 0.5rem;
      border-radius: 50%;
      background: var(--gold);
    }
    .save {
      min-width: 6.5rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EditorBar {
  readonly isNew = input.required<boolean>();
  readonly dirty = input.required<boolean>();
  readonly saving = input.required<boolean>();
  readonly delete = output<void>();
}

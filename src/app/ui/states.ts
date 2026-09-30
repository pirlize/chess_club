import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { Icon, type IconName } from './icon';

/** Friendly placeholder for empty lists; heading and text are translation keys. Project an action button inside. */
@Component({
  selector: 'app-empty-state',
  imports: [Icon, TranslocoPipe],
  template: `
    <div class="bubble"><app-icon [name]="icon()" /></div>
    <h3>{{ heading() | transloco }}</h3>
    @if (text(); as text) {
      <p>{{ text | transloco }}</p>
    }
    <ng-content />
  `,
  styleUrl: './states.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly icon = input<IconName>('sparkle');
  readonly heading = input.required<string>();
  readonly text = input<string>();
}

@Component({
  selector: 'app-error-state',
  imports: [Icon, TranslocoPipe],
  template: `
    <div class="bubble error"><app-icon name="offline" /></div>
    <h3>{{ heading() ?? 'common.loadError' | transloco }}</h3>
    <p>{{ message() }}</p>
    <button type="button" class="btn btn-secondary" (click)="retry.emit()">
      {{ 'common.tryAgain' | transloco }}
    </button>
  `,
  styleUrl: './states.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ErrorState {
  readonly heading = input<string>();
  readonly message = input.required<string>();
  readonly retry = output<void>();
}

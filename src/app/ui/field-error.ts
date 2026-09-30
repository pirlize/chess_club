import { TranslocoPipe } from '@jsverse/transloco';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/** The parts of a signal-forms field state this component reads. */
type FieldLike = () => {
  touched(): boolean;
  invalid(): boolean;
  errors(): readonly { message?: string }[];
};

/** Shows a field's first validation message (a translation key) once the user has touched it. */
@Component({
  selector: 'app-field-error',
  imports: [TranslocoPipe],
  template: `
    @if (message(); as text) {
      <span class="error" role="alert">{{ text | transloco }}</span>
    }
  `,
  styles: `
    :host {
      display: contents;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FieldError {
  readonly field = input.required<FieldLike>();

  protected readonly message = computed(() => {
    const state = this.field()();
    if (!state.touched() || !state.invalid()) return null;
    return state.errors()[0]?.message ?? 'errors.checkField';
  });
}

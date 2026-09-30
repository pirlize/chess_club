import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CLUB } from '../club.config';

/** The club logo. `full` uses the full-resolution file (hero); otherwise a small mark. */
@Component({
  selector: 'app-logo',
  template: `<img
    [src]="full() ? club.logo : club.mark"
    alt=""
    [attr.fetchpriority]="full() ? 'high' : null"
  />`,
  styles: `
    :host {
      display: inline-block;
      width: 2.25rem;
      height: 2.25rem;
      flex: none;
      border-radius: 22%;
      overflow: hidden;
      box-shadow: 0 0 0 1px rgb(0 0 0 / 0.06);
    }
    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly full = input(false);
  protected readonly club = CLUB;
}

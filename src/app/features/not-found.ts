import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { EmptyState } from '../ui/states';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink, TranslocoPipe, EmptyState],
  template: `
    <div class="page">
      <app-empty-state icon="pawn" heading="notFound.heading" text="notFound.text">
        <a routerLink="/" class="btn btn-primary">{{ 'notFound.back' | transloco }}</a>
      </app-empty-state>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotFound {}

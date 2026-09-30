import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentApi } from '../../core/content-api';
import { errorMessage } from '../../core/errors';
import { EmptyState, ErrorState } from '../../ui/states';
import { PostCard } from './post-card';

@Component({
  selector: 'app-post-list',
  imports: [TranslocoPipe, PostCard, EmptyState, ErrorState],
  template: `
    <div class="page">
      <header class="page-header">
        <p class="eyebrow">{{ 'blog.eyebrow' | transloco }}</p>
        <h1>{{ 'blog.title' | transloco }}</h1>
        <p class="lede">{{ 'blog.lede' | transloco }}</p>
      </header>

      @if (posts.error(); as error) {
        <app-error-state [message]="message(error)" (retry)="posts.reload()" />
      } @else if (posts.isLoading() && posts.value().length === 0) {
        <div class="card-grid">
          @for (i of [1, 2, 3]; track i) {
            <div class="skeleton" style="height: 11rem"></div>
          }
        </div>
      } @else {
        <div class="card-grid">
          @for (post of posts.value(); track post.id) {
            <app-post-card [post]="post" />
          } @empty {
            <app-empty-state
              class="span-all"
              icon="news"
              heading="blog.empty"
              text="blog.emptyText"
            />
          }
        </div>
      }
    </div>
  `,
  styles: `
    .span-all {
      grid-column: 1 / -1;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostList {
  protected readonly posts = inject(ContentApi).posts();
  protected readonly message = errorMessage;
}

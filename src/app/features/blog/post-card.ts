import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PostSummary } from '../../../../shared/models';
import { ClubDatePipe } from '../../core/format';

@Component({
  selector: 'app-post-card',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe],
  template: `
    @let p = post();
    <a class="card post-card" [routerLink]="['/blog', p.slug]">
      <p class="meta">
        {{ p.publishedAt ?? p.updatedAt | clubDate }} ·
        {{ 'blog.minRead' | transloco: { n: p.readingMinutes } }}
      </p>
      <h3>{{ p.title }}</h3>
      @if (p.excerpt) {
        <p class="excerpt">{{ p.excerpt }}</p>
      }
      <p class="author">{{ 'blog.by' | transloco: { author: p.author } }}</p>
    </a>
  `,
  styles: `
    .post-card {
      display: flex;
      flex-direction: column;
      gap: 0.45rem;
      padding: 1.1rem 1.2rem;
      height: 100%;
    }
    .meta,
    .author {
      margin: 0;
      font-size: 0.82rem;
      color: var(--text-muted);
    }
    h3 {
      margin: 0;
      font-size: 1.25rem;
    }
    .excerpt {
      margin: 0;
      color: var(--text-muted);
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .author {
      margin-top: auto;
      padding-top: 0.3rem;
      font-weight: 600;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCard {
  readonly post = input.required<PostSummary>();
}

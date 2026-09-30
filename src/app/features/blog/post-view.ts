import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import { ContentApi } from '../../core/content-api';
import { errorMessage, isNotFound, valueOr } from '../../core/errors';
import { ClubDatePipe, MarkdownPipe } from '../../core/format';
import { pageTitle } from '../../core/title';
import { Icon } from '../../ui/icon';
import { EmptyState, ErrorState } from '../../ui/states';

@Component({
  selector: 'app-post-view',
  imports: [RouterLink, TranslocoPipe, ClubDatePipe, MarkdownPipe, Icon, EmptyState, ErrorState],
  template: `
    <div class="page page-narrow">
      <a routerLink="/blog" class="back-link">
        <app-icon name="arrow-left" /> {{ 'blog.allPosts' | transloco }}
      </a>

      @if (post.error(); as error) {
        @if (isNotFound(error)) {
          <app-empty-state icon="news" heading="blog.notFound" text="blog.notFoundText" />
        } @else {
          <app-error-state [message]="message(error)" (retry)="post.reload()" />
        }
      } @else if (post.value(); as p) {
        <article>
          <header class="head">
            <h1>{{ p.title }}</h1>
            @if (p.excerpt) {
              <p class="lede">{{ p.excerpt }}</p>
            }
            <p class="byline">
              <span class="avatar" aria-hidden="true">{{ p.author.charAt(0) }}</span>
              <span>
                <strong>{{ p.author }}</strong
                ><br />
                {{ p.publishedAt ?? p.updatedAt | clubDate: 'long' }} ·
                {{ 'blog.minRead' | transloco: { n: p.readingMinutes } }}
              </span>
            </p>
          </header>
          <div class="prose" [innerHTML]="p.body | markdown"></div>
        </article>
      } @else {
        <div class="skeleton" style="height: 2.6rem; width: 80%; margin-bottom: 1rem"></div>
        <div class="skeleton" style="height: 1rem; width: 40%; margin-bottom: 2rem"></div>
        <div class="skeleton" style="height: 14rem"></div>
      }
    </div>
  `,
  styles: `
    .head {
      margin-bottom: 2rem;
      padding-bottom: 1.5rem;
      border-bottom: 1px solid var(--border);
    }
    h1 {
      margin: 0 0 0.75rem;
      font-size: clamp(2rem, 1.4rem + 2.4vw, 2.9rem);
    }
    .lede {
      margin: 0 0 1.25rem;
      font-size: 1.2rem;
      color: var(--text-muted);
      line-height: 1.5;
    }
    .byline {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0;
      font-size: 0.88rem;
      color: var(--text-muted);
    }
    .byline strong {
      color: var(--text);
    }
    .avatar {
      display: grid;
      place-items: center;
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: var(--accent-soft);
      color: var(--accent-text);
      font-family: var(--font-display);
      font-weight: 700;
      font-size: 1.1rem;
    }
    .prose {
      font-size: 1.1rem;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostView {
  readonly slug = input.required<string>();
  protected readonly post = inject(ContentApi).post(() => this.slug());
  protected readonly message = errorMessage;
  protected readonly isNotFound = isNotFound;
  private readonly setTitle = pageTitle();

  constructor() {
    effect(() => this.setTitle(valueOr(this.post, undefined)?.title));
  }
}

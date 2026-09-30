import { ChangeDetectionStrategy, Component, effect, signal, untracked } from '@angular/core';
import { form, FormField, FormRoot, maxLength, pattern, required } from '@angular/forms/signals';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@jsverse/transloco';
import type { PostDetail, PostInput } from '../../../../shared/models';
import { MarkdownPipe } from '../../core/format';
import { slugify } from '../../core/slug';
import { FieldError } from '../../ui/field-error';
import { Icon } from '../../ui/icon';
import { ErrorState } from '../../ui/states';
import { EditorBar } from './editor-bar';
import { ResourceEditor } from './resource-editor';

@Component({
  selector: 'app-post-editor',
  imports: [
    FormRoot,
    FormField,
    RouterLink,
    TranslocoPipe,
    MarkdownPipe,
    FieldError,
    Icon,
    ErrorState,
    EditorBar,
  ],
  template: `
    <div class="page page-narrow">
      <a routerLink="/admin/posts" class="back-link">
        <app-icon name="arrow-left" /> {{ 'postEditor.back' | transloco }}
      </a>

      @if (loadError(); as message) {
        <app-error-state [message]="message" (retry)="reload()" />
      } @else if (loading()) {
        <div class="skeleton" style="height: 20rem"></div>
      } @else {
        <form [formRoot]="form" class="stack editor">
          <header class="editor-head">
            <h1>{{ (isNew() ? 'postEditor.new' : 'postEditor.edit') | transloco }}</h1>
            @if (item()?.published) {
              <a
                class="btn btn-ghost btn-sm"
                [href]="'/blog/' + item()?.slug"
                target="_blank"
                rel="noopener"
              >
                {{ 'editor.view' | transloco }} <app-icon name="external" />
              </a>
            }
          </header>

          <div class="field">
            <label for="title">{{ 'postEditor.title' | transloco }}</label>
            <input
              id="title"
              class="input title"
              [formField]="form.title"
              [placeholder]="'postEditor.titlePlaceholder' | transloco"
            />
            <app-field-error [field]="form.title" />
          </div>

          <div class="field">
            <label for="slug">{{ 'postEditor.slug' | transloco }}</label>
            <div class="slug">
              <span>/blog/</span>
              <input
                id="slug"
                class="input"
                [formField]="form.slug"
                (input)="slugEdited.set(true)"
              />
            </div>
            <app-field-error [field]="form.slug" />
          </div>

          <div class="field">
            <label for="excerpt">{{ 'postEditor.excerpt' | transloco }}</label>
            <textarea
              id="excerpt"
              class="input short"
              [formField]="form.excerpt"
              [placeholder]="'postEditor.excerptPlaceholder' | transloco"
            ></textarea>
            <app-field-error [field]="form.excerpt" />
          </div>

          <div class="field">
            <div class="label-row">
              <label for="body" class="label">{{ 'postEditor.body' | transloco }}</label>
              <div
                class="segmented"
                role="tablist"
                [attr.aria-label]="'postEditor.mode' | transloco"
              >
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="tab() === 'write'"
                  (click)="tab.set('write')"
                >
                  {{ 'postEditor.write' | transloco }}
                </button>
                <button
                  type="button"
                  role="tab"
                  [attr.aria-selected]="tab() === 'preview'"
                  (click)="tab.set('preview')"
                >
                  {{ 'postEditor.preview' | transloco }}
                </button>
              </div>
            </div>
            @if (tab() === 'write') {
              <textarea
                id="body"
                class="input body"
                [formField]="form.body"
                [placeholder]="'postEditor.bodyPlaceholder' | transloco"
              ></textarea>
              <span class="hint">{{ 'postEditor.formatHint' | transloco }}</span>
            } @else {
              <div class="card preview prose" [innerHTML]="model().body | markdown"></div>
            }
          </div>

          <label class="switch">
            <input type="checkbox" [formField]="form.published" />
            {{ 'postEditor.published' | transloco }}
          </label>
          <span class="hint">{{ 'postEditor.draftHint' | transloco }}</span>

          <app-editor-bar
            [isNew]="isNew()"
            [dirty]="dirty()"
            [saving]="saving()"
            (delete)="remove()"
          />
        </form>
      }
    </div>
  `,
  styleUrl: './editor.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostEditor extends ResourceEditor<'posts', PostInput> {
  protected readonly resource = 'posts';
  protected readonly tab = signal<'write' | 'preview'>('write');
  /** Stop deriving the slug from the title once it has been edited by hand (or saved). */
  protected readonly slugEdited = signal(false);

  protected readonly form = form(
    this.model,
    (p) => {
      required(p.title, { message: 'postEditor.titleRequired' });
      required(p.slug, { message: 'postEditor.slugRequired' });
      pattern(p.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'postEditor.slugPattern' });
      maxLength(p.excerpt, 300, { message: 'postEditor.excerptMax' });
    },
    { submission: { action: async () => void (await this.persist()) } },
  );

  constructor() {
    super();
    effect(() => {
      const title = this.model().title;
      if (this.slugEdited() || !this.isNew()) return;
      const slug = slugify(title);
      untracked(() => {
        if (this.model().slug !== slug) this.model.update((m) => ({ ...m, slug }));
      });
    });
  }

  protected emptyModel(): PostInput {
    return { slug: '', title: '', excerpt: '', body: '', published: false };
  }

  protected toModel(post: PostDetail): PostInput {
    return {
      slug: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      body: post.body,
      published: post.published,
    };
  }

  protected toInput(model: PostInput): PostInput {
    return model;
  }
}

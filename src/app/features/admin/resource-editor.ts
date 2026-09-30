import { computed, DestroyRef, Directive, inject, input, signal, type OnInit } from '@angular/core';
import { Router, type CanDeactivateFn } from '@angular/router';
import { AdminApi, type AdminResource, type AdminResources } from '../../core/admin-api';
import { Confirm } from '../../core/confirm';
import { errorMessage } from '../../core/errors';
import { Language } from '../../core/i18n';
import { Toaster } from '../../core/toaster';

export interface HasUnsavedChanges {
  hasUnsavedChanges(): boolean;
}

export const unsavedChangesGuard: CanDeactivateFn<HasUnsavedChanges> = (component) => {
  if (!component.hasUnsavedChanges()) return true;
  const { t } = inject(Language);
  return inject(Confirm).ask({
    title: t('editor.leaveTitle'),
    message: t('editor.leaveMessage'),
    confirmLabel: t('editor.leave'),
    cancelLabel: t('editor.keepEditing'),
    danger: true,
  });
};

type Item<R extends AdminResource> = AdminResources[R]['item'];
type Input<R extends AdminResource> = AdminResources[R]['input'];

/**
 * Shared load / save / delete / unsaved-changes logic for the admin editors.
 * `TModel` is what the form edits; `toModel`/`toInput` convert to and from the API.
 */
@Directive()
export abstract class ResourceEditor<R extends AdminResource, TModel>
  implements OnInit, HasUnsavedChanges
{
  /** Route param; undefined when creating. */
  readonly id = input<string>();

  protected abstract readonly resource: R;
  protected abstract emptyModel(): TModel;
  protected abstract toModel(item: Item<R>): TModel;
  protected abstract toInput(model: TModel): Input<R>;

  protected readonly api = inject(AdminApi);
  protected readonly router = inject(Router);
  protected readonly toaster = inject(Toaster);
  protected readonly confirm = inject(Confirm);
  protected readonly language = inject(Language);

  protected readonly model = signal<TModel>(this.emptyModel());
  protected readonly item = signal<Item<R> | null>(null);
  protected readonly loading = signal(false);
  protected readonly saving = signal(false);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isNew = computed(() => !this.id());

  private readonly baseline = signal(JSON.stringify(this.model()));
  protected readonly dirty = computed(
    () => JSON.stringify(this.model()) !== this.baseline() || this.hasOtherChanges(),
  );

  constructor() {
    // Warn before closing the tab with unsaved work.
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (this.hasUnsavedChanges()) event.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    inject(DestroyRef).onDestroy(() => window.removeEventListener('beforeunload', onBeforeUnload));
  }

  ngOnInit(): void {
    this.reload();
  }

  protected reload(): void {
    const id = this.id();
    if (id) void this.load(id);
  }

  hasUnsavedChanges(): boolean {
    return this.dirty() && !this.saving();
  }

  /** Extra dirtiness beyond the form model (the game editor's move tree). */
  protected hasOtherChanges(): boolean {
    return false;
  }

  protected afterLoad(_item: Item<R>): void {}

  protected afterSave(_item: Item<R>): void {}

  protected afterDelete(): void {}

  protected async load(id: string): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    try {
      const item = await this.api.get(this.resource, id);
      this.item.set(item);
      this.model.set(this.toModel(item));
      this.markSaved();
      this.afterLoad(item);
    } catch (error) {
      this.loadError.set(errorMessage(error));
    } finally {
      this.loading.set(false);
    }
  }

  /** Saves the current model. Call from the form's submission action (after validation). */
  protected async persist(): Promise<void> {
    this.saving.set(true);
    try {
      const id = this.id();
      const input = this.toInput(this.model());
      const saved = id
        ? await this.api.update(this.resource, id, input)
        : await this.api.create(this.resource, input);
      this.item.set(saved);
      this.markSaved();
      this.afterSave(saved);
      this.toaster.show(this.language.t(`editor.savedToast.${this.resource}`), 'success');
      if (!id)
        await this.router.navigate(['/admin', this.resource, saved.id], { replaceUrl: true });
    } catch (error) {
      this.toaster.show(errorMessage(error), 'error');
    } finally {
      this.saving.set(false);
    }
  }

  protected async remove(): Promise<void> {
    const id = this.id();
    if (!id) return;
    const confirmed = await this.confirm.ask({
      title: this.language.t(`editor.deleteTitle.${this.resource}`),
      message: this.language.t('editor.deleteMessage'),
      confirmLabel: this.language.t('editor.delete'),
      danger: true,
    });
    if (!confirmed) return;
    try {
      await this.api.delete(this.resource, id);
      this.markSaved();
      this.afterDelete();
      this.toaster.show(this.language.t(`editor.deletedToast.${this.resource}`), 'success');
      await this.router.navigate(['/admin', this.resource]);
    } catch (error) {
      this.toaster.show(errorMessage(error), 'error');
    }
  }

  /** The current model becomes the "no unsaved changes" baseline. */
  protected markSaved(): void {
    this.baseline.set(JSON.stringify(this.model()));
  }
}

import { inject, Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { TitleStrategy, type RouterStateSnapshot } from '@angular/router';
import { TranslocoService } from '@jsverse/transloco';
import { CLUB } from '../club.config';

/** "Παρτίδες · Chess Square". Route titles are translation keys. */
@Injectable({ providedIn: 'root' })
export class ClubTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);

  override updateTitle(snapshot: RouterStateSnapshot): void {
    const key = this.buildTitle(snapshot);
    setPageTitle(this.title, key && this.transloco.translate(key));
  }
}

export function setPageTitle(title: Title, page: string | undefined): void {
  title.setTitle(page ? `${page} · ${CLUB.name}` : CLUB.name);
}

/** For pages whose title comes from loaded data (a game, a post…). */
export function pageTitle(): (page: string | undefined) => void {
  const title = inject(Title);
  return (page) => setPageTitle(title, page);
}

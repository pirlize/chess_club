import { DOCUMENT, effect, inject, Injectable, signal } from '@angular/core';
import { readStorage, writeStorage } from './storage';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'cc:theme';
const ORDER: ThemePreference[] = ['system', 'light', 'dark'];

/** Light/dark preference. index.html applies the stored value before first paint. */
@Injectable({ providedIn: 'root' })
export class Theme {
  private readonly document = inject(DOCUMENT);
  readonly preference = signal<ThemePreference>(parse(readStorage(KEY)));

  constructor() {
    effect(() => {
      const preference = this.preference();
      const root = this.document.documentElement;
      if (preference === 'system') delete root.dataset['theme'];
      else root.dataset['theme'] = preference;
      writeStorage(KEY, preference);
    });
  }

  cycle(): void {
    this.preference.update((p) => ORDER[(ORDER.indexOf(p) + 1) % ORDER.length]);
  }
}

const parse = (value: string | null): ThemePreference =>
  ORDER.includes(value as ThemePreference) ? (value as ThemePreference) : 'system';

import {
  computed,
  DOCUMENT,
  effect,
  inject,
  Injectable,
  isDevMode,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import {
  provideTransloco,
  TranslocoService,
  type Translation,
  type TranslocoLoader,
} from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { readStorage, writeStorage } from './storage';

export const LANGUAGES = [
  { code: 'el', label: 'Ελληνικά', short: 'ΕΛ', locale: 'el-GR' },
  { code: 'en', label: 'English', short: 'EN', locale: 'en-GB' },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: LanguageCode = 'el';
const STORAGE_KEY = 'cc:lang';

/** Dictionaries ship with the app (one small chunk each): no flicker, and they work offline. */
const DICTIONARIES: Record<LanguageCode, () => Promise<{ default: Translation }>> = {
  el: () => import('../i18n/el.json'),
  en: () => import('../i18n/en.json'),
};

class BundledLoader implements TranslocoLoader {
  getTranslation(lang: string) {
    return DICTIONARIES[lang as LanguageCode]().then((m) => m.default);
  }
}

const isLanguage = (value: string | null): value is LanguageCode =>
  LANGUAGES.some((l) => l.code === value);

export function provideI18n(): EnvironmentProviders[] {
  const saved = readStorage(STORAGE_KEY);
  const initial = isLanguage(saved) ? saved : DEFAULT_LANGUAGE;
  return [
    ...provideTransloco({
      config: {
        availableLangs: LANGUAGES.map((l) => l.code),
        defaultLang: initial,
        fallbackLang: DEFAULT_LANGUAGE,
        missingHandler: { useFallbackTranslation: true },
        reRenderOnLangChange: true,
        prodMode: !isDevMode(),
      },
      loader: BundledLoader,
    }),
    // Load the active dictionary before the first render so synchronous translate() works.
    provideAppInitializer(() => firstValueFrom(inject(TranslocoService).load(initial))),
  ];
}

/** The active language, its locale for dates, and switching. */
@Injectable({ providedIn: 'root' })
export class Language {
  private readonly transloco = inject(TranslocoService);
  private readonly document = inject(DOCUMENT);

  readonly current = computed(() => this.transloco.activeLang() as LanguageCode);
  readonly locale = computed(() => LANGUAGES.find((l) => l.code === this.current())!.locale);
  readonly options = LANGUAGES;

  constructor() {
    effect(() => {
      const lang = this.current();
      this.document.documentElement.lang = lang;
      writeStorage(STORAGE_KEY, lang);
    });
  }

  async use(lang: LanguageCode): Promise<void> {
    await firstValueFrom(this.transloco.load(lang));
    this.transloco.setActiveLang(lang);
  }

  /** Synchronous translation for TypeScript code (toasts, dialogs, titles). Safe to destructure. */
  readonly t = (key: string, params?: Record<string, unknown>): string =>
    this.transloco.translate(key, params);
}

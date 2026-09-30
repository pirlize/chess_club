import { DestroyRef, DOCUMENT, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SwUpdate } from '@angular/service-worker';
import { filter } from 'rxjs';
import { readStorage, writeStorage } from './storage';

/** Not yet in TypeScript's DOM typings. */
interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const INSTALL_DISMISSED_KEY = 'cc:install-dismissed';

/** Online/offline state, new-version detection and the "install app" prompt. */
@Injectable({ providedIn: 'root' })
export class Pwa {
  private readonly document = inject(DOCUMENT);
  private readonly window = this.document.defaultView!;
  private readonly swUpdate = inject(SwUpdate);

  readonly online = signal(this.window.navigator.onLine);
  readonly updateReady = signal(false);

  private readonly installEvent = signal<BeforeInstallPromptEvent | null>(null);
  readonly installDismissed = signal(readStorage(INSTALL_DISMISSED_KEY) === '1');
  readonly standalone =
    this.window.matchMedia('(display-mode: standalone)').matches ||
    (this.window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  /** iOS has no install prompt; we show "Share → Add to Home Screen" instead. */
  readonly isIos = /iphone|ipad|ipod/i.test(this.window.navigator.userAgent);

  readonly canPromptInstall = this.installEvent.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);
    const listen = (target: EventTarget, type: string, handler: (e: Event) => void) => {
      target.addEventListener(type, handler);
      destroyRef.onDestroy(() => target.removeEventListener(type, handler));
    };

    listen(this.window, 'online', () => this.online.set(true));
    listen(this.window, 'offline', () => this.online.set(false));
    listen(this.window, 'beforeinstallprompt', (e) => {
      e.preventDefault();
      this.installEvent.set(e as BeforeInstallPromptEvent);
    });
    listen(this.window, 'appinstalled', () => this.installEvent.set(null));

    if (this.swUpdate.isEnabled) {
      this.swUpdate.versionUpdates
        .pipe(
          filter((e) => e.type === 'VERSION_READY'),
          takeUntilDestroyed(),
        )
        .subscribe(() => this.updateReady.set(true));
      this.swUpdate.unrecoverable
        .pipe(takeUntilDestroyed())
        .subscribe(() => this.window.location.reload());
      // Phones keep PWAs alive for days: check for a new version whenever it is reopened.
      listen(this.document, 'visibilitychange', () => {
        if (this.document.visibilityState === 'visible')
          void this.swUpdate.checkForUpdate().catch(() => false);
      });
    }
  }

  async install(): Promise<void> {
    const event = this.installEvent();
    if (!event) return;
    await event.prompt();
    this.installEvent.set(null);
  }

  dismissInstall(): void {
    this.installDismissed.set(true);
    writeStorage(INSTALL_DISMISSED_KEY, '1');
  }

  reload(): void {
    this.window.location.reload();
  }
}

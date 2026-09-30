import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmRequest extends ConfirmOptions {
  resolve(confirmed: boolean): void;
}

/** Promise-based confirmation, rendered by the <app-confirm-dialog> in the app shell. */
@Injectable({ providedIn: 'root' })
export class Confirm {
  readonly request = signal<ConfirmRequest | null>(null);

  ask(options: ConfirmOptions): Promise<boolean> {
    this.request()?.resolve(false);
    return new Promise((resolve) => {
      this.request.set({
        ...options,
        resolve: (confirmed) => {
          this.request.set(null);
          resolve(confirmed);
        },
      });
    });
  }
}

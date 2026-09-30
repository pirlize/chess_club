import { Injectable, signal } from '@angular/core';

export type ToastTone = 'info' | 'success' | 'error';

export interface Toast {
  id: number;
  text: string;
  tone: ToastTone;
  action?: { label: string; run: () => void };
}

let nextId = 1;

@Injectable({ providedIn: 'root' })
export class Toaster {
  readonly toasts = signal<Toast[]>([]);

  show(
    text: string,
    tone: ToastTone = 'info',
    options: { action?: Toast['action']; sticky?: boolean } = {},
  ) {
    const toast: Toast = { id: nextId++, text, tone, action: options.action };
    this.toasts.update((list) => [...list.slice(-2), toast]);
    if (!options.sticky) setTimeout(() => this.dismiss(toast.id), tone === 'error' ? 7000 : 4000);
  }

  dismiss(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}

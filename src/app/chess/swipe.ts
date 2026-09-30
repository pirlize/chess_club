import { Directive, output } from '@angular/core';

const MIN_DISTANCE = 40;

/** Emits on a clear horizontal swipe, so the board can be stepped with a thumb. */
@Directive({
  selector: '[appSwipe]',
  host: {
    '(pointerdown)': 'start($event)',
    '(pointerup)': 'end($event)',
    '(pointercancel)': 'origin = null',
  },
})
export class Swipe {
  readonly swipeLeft = output<void>();
  readonly swipeRight = output<void>();

  protected origin: { x: number; y: number } | null = null;

  protected start(event: PointerEvent): void {
    if (event.pointerType !== 'mouse') this.origin = { x: event.clientX, y: event.clientY };
  }

  protected end(event: PointerEvent): void {
    if (!this.origin) return;
    const dx = event.clientX - this.origin.x;
    const dy = event.clientY - this.origin.y;
    this.origin = null;
    if (Math.abs(dx) < MIN_DISTANCE || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (dx < 0) this.swipeLeft.emit();
    else this.swipeRight.emit();
  }
}

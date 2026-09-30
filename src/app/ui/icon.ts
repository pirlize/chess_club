import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  board: 'M4 4h16v16H4z M4 12h16 M12 4v16 M4 4h8v8H4z M12 12h8v8h-8z',
  calendar:
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z M4 10h16 M8.5 3v4 M15.5 3v4',
  'calendar-plus':
    'M4 6.5A1.5 1.5 0 0 1 5.5 5h13A1.5 1.5 0 0 1 20 6.5v12a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z M4 10h16 M8.5 3v4 M15.5 3v4 M12 12.5v5 M9.5 15h5',
  book: 'M5 4.5A1.5 1.5 0 0 1 6.5 3H19v15H6.5A1.5 1.5 0 0 0 5 19.5z M5 19.5A1.5 1.5 0 0 0 6.5 21H19v-3',
  news: 'M4 5h12v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M16 9h4v10a2 2 0 0 1-2 2h-4 M7.5 9h5 M7.5 13h5 M7.5 17h3',
  'chevron-left': 'M15 18l-6-6 6-6',
  'chevron-right': 'M9 6l6 6-6 6',
  first: 'M11 17l-5-5 5-5 M18 17l-5-5 5-5',
  last: 'M13 7l5 5-5 5 M6 7l5 5-5 5',
  flip: 'M7 20V4 M4 7l3-3 3 3 M17 4v16 M14 17l3 3 3-3',
  play: 'M7 4.8v14.4a.8.8 0 0 0 1.2.7l11.3-7.2a.8.8 0 0 0 0-1.4L8.2 4.1a.8.8 0 0 0-1.2.7z',
  pause: 'M8 5v14 M16 5v14',
  share: 'M12 3v12 M8 7l4-4 4 4 M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M12 2.5v2 M12 19.5v2 M4.6 4.6l1.4 1.4 M18 18l1.4 1.4 M2.5 12h2 M19.5 12h2 M4.6 19.4 6 18 M18 6l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
  monitor:
    'M3 5.5A1.5 1.5 0 0 1 4.5 4h15A1.5 1.5 0 0 1 21 5.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 14.5z M8 20h8 M12 16v4',
  plus: 'M12 5v14 M5 12h14',
  edit: 'M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z M13.5 6.5l4 4',
  trash:
    'M4 7h16 M10 11v6 M14 11v6 M6 7l1 12.5A1.5 1.5 0 0 0 8.5 21h7a1.5 1.5 0 0 0 1.5-1.5L18 7 M9 7V4h6v3',
  upload: 'M12 15V3 M7 8l5-5 5 5 M4 15v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4',
  download: 'M12 3v12 M7 10l5 5 5-5 M4 19h16',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  x: 'M6 6l12 12 M18 6 6 18',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14z M20 20l-4-4',
  pin: 'M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z M12 11.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  clock: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 7.5V12l3 2',
  lock: 'M6 11h12v9.5H6z M8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  logout: 'M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3 M10 16l-4-4 4-4 M6 12h10',
  external: 'M14 4h6v6 M20 4l-9 9 M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  offline:
    'M3 3l18 18 M8.5 16.4a5 5 0 0 1 7 0 M5 12.6a10 10 0 0 1 4.3-2.5 M19 12.6a10 10 0 0 0-2.3-1.6 M2 8.8a15 15 0 0 1 3.9-2.4 M22 8.8a15 15 0 0 0-10.8-3.8 M12 20h.01',
  trophy:
    'M8 21h8 M12 17v4 M7 4h10v5a5 5 0 0 1-10 0z M17 5.5h3v1.5a3 3 0 0 1-3 3 M7 5.5H4V7a3 3 0 0 0 3 3',
  'arrow-left': 'M19 12H5 M11 18l-6-6 6-6',
  'arrow-up': 'M12 19V5 M6 11l6-6 6 6',
  file: 'M14 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8z M14 3v5h5 M9 13h6 M9 17h6',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  'eye-off':
    'M3 3l18 18 M10.6 5.1A10 10 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.6 3.4 M6.6 6.6C3.7 8.4 2 12 2 12s3.5 7 10 7a9.6 9.6 0 0 0 5.4-1.6 M9.9 9.9a3 3 0 0 0 4.2 4.2',
  info: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M12 16v-4.5 M12 8h.01',
  sparkle:
    'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z M19 16l.8 2.2 2.2.8-2.2.8L19 22l-.8-2.2-2.2-.8 2.2-.8z',
  users:
    'M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1 M16 3.2a4 4 0 0 1 0 7.6 M22 21v-1a6 6 0 0 0-4-5.6',
  pawn: 'M12 3.5a2.6 2.6 0 0 0-1.5 4.7L9.5 9.5h5l-1-1.3A2.6 2.6 0 0 0 12 3.5z M10.2 9.5c0 2.8-1.2 5.2-2.7 6.8h9c-1.5-1.6-2.7-4-2.7-6.8 M6 20.5h12l-.8-4.2H6.8z',
  globe:
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z M3.5 12h17 M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9S9.6 5.6 12 3z',
  mail: 'M3.5 6.5A1.5 1.5 0 0 1 5 5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z M4 6.5l8 6 8-6',
  analysis: 'M4 4v16h16 M7.5 15l3.5-4.5 3 2.5 4.5-6',
  copy: 'M9 9h10.5v10.5H9z M15 9V4.5H4.5V15H9',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9z',
  flame:
    'M12 21a6.5 6.5 0 0 0 6.5-6.5c0-3.9-3.1-6.4-4.4-10.5-2.6 1.6-3.6 4.2-3.3 6.7-1-.4-1.9-1.4-2.3-2.7C7 9.7 5.5 11.9 5.5 14.5A6.5 6.5 0 0 0 12 21z M12 21a2.8 2.8 0 0 1-2.8-2.8c0-1.9 1.6-2.8 2.8-4.7 1.2 1.9 2.8 2.8 2.8 4.7A2.8 2.8 0 0 1 12 21z',
  list: 'M9 6h11 M9 12h11 M9 18h11 M4.5 6h.01 M4.5 12h.01 M4.5 18h.01',
  cpu: 'M7 7h10v10H7z M10 10h4v4h-4z M9.5 3v4 M14.5 3v4 M9.5 17v4 M14.5 17v4 M3 9.5h4 M3 14.5h4 M17 9.5h4 M17 14.5h4',
  cap: 'M2.5 9.5 12 5l9.5 4.5L12 14z M6.5 11.5v4.3c1.5 1.5 3.4 2.2 5.5 2.2s4-.7 5.5-2.2v-4.3 M21.5 9.5v5',
  volume: 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M15.5 9a4 4 0 0 1 0 6 M18 6.5a7.5 7.5 0 0 1 0 11',
  'volume-off': 'M4 9.5h3.5L12 5.5v13l-4.5-4H4z M16 9.5l5 5 M21 9.5l-5 5',
  bulb: 'M9 18h6 M10 21h4 M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z',
} as const;

export type IconName = keyof typeof ICONS;

@Component({
  selector: 'app-icon',
  template: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path [attr.d]="path()" />
    </svg>
  `,
  styles: `
    :host {
      display: inline-flex;
      width: var(--icon-size, 1.25rem);
      height: var(--icon-size, 1.25rem);
      flex: none;
    }
    svg {
      width: 100%;
      height: 100%;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.8;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Icon {
  readonly name = input.required<IconName>();
  protected readonly path = computed(() => ICONS[this.name()]);
}

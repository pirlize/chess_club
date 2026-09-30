import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { MoveSounds, SOUND_SETS } from '../core/sound';
import { Icon } from './icon';

/**
 * The move-sound picker, like lichess's: a list of sound sets and a volume
 * slider. One instance lives in the app shell; any button opens it with
 * `popovertarget="sound-menu"`. Picking a set plays a sample.
 */
@Component({
  selector: 'app-sound-menu',
  imports: [TranslocoPipe, Icon],
  template: `
    <div id="sound-menu" popover class="menu" role="dialog" aria-labelledby="sound-menu-title">
      <div class="head">
        <h2 id="sound-menu-title">{{ 'sound.title' | transloco }}</h2>
        <button
          type="button"
          class="btn btn-ghost btn-icon btn-sm"
          popovertarget="sound-menu"
          popovertargetaction="hide"
          [attr.aria-label]="'common.close' | transloco"
        >
          <app-icon name="x" />
        </button>
      </div>

      <div class="sets" role="radiogroup" aria-labelledby="sound-menu-title">
        @for (id of sets; track id) {
          <label class="set" [class.active]="sounds.set() === id">
            <input
              type="radio"
              name="sound-set"
              [value]="id"
              [checked]="sounds.set() === id"
              (click)="sounds.choose(id)"
            />
            <app-icon
              [name]="sounds.set() === id ? 'check' : id === 'off' ? 'volume-off' : 'volume'"
            />
            {{ 'sound.set.' + id | transloco }}
          </label>
        }
      </div>

      <label class="volume">
        <span>{{ 'sound.volume' | transloco }}</span>
        <input
          #range
          type="range"
          min="0"
          max="1"
          step="0.05"
          [value]="sounds.volume()"
          [disabled]="sounds.set() === 'off'"
          (input)="sounds.volume.set(+range.value)"
          (change)="sounds.play('move')"
        />
      </label>

      <p class="credit">{{ 'sound.credit' | transloco }}</p>
    </div>
  `,
  styles: `
    .menu {
      position: fixed;
      inset: auto;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(22rem, calc(100vw - 2rem));
      margin: 0;
      padding: 1rem 1.1rem 1.1rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      background: var(--surface);
      color: var(--text);
      box-shadow: var(--shadow-lg);
    }
    .menu::backdrop {
      background: rgb(0 0 0 / 0.3);
    }
    .head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.6rem;
    }
    h2 {
      margin: 0;
      font-size: 1.15rem;
    }
    .sets {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 0.35rem;
    }
    .set {
      display: flex;
      align-items: center;
      gap: 0.45rem;
      min-height: 2.6rem;
      padding: 0 0.7rem;
      border: 1px solid var(--border);
      border-radius: var(--radius-sm);
      font-size: 0.92rem;
      font-weight: 600;
      cursor: pointer;
      --icon-size: 1rem;

      app-icon {
        color: var(--text-muted);
      }
      &:hover {
        background: var(--surface-hover);
      }
      &:has(input:focus-visible) {
        outline: 2px solid var(--accent);
        outline-offset: 1px;
      }
      &.active {
        border-color: var(--accent);
        background: var(--accent-soft);
        color: var(--accent-text);

        app-icon {
          color: inherit;
        }
      }
    }
    input[type='radio'] {
      position: absolute;
      opacity: 0;
      pointer-events: none;
    }
    .volume {
      display: grid;
      gap: 0.35rem;
      margin-top: 0.9rem;
      font-size: 0.85rem;
      font-weight: 600;

      input {
        width: 100%;
        accent-color: var(--accent);
      }
    }
    .credit {
      margin: 0.75rem 0 0;
      font-size: 0.72rem;
      color: var(--text-muted);
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SoundMenu {
  protected readonly sounds = inject(MoveSounds);
  protected readonly sets = SOUND_SETS;
}

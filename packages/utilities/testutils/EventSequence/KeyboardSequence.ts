/* eslint-env jest */
import {
  KEY_DOWN,
  KEY_UP,
  ENTER,
  TAB,
  SPACE,
  PAGE_UP,
  PAGE_DOWN,
  END,
  HOME,
  ARROW_LEFT,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_DOWN,
  BACKSPACE,
  ESCAPE,
  CODES,
  CODES_2_KEY_CODES,
} from './types';
import EventSequence from './EventSequence';
import {getFlag, getValue} from '..';

type KeyboardEventType = typeof KEY_DOWN | typeof KEY_UP;

type UnnormalizedKeyboardEventInit = KeyboardEventInit & {
  keyCode?: number;
  which?: number;
  charCode?: number;
};

type KeyboardDownEventInit = UnnormalizedKeyboardEventInit & {
  key: string;
};

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

interface Modifiers {
  ctrlKey: boolean;
  altKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
}

interface KeyboardDownSequence
  extends Omit<
    KeyboardSequence,
    'down' | 'modify' | 'ctrl' | 'alt' | 'meta' | 'shift'
  > {
  repeat(count?: number): KeyboardDownSequence;
  modify(modifiers: Partial<Modifiers>): KeyboardDownSequence;
  ctrl(active?: boolean): KeyboardDownSequence;
  alt(active?: boolean): KeyboardDownSequence;
  meta(active?: boolean): KeyboardDownSequence;
  shift(active?: boolean): KeyboardDownSequence;
  up(): KeyboardSequence;
}

function getCode(key: string): string {
  if (key === ' ') return SPACE;
  if (CODES.includes(key)) return key;
  return `key${key.toUpperCase()}`;
}

function getKeyCode(key: string): number {
  const code = getCode(key);
  if (CODES.includes(code)) {
    return CODES_2_KEY_CODES[code];
  }
  return key.charCodeAt(0);
}

function normalizeKeyboardEventInit(
  init: UnnormalizedKeyboardEventInit,
  from: KeyboardEventInit,
): EventInit & UnnormalizedKeyboardEventInit {
  const key = getValue(init, 'key', from.key);
  return {
    key,
    code: key ? getCode(key) : undefined,
    keyCode: key ? getKeyCode(key) : undefined,
    which: key ? getKeyCode(key) : undefined,
    charCode: 0,
    ctrlKey: getFlag(init, 'ctrlKey', from.ctrlKey),
    shiftKey: getFlag(init, 'shiftKey', from.shiftKey),
    altKey: getFlag(init, 'altKey', from.altKey),
    metaKey: getFlag(init, 'metaKey', from.metaKey),
    location: getValue(init, 'location', from.location),
    repeat: getFlag(init, 'repeat', from.repeat),
    bubbles: true,
    cancelable: true,
    view: window,
  };
}
export default class KeyboardSequence extends EventSequence<
  KeyboardEvent,
  UnnormalizedKeyboardEventInit
> {
  modifiers: Modifiers = {
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  };

  createNextEvent(
    type: KeyboardEventType,
    init: UnnormalizedKeyboardEventInit = {},
    lastEvent?: KeyboardEvent | undefined,
  ): KeyboardEvent {
    return new KeyboardEvent(
      type,
      normalizeKeyboardEventInit(init, lastEvent || new KeyboardEvent('init')),
    );
  }
  normalizeEventInit(
    type: KeyboardEventType,
    init: UnnormalizedKeyboardEventInit = {},
  ): UnnormalizedKeyboardEventInit {
    return {...this.modifiers, ...init};
  }
  down(downOpts: KeyboardDownEventInit): KeyboardDownSequence {
    const downSequence: KeyboardDownSequence = this.dispatch(
      KEY_DOWN,
      downOpts,
    ).expose({
      down: false,
      ctrl(active = true): KeyboardDownSequence {
        return downSequence.modify({ctrlKey: active});
      },
      alt(active = true): KeyboardDownSequence {
        return downSequence.modify({altKey: active});
      },
      meta(active = true): KeyboardDownSequence {
        return downSequence.modify({metaKey: active});
      },
      shift(active = true): KeyboardDownSequence {
        return downSequence.modify({shiftKey: active});
      },
      modify: (modifiers: Partial<Modifiers>): KeyboardDownSequence => {
        const lastEvent = this.eventQueue[this.eventQueue.length - 1];
        if (lastEvent && lastEvent[0] !== KEY_UP) {
          this.modify(modifiers);
        } else {
          this.modifiers = {...this.modifiers, ...modifiers};
          const lastDispatched = this.dispatched[this.dispatched.length - 1];
          if (lastDispatched && lastDispatched.type !== KEY_UP) {
            this._dispatchModificationIfNecessary(
              lastDispatched.type,
              lastDispatched,
            );
          }
        }
        return downSequence;
      },
      repeat(count = 1): KeyboardDownSequence {
        if (count <= 0) throw new Error('count must be a positive integer!');
        let d = downSequence;
        for (let i = 0; i < count; i++) {
          d = downSequence.dispatch(KEY_DOWN, {repeat: true});
        }
        return d;
      },
      up: (): KeyboardSequence => this.dispatch(KEY_UP, {repeat: false}),
    });
    return downSequence;
  }
  space(): KeyboardDownSequence {
    return this.down({key: ' '});
  }
  pageUp(): KeyboardDownSequence {
    return this.down({key: PAGE_UP});
  }
  pageDown(): KeyboardDownSequence {
    return this.down({key: PAGE_DOWN});
  }
  end(): KeyboardDownSequence {
    return this.down({key: END});
  }
  home(): KeyboardDownSequence {
    return this.down({key: HOME});
  }
  arrowLeft(): KeyboardDownSequence {
    return this.down({key: ARROW_LEFT});
  }
  arrowUp(): KeyboardDownSequence {
    return this.down({key: ARROW_UP});
  }
  arrowRight(): KeyboardDownSequence {
    return this.down({key: ARROW_RIGHT});
  }
  arrowDown(): KeyboardDownSequence {
    return this.down({key: ARROW_DOWN});
  }
  enter(): KeyboardDownSequence {
    return this.down({key: ENTER});
  }
  tab(): KeyboardDownSequence {
    return this.down({key: TAB});
  }
  backspace(): KeyboardDownSequence {
    return this.down({key: BACKSPACE});
  }
  escape(): KeyboardDownSequence {
    return this.down({key: ESCAPE});
  }
  private _dispatchModificationIfNecessary(
    type: string,
    init: KeyboardEventInit,
  ): KeyboardSequence {
    if (
      Boolean(init.ctrlKey) !== this.modifiers.ctrlKey ||
      Boolean(init.altKey) !== this.modifiers.altKey ||
      Boolean(init.metaKey) !== this.modifiers.metaKey ||
      Boolean(init.shiftKey) !== this.modifiers.shiftKey
    ) {
      return this.dispatch(
        type,
        normalizeKeyboardEventInit(this.modifiers, init),
      );
    }
    return this;
  }
  modify(modifiers: Partial<Modifiers>): KeyboardSequence {
    this.modifiers = {...this.modifiers, ...modifiers};
    const lastEvent = this.eventQueue[this.eventQueue.length - 1];
    if (lastEvent && lastEvent[0] !== KEY_UP && lastEvent[1]) {
      return this._dispatchModificationIfNecessary(lastEvent[0], lastEvent[1]);
    }
    return this;
  }
  ctrl(active = true): KeyboardSequence {
    return this.modify({ctrlKey: active});
  }
  alt(active = true): KeyboardSequence {
    return this.modify({altKey: active});
  }
  meta(active = true): KeyboardSequence {
    return this.modify({metaKey: active});
  }
  shift(active = true): KeyboardSequence {
    return this.modify({shiftKey: active});
  }
}

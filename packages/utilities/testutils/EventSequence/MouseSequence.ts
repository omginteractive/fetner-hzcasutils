/* eslint-env jest */
import {MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP} from './types';
import EventSequence from './EventSequence';
import {getFlag, getValue} from '..';

type MouseEventType = typeof MOUSE_DOWN | typeof MOUSE_MOVE | typeof MOUSE_UP;

type UnnormalizedMouseEventInit = MouseEventInit & {
  x?: number;
  y?: number;
};

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

interface MouseMoveSequence extends Omit<MouseSequence, 'down'> {
  repeat(count?: number): MouseMoveSequence;
  move(opts?: UnnormalizedMouseEventInit): MouseMoveSequence;
  up(): MouseSequence;
}

interface MouseDownSequence extends Omit<MouseSequence, 'down'> {
  move(opts?: UnnormalizedMouseEventInit): MouseMoveSequence;
  up(): MouseSequence;
}

const DEFAULT_MOUSE_EVENT_INIT = {
  screenX: 0,
  screenY: 0,
  clientX: 0,
  clientY: 0,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
  button: 0,
};

function normalizeMouseEventInit(
  init: UnnormalizedMouseEventInit,
  from: MouseEvent,
): MouseEventInit {
  const clientX = getValue(init, 'clientX', getValue(init, 'x', from.clientX));
  const clientY = getValue(init, 'clientY', getValue(init, 'y', from.clientY));
  const screenX = getValue(
    init,
    'screenX',
    from.screenX + clientX - from.clientX,
  );
  const screenY = getValue(
    init,
    'screenY',
    from.screenY + clientY - from.clientY,
  );
  return {
    ctrlKey: getFlag(init, 'ctrlKey', from.ctrlKey),
    shiftKey: getFlag(init, 'shiftKey', from.shiftKey),
    altKey: getFlag(init, 'altKey', from.altKey),
    metaKey: getFlag(init, 'metaKey', from.metaKey),
    button: getValue(init, 'button', from.button),
    bubbles: true,
    cancelable: true,
    view: window,
    screenX,
    screenY,
    clientX,
    clientY,
  };
}

export default class MouseSequence extends EventSequence<
  MouseEvent,
  UnnormalizedMouseEventInit
> {
  createNextEvent(
    type: MouseEventType,
    init: UnnormalizedMouseEventInit = {},
    lastEvent?: MouseEvent | null,
  ): MouseEvent {
    return new MouseEvent(
      type,
      normalizeMouseEventInit(
        init,
        lastEvent || new MouseEvent('init', DEFAULT_MOUSE_EVENT_INIT),
      ),
    );
  }

  down(downOpts?: UnnormalizedMouseEventInit): MouseDownSequence {
    const downSequence = this.dispatch(MOUSE_DOWN, downOpts).expose({
      down: false,
      move(moveOpts: UnnormalizedMouseEventInit): MouseMoveSequence {
        const moveSequence = downSequence
          .dispatch(MOUSE_MOVE, moveOpts)
          .expose({
            repeat(count = 1): MouseMoveSequence {
              if (count <= 0)
                throw new Error('count must be a positive integer!');
              let seq = moveSequence;
              const eventToRepeat = seq.eventQueue[seq.eventQueue.length - 1];
              if (eventToRepeat) {
                for (let i = 0; i < count; i++) {
                  seq = seq.dispatch(...eventToRepeat);
                }
              }
              return seq;
            },
          });
        return moveSequence;
      },
      up: () => this.dispatch(MOUSE_UP),
    });
    return downSequence;
  }
}

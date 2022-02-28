/* eslint-env jest */
import invariant from 'invariant';
import {TOUCH_START, TOUCH_MOVE, TOUCH_END} from './types';
import EventSequence from './EventSequence';
import {getFlag, getValue, getTouchAt} from '..';

type TouchEventType = typeof TOUCH_START | typeof TOUCH_MOVE | typeof TOUCH_END;

type UnnormalizedTouchInit = TouchInit & {
  x?: number;
  y?: number;
};

type UnnormalizedTouchEventInit = TouchEventInit & {
  x?: number;
  y?: number;
};

type Omit<T, K> = Pick<T, Exclude<keyof T, K>>;

interface TouchMoveSequence extends Omit<TouchSequence, 'start'> {
  repeat(count?: number): TouchMoveSequence;
  move(opts?: UnnormalizedTouchEventInit): TouchMoveSequence;
  end(): TouchSequence;
}

interface TouchStartSequence extends Omit<TouchSequence, 'start'> {
  move(opts?: UnnormalizedTouchEventInit): TouchMoveSequence;
  end(): TouchSequence;
}

const DEFAULT_TOUCH_INIT: TouchInit = {
  target: window,
  identifier: 0,
  clientX: 0,
  clientY: 0,
  screenX: 0,
  screenY: 0,
};

/**
 * HACK: This function exists because jsdom doesn't implement `new Touch()`.
 * See https://github.com/jsdom/jsdom/issues/1508
 */
function createTouch(touchInit: TouchInit): Touch {
  // TODO: Impelement some crude version of `new Touch()`?
  return touchInit as Touch;
}

const DEFAULT_TOUCH_EVENT_INIT: TouchEventInit = {
  touches: [createTouch(DEFAULT_TOUCH_INIT)],
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
};

function normalizeTouchInit(
  init: UnnormalizedTouchInit,
  from: Touch,
): TouchInit {
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
    identifier: getValue(init, 'identifier', from.identifier),
    target: getValue(init, 'target', from.target),
    screenX,
    screenY,
    clientX,
    clientY,
  };
}

function normalizeTouchInitList(
  init: UnnormalizedTouchInit[],
  from: TouchList,
): TouchInit[] {
  invariant(
    init.length === from.length,
    `Cannot normalize ${init.length} touches from ${from}`,
  );

  return init.map((touchInit, i) => {
    const fromTouch = getTouchAt(from, i);
    invariant(
      fromTouch,
      `Cannot normalize touch ${touchInit.identifier} from ${from}`,
    );
    // We assert `fromTouch` as `Touch` under the assumption that
    // the preceeding invariant will throw if that is not the case.
    return normalizeTouchInit(touchInit, fromTouch as Touch);
  });
}

function normalizeTouchEventInit(
  init: UnnormalizedTouchEventInit,
  from: TouchEvent,
): EventInit & TouchEventInit {
  let touches = getValue(init, 'touches', init);
  if (!Array.isArray(touches)) touches = [touches] as Touch[];

  return {
    ctrlKey: getFlag(init, 'ctrlKey', from.ctrlKey),
    shiftKey: getFlag(init, 'shiftKey', from.shiftKey),
    altKey: getFlag(init, 'altKey', from.altKey),
    metaKey: getFlag(init, 'metaKey', from.metaKey),
    bubbles: true,
    cancelable: true,
    view: window,
    touches: normalizeTouchInitList(touches, from.touches).map(touchInit =>
      createTouch(touchInit),
    ),
  };
}

export default class TouchSequence extends EventSequence<
  TouchEvent,
  UnnormalizedTouchEventInit
> {
  createNextEvent(
    type: TouchEventType,
    init: UnnormalizedTouchEventInit = {},
    lastEvent?: TouchEvent | null,
  ): TouchEvent {
    return new TouchEvent(
      type,
      normalizeTouchEventInit(
        init,
        lastEvent || new TouchEvent('init', DEFAULT_TOUCH_EVENT_INIT),
      ),
    );
  }

  start(
    startOpts?: UnnormalizedTouchInit | TouchEventInit,
  ): TouchStartSequence {
    const startSequence = this.dispatch(TOUCH_START, startOpts).expose({
      start: false,
      move(moveOpts: UnnormalizedTouchEventInit): TouchMoveSequence {
        const moveSequence = startSequence
          .dispatch(TOUCH_MOVE, moveOpts)
          .expose({
            repeat(count = 1): TouchMoveSequence {
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
      end: () => this.dispatch(TOUCH_END),
    });
    return startSequence;
  }
}

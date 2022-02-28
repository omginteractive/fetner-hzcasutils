/* eslint-env jest */
import {WHEEL, DOM_DELTA_PIXEL, DOM_DELTA_LINE, DOM_DELTA_PAGE} from './types';
import EventSequence from './EventSequence';
import {hasProperty, getFlag, getValue} from '..';

type WheelEventType = typeof WHEEL;

type WheelDeltaMode =
  | typeof DOM_DELTA_PIXEL
  | typeof DOM_DELTA_LINE
  | typeof DOM_DELTA_PAGE;

interface WheelSubsequence extends WheelSequence {
  repeat(count?: number): WheelSubsequence;
}

const DEFAULT_WHEEL_EVENT_INIT = {
  deltaX: 0,
  deltaY: 1,
  deltaZ: 0,
  deltaMode: DOM_DELTA_PIXEL,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  metaKey: false,
};

function getDeltaMode(init: WheelEventInit, fromMode: number): WheelDeltaMode {
  const deltaMode = getValue(init, 'deltaMode', fromMode);
  if (
    deltaMode === DOM_DELTA_PIXEL ||
    deltaMode === DOM_DELTA_LINE ||
    deltaMode === DOM_DELTA_PAGE
  ) {
    return deltaMode;
  }
  return DOM_DELTA_PIXEL;
}

function normalizeWheelEventInit(
  init: WheelEventInit,
  from: WheelEvent,
): MouseEventInit & WheelEventInit {
  const deltaY = getValue(
    init,
    'deltaY',
    hasProperty(init, 'deltaX') || hasProperty(init, 'deltaZ')
      ? 0
      : DEFAULT_WHEEL_EVENT_INIT.deltaY,
  );
  return {
    bubbles: true,
    cancelable: true,
    view: window,
    ctrlKey: getFlag(init, 'ctrlKey', from.ctrlKey),
    shiftKey: getFlag(init, 'shiftKey', from.shiftKey),
    altKey: getFlag(init, 'altKey', from.altKey),
    metaKey: getFlag(init, 'metaKey', from.metaKey),
    button: getValue(init, 'button', from.button),
    deltaX: getValue(init, 'deltaX', DEFAULT_WHEEL_EVENT_INIT.deltaX),
    deltaY,
    deltaZ: getValue(init, 'deltaZ', DEFAULT_WHEEL_EVENT_INIT.deltaZ),
    deltaMode: getDeltaMode(init, from.deltaMode),
  };
}

export default class WheelSequence extends EventSequence<
  WheelEvent,
  WheelEventInit
> {
  createNextEvent(
    type: WheelEventType,
    init: WheelEventInit = {},
    lastEvent?: WheelEvent | null,
  ): WheelEvent {
    return new WheelEvent(
      type,
      normalizeWheelEventInit(
        init,
        lastEvent || new WheelEvent('init', DEFAULT_WHEEL_EVENT_INIT),
      ),
    );
  }
  wheel(wheelOpts?: WheelEventInit): WheelSubsequence {
    const subsequence: WheelSubsequence = this.dispatch(
      WHEEL,
      wheelOpts,
    ).expose({
      repeat(count = 1): WheelSubsequence {
        if (count <= 0) throw new Error('count must be a positive integer!');
        let seq = subsequence;
        const eventToRepeat = seq.eventQueue[seq.eventQueue.length - 1];
        if (eventToRepeat) {
          for (let i = 0; i < count; i++) {
            seq = seq.dispatch(...eventToRepeat);
          }
        }
        return seq;
      },
    });
    return subsequence;
  }
}

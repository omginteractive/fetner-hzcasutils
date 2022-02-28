import {ensureDOMInstance} from '@hzdg/dom-utils';
import {Source} from 'callbag';
import share from 'callbag-share';
import pipe from 'callbag-pipe';
import map from 'callbag-map';
import merge from 'callbag-merge';
import filter from 'callbag-filter';
import fromEvent from 'callbag-from-event';
import scan from 'callbag-scan';
import asObservable, {DebugObservable} from './asObservable';
import {parseConfig} from './ObservableConfig';

export const KEY_DOWN = 'keydown';
export const KEY_UP = 'keyup';

export const SPACE = 'Space';
export const PAGE_UP = 'PageUp';
export const PAGE_DOWN = 'PageDown';
export const END = 'End';
export const HOME = 'Home';
export const ARROW_LEFT = 'ArrowLeft';
export const ARROW_UP = 'ArrowUp';
export const ARROW_RIGHT = 'ArrowRight';
export const ARROW_DOWN = 'ArrowDown';

/**
 * Configuration for a KeyboardGestureObservable.
 */
export interface KeyboardGestureObservableConfig {
  /**
   * Whether or not to prevent the default action
   * for `keydown` or `keyup` events during a gesture.
   */
  preventDefault: boolean;
  /**
   * Whether or not to listen to keyboard events passively.
   * If `true`, then `preventDefault` will have no effect.
   */
  passive: boolean;
}

/**
 * An event assocated with a keyboard gesture.
 */
export interface KeyboardGestureEvent extends KeyboardEvent {
  type: typeof KEY_DOWN | typeof KEY_UP;
}

const CODES: [
  typeof SPACE,
  typeof PAGE_UP,
  typeof PAGE_DOWN,
  typeof END,
  typeof HOME,
  typeof ARROW_LEFT,
  typeof ARROW_UP,
  typeof ARROW_RIGHT,
  typeof ARROW_DOWN,
] = [
  SPACE,
  PAGE_UP,
  PAGE_DOWN,
  END,
  HOME,
  ARROW_LEFT,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_DOWN,
];

type Mutable<T> = {-readonly [P in keyof T]: T[P]};
type MembersOf<A> = Mutable<A> extends (infer T)[] ? T : never;

const KEY_CODES_2_CODES: Record<string, MembersOf<typeof CODES>> = {
  '32': SPACE,
  '33': PAGE_UP,
  '34': PAGE_DOWN,
  '35': END,
  '36': HOME,
  '37': ARROW_LEFT,
  '38': ARROW_UP,
  '39': ARROW_RIGHT,
  '40': ARROW_DOWN,
};

const getKeyCode = (event: KeyboardEvent): MembersOf<typeof CODES> =>
  KEY_CODES_2_CODES[event.keyCode];

const isGestureKey = (event: KeyboardEvent): event is KeyboardGestureEvent => {
  const code = getKeyCode(event);
  return CODES.some(v => code === v);
};

const isSameKey = (
  eventA: KeyboardGestureEvent,
  eventB: KeyboardGestureEvent,
): boolean => eventB && eventA && getKeyCode(eventA) === getKeyCode(eventB);

const isRepeatKey = (
  eventA: KeyboardGestureEvent,
  eventB: KeyboardGestureEvent,
): boolean =>
  isSameKey(eventA, eventB) &&
  eventB.type === eventA.type &&
  eventB.ctrlKey === eventA.ctrlKey &&
  eventB.shiftKey === eventA.shiftKey &&
  eventB.altKey === eventA.altKey &&
  eventB.metaKey === eventA.metaKey;

function getNearestFocusableNode(node: Node | null): Node {
  if (node instanceof Document) return node;
  if (!(node instanceof HTMLElement)) return document;
  if (node.tabIndex >= 0) return node;
  return getNearestFocusableNode(node.parentNode);
}

/**
 * An event type associated with a keyboard gesture.
 */
export type KeyboardGestureType = typeof KEY_DOWN | typeof KEY_UP;

interface KeyboardGestureBaseState {
  /** The latest x position for the gesture. */
  x: number;
  /** The latest y position for the gesture. */
  y: number;
  /** The cumulative change of the gesture in the x dimension. */
  xDelta: number;
  /** The cumulative change of the gesture in the y dimension. */
  yDelta: number;
  /** The initial x position for the gesture. */
  xInitial: number;
  /** The initial y position for the gesture. */
  yInitial: number;
  /** The previous x position for the gesture. */
  xPrev: number;
  /** The previous y position for the gesture. */
  yPrev: number;
  /** The latest velocity of the gesture in the x dimension. */
  xVelocity: number;
  /** The latest velocity of the gesture in the y dimension. */
  yVelocity: number;
  /** The key that triggered the gesture. */
  key: MembersOf<typeof CODES> | null;
  /** Whether or not the key that triggered the gesture is repeating. */
  repeat: boolean | null;
  /** Whether or not a gesture is ongoing. */
  gesturing: boolean;
  /** The type of event last associated with a gesture. */
  type: KeyboardGestureType | null;
  /** The timestamp of the event last associated with a gesture. */
  time: number;
  /** The initial timestamp for the gesture. */
  timeInitial: number;
  /** How long the latest update to the gesture state took. */
  duration: number;
  /** How long the gesture has been active. */
  elapsed: number;
}

/**
 * A snapshot of an in-progress keyboard gesture.
 */
export interface KeyboardGestureState extends KeyboardGestureBaseState {
  /** Indicates a gesture is ongoing. */
  gesturing: true;
  /** The type of event associated with the gesture. */
  type: typeof KEY_DOWN;
}

/**
 * The last snapshot of a completed keyboard gesture.
 */
export interface KeyboardGestureEndState extends KeyboardGestureBaseState {
  /** Indicates a gesture is no longer ongoing. */
  gesturing: false;
  /** The type of event associated with the end of a gesture. */
  type: typeof KEY_UP;
}

const DEFAULT_INITIAL_STATE: KeyboardGestureBaseState = {
  x: 0,
  y: 0,
  xDelta: 0,
  yDelta: 0,
  xInitial: 0,
  yInitial: 0,
  xPrev: 0,
  yPrev: 0,
  xVelocity: 0,
  yVelocity: 0,
  gesturing: false,
  key: null,
  repeat: null,
  type: null,
  time: Infinity,
  timeInitial: Infinity,
  duration: 0,
  elapsed: 0,
};

function updateGestureState(
  state: KeyboardGestureBaseState,
  event: KeyboardGestureEvent,
): KeyboardGestureBaseState | KeyboardGestureState | KeyboardGestureEndState {
  const {timeStamp: time} = event;
  switch (event.type) {
    case KEY_DOWN:
      if (state.gesturing) {
        return {
          ...state,
          time,
          duration: time - state.time,
          elapsed: time - state.timeInitial,
          gesturing: true,
          type: event.type,
          key: getKeyCode(event),
          repeat: event.repeat,
        };
      } else {
        return {
          ...state,
          time,
          timeInitial: time,
          gesturing: true,
          xDelta: 0,
          yDelta: 0,
          xVelocity: 0,
          yVelocity: 0,
          type: event.type,
          key: getKeyCode(event),
          repeat: event.repeat,
        };
      }
    case KEY_UP:
      return {
        ...state,
        time,
        duration: time - state.time,
        elapsed: time - state.timeInitial,
        gesturing: false,
        type: event.type,
        key: getKeyCode(event),
        repeat: event.repeat,
      };
  }
  throw new Error(`Could not handle event ${event}`);
}

/**
 * A payload for debugging keyboard gestures.
 *
 * This is the payload passed to the `__debug` gesture handler.
 */
export interface KeyboardGestureEventSourceState
  extends KeyboardGestureObservableConfig {
  event?: KeyboardGestureEvent;
  firstEvent: KeyboardGestureEvent | null;
  gesturing: boolean;
  canceled: boolean;
}

type EventSource = Source<KeyboardGestureEventSourceState>;
type GestureSource = Source<KeyboardGestureState | KeyboardGestureEndState>;
type MaybeConfig = Partial<KeyboardGestureObservableConfig> | null;

const extractEvent = ({
  event,
}: KeyboardGestureEventSourceState): KeyboardGestureEvent =>
  event as KeyboardGestureEvent;

function initEventSourceState(
  config: KeyboardGestureObservableConfig,
): KeyboardGestureEventSourceState {
  return {
    ...config,
    firstEvent: null,
    gesturing: false,
    canceled: false,
  };
}

function shouldPreventDefault(state: KeyboardGestureEventSourceState): boolean {
  return (
    state.event instanceof KeyboardEvent &&
    isGestureKey(state.event) &&
    state.preventDefault &&
    !state.event.defaultPrevented &&
    typeof state.event.preventDefault === 'function'
  );
}

function updateEventSourceState(
  state: KeyboardGestureEventSourceState,
  action: KeyboardGestureEvent,
): KeyboardGestureEventSourceState {
  if (!isGestureKey(action)) return state;
  state.event = action;
  switch (action.type) {
    case KEY_DOWN: {
      if (state.firstEvent) {
        if (isRepeatKey(state.firstEvent, action)) {
          return state;
        }
      }
      state.firstEvent = action;
      state.gesturing = true;
      return state;
    }
    case KEY_UP: {
      if (state.firstEvent && isSameKey(state.firstEvent, action)) {
        state.firstEvent = null;
        state.canceled = false;
        state.gesturing = false;
        return state;
      }
      return state;
    }
  }
}

function createEventSource(
  /** The DOM element to observe for keyboard events. */
  element: Element,
  /** Configuration for the keyboard gesture source. */
  config?: MaybeConfig,
): EventSource {
  // Make sure we have a DOM element to observe.
  ensureDOMInstance(element, Element);
  // Parse and extract the config (with defaults).
  const parsedConfig = parseConfig<KeyboardGestureObservableConfig>(config);
  const eventSource = merge(
    fromEvent(getNearestFocusableNode(element), KEY_DOWN),
    fromEvent(document, KEY_UP),
  );
  return pipe(
    eventSource,
    scan(updateEventSourceState, initEventSourceState(parsedConfig)),
  );
}

/**
 * A keyboard gesture callbag source.
 */
export function createSource(
  /** The DOM element to observe for keyboard events. */
  element: Element,
  /** Configuration for the keyboard gesture source. */
  config?: MaybeConfig,
): GestureSource;
export function createSource(
  /** The keyboard gesture event source. */
  source: EventSource,
): GestureSource;
export function createSource(
  elementOrSource: Element | EventSource,
  config?: MaybeConfig,
): GestureSource {
  const eventSource =
    typeof elementOrSource === 'function'
      ? elementOrSource
      : createEventSource(elementOrSource, config);

  let wasGesturing = false;
  const isGesturing = (
    sourceState: KeyboardGestureEventSourceState,
  ): boolean => {
    if (sourceState.canceled) {
      return false;
    }
    if (shouldPreventDefault(sourceState)) {
      sourceState.event?.preventDefault();
    }
    if (wasGesturing && !sourceState.gesturing) {
      // Let the 'end' event through.
      wasGesturing = sourceState.gesturing;
      return true;
    }
    wasGesturing = sourceState.gesturing;
    return sourceState.gesturing;
  };

  return share(
    pipe(
      eventSource,
      filter(isGesturing),
      map(extractEvent),
      scan(updateGestureState, DEFAULT_INITIAL_STATE),
    ),
  );
}

/**
 * An Observable of keyboard gestures.
 */
export function create(
  /** The DOM element to observe for keyboard events. */
  element: Element,
  /** Configuration for the KeyboardGestureObservable. */
  config?: MaybeConfig,
): DebugObservable<
  KeyboardGestureState | KeyboardGestureEndState,
  KeyboardGestureEventSourceState
> {
  const eventSource = share(createEventSource(element, config));
  return asObservable(createSource(eventSource), eventSource);
}

export default {create, createSource};

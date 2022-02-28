import {ensureDOMInstance} from '@hzdg/dom-utils';
import {Source} from 'callbag';
import share from 'callbag-share';
import pipe from 'callbag-pipe';
import map from 'callbag-map';
import scan from 'callbag-scan';
import merge from 'callbag-merge';
import filter from 'callbag-filter';
import fromEvent from 'callbag-from-event';
import asObservable, {DebugObservable} from './asObservable';
import {HORIZONTAL, VERTICAL} from './Orientation';
import {parseConfig, ObservableConfig} from './ObservableConfig';

export {HORIZONTAL, VERTICAL};

export const TOUCH_START = 'touchstart';
export const TOUCH_MOVE = 'touchmove';
export const TOUCH_END = 'touchend';

/**
 * Configuration for a TouchGestureObservable.
 */
export type TouchGestureObservableConfig = ObservableConfig;

/**
 * An event assocated with a touch gesture.
 */
export interface TouchGestureEvent extends TouchEvent {
  type: typeof TOUCH_START | typeof TOUCH_MOVE | typeof TOUCH_END;
}

/**
 * An event type associated with a touch gesture.
 */
export type TouchGestureType =
  | typeof TOUCH_START
  | typeof TOUCH_MOVE
  | typeof TOUCH_END;

interface TouchGestureBaseState {
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
  /** Whether or not a gesture is ongoing. */
  gesturing: boolean;
  /** The type of event last associated with a gesture. */
  type: TouchGestureType | null;
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
 * A snapshot of an in-progress touch gesture.
 */
export interface TouchGestureState extends TouchGestureBaseState {
  /** Indicates a gesture is ongoing. */
  gesturing: true;
  /** The type of event associated with the gesture. */
  type: typeof TOUCH_START | typeof TOUCH_MOVE;
}

/**
 * The last snapshot of a completed touch gesture.
 */
export interface TouchGestureEndState extends TouchGestureBaseState {
  /** Indicates a gesture is no longer ongoing. */
  gesturing: false;
  /** The type of event associated with the end of a gesture. */
  type: typeof TOUCH_END;
}

const DEFAULT_INITIAL_STATE: TouchGestureBaseState = {
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
  type: null,
  time: Infinity,
  timeInitial: Infinity,
  duration: 0,
  elapsed: 0,
};

function updateGestureState(
  state: TouchGestureBaseState,
  event: TouchGestureEvent,
): TouchGestureBaseState | TouchGestureState | TouchGestureEndState {
  const {timeStamp: time} = event;
  switch (event.type) {
    case TOUCH_START:
    case TOUCH_MOVE:
      if (state.gesturing) {
        return {
          ...state,
          time,
          duration: time - state.time,
          elapsed: time - state.timeInitial,
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          xPrev: state.x,
          yPrev: state.y,
          xDelta: event.touches[0].clientX - state.xInitial,
          yDelta: event.touches[0].clientY - state.yInitial,
          xVelocity: event.touches[0].clientX - state.x,
          yVelocity: event.touches[0].clientY - state.y,
          gesturing: true,
          type: event.type,
        };
      } else {
        return {
          ...state,
          time,
          timeInitial: time,
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
          xInitial: event.touches[0].clientX,
          yInitial: event.touches[0].clientY,
          xPrev: event.touches[0].clientX,
          yPrev: event.touches[0].clientY,
          xDelta: 0,
          yDelta: 0,
          gesturing: true,
          type: event.type,
        };
      }
    case TOUCH_END:
      return {
        ...state,
        time,
        duration: time - state.time,
        elapsed: time - state.timeInitial,
        gesturing: false,
        type: event.type,
      };
  }
  throw new Error(`Could not handle event ${event}`);
}

function shouldGesture(state: TouchGestureEventSourceState): boolean {
  if (!state.firstEvent) return false;
  if (!state.event) return false;
  if (!state.threshold) return true;
  const {firstEvent, event} = state;
  switch (state.orientation) {
    case VERTICAL: {
      const yDelta = event.touches[0].clientY - firstEvent.touches[0].clientY;
      return Math.abs(yDelta) > state.threshold;
    }
    case HORIZONTAL: {
      const xDelta = event.touches[0].clientX - firstEvent.touches[0].clientX;
      return Math.abs(xDelta) > state.threshold;
    }
    default: {
      const yDelta = event.touches[0].clientY - firstEvent.touches[0].clientY;
      const xDelta = event.touches[0].clientX - firstEvent.touches[0].clientX;
      return Math.max(Math.abs(xDelta), Math.abs(yDelta)) > state.threshold;
    }
  }
}

function shouldCancel(state: TouchGestureEventSourceState): boolean {
  if (!state.firstEvent) return false;
  if (!state.event) return false;
  if (!state.orientation) return false;
  const cancelThreshold = Math.max(0, state.cancelThreshold ?? 0);
  const yDelta = Math.abs(
    state.event.touches[0].clientY - state.firstEvent.touches[0].clientY,
  );
  const xDelta = Math.abs(
    state.event.touches[0].clientX - state.firstEvent.touches[0].clientX,
  );
  switch (state.orientation) {
    case VERTICAL: {
      return xDelta > yDelta && xDelta > cancelThreshold;
    }
    case HORIZONTAL: {
      return yDelta > xDelta && yDelta > cancelThreshold;
    }
  }
}

const WEBKIT_HACK_OPTIONS: AddEventListenerOptions = {passive: false};

/**
 * Webkit does not allow event.preventDefault() in dynamically added handlers
 * (i.e., a handler added to 'touchmove' after handling a 'touchstart'),
 * so we add a permanent 'touchmove' handler to get around this.
 * webkit bug: https://bugs.webkit.org/show_bug.cgi?id=185656
 * Original implementation: https://github.com/atlassian/react-beautiful-dnd/pull/416
 */
class WebkitHack {
  constructor() {
    // Do nothing when server side rendering or no touch support.
    if (typeof window !== 'undefined' && 'ontouchstart' in window) {
      // Adding a persistent event handler.
      // It can't be passive, otherwise we wouldn't
      // be able to preventDefault().
      window.addEventListener(
        TOUCH_MOVE,
        this.handleTouchMove,
        WEBKIT_HACK_OPTIONS,
      );
    }
  }

  shouldPreventDefault = false;

  destroy(): void {
    if (typeof window === 'undefined') return;
    window.removeEventListener(
      TOUCH_MOVE,
      this.handleTouchMove,
      WEBKIT_HACK_OPTIONS,
    );
  }

  handleTouchMove = (event: Event): void => {
    if (this.shouldPreventDefault && !event.defaultPrevented) {
      event.preventDefault();
    }
  };

  preventTouchMove(): void {
    this.shouldPreventDefault = true;
  }

  allowTouchMove(): void {
    this.shouldPreventDefault = false;
  }
}

/**
 * A payload for debugging touch gestures.
 *
 * This is the payload passed to the `__debug` gesture handler.
 */
export interface TouchGestureEventSourceState
  extends TouchGestureObservableConfig {
  event?: TouchGestureEvent;
  firstEvent: TouchGestureEvent | null;
  gesturing: boolean;
  canceled: boolean;
  webkitHack: WebkitHack | null;
}

type EventSource = Source<TouchGestureEventSourceState>;
type GestureSource = Source<TouchGestureState | TouchGestureEndState>;
type MaybeConfig = Partial<TouchGestureObservableConfig> | null;

const extractEvent = ({
  event,
}: TouchGestureEventSourceState): TouchGestureEvent =>
  event as TouchGestureEvent;

function initEventSourceState(
  config: TouchGestureObservableConfig,
): TouchGestureEventSourceState {
  const state = {
    ...config,
    firstEvent: null,
    gesturing: false,
    canceled: false,
    webkitHack: config.preventDefault ? new WebkitHack() : null,
  };
  return state;
}

function shouldPreventDefault(state: TouchGestureEventSourceState): boolean {
  return (
    state.event instanceof TouchEvent &&
    state.event.type === TOUCH_MOVE &&
    state.preventDefault &&
    !state.event.defaultPrevented &&
    typeof state.event.preventDefault === 'function'
  );
}

function updateEventSourceState(
  state: TouchGestureEventSourceState,
  action: TouchGestureEvent,
): TouchGestureEventSourceState {
  state.event = action;
  switch (action.type) {
    case TOUCH_START: {
      if (state.firstEvent) return state;
      state.firstEvent = action;
      if (state.webkitHack) state.webkitHack.preventTouchMove();
      if (state.threshold) return state;
      state.gesturing = true;
      return state;
    }
    case TOUCH_MOVE: {
      if (!state.firstEvent) return state;
      if (state.canceled) return state;
      if (!state.gesturing) {
        state.gesturing = shouldGesture(state);
        if (!state.gesturing) {
          state.canceled = shouldCancel(state);
          return state;
        }
      }
      return state;
    }
    case TOUCH_END: {
      if (!state.firstEvent) return state;
      if (state.webkitHack) state.webkitHack.allowTouchMove();
      state.firstEvent = null;
      state.canceled = false;
      state.gesturing = false;
      return state;
    }
  }
}

function createEventSource(
  /** The DOM element to observe for mouse events. */
  element: Element,
  /** Configuration for the mouse gesture source. */
  config?: MaybeConfig,
): Source<TouchGestureEventSourceState> {
  // Make sure we have a DOM element to observe.
  ensureDOMInstance(element, Element);
  // Parse and extract the config (with defaults).
  const parsedConfig = parseConfig<TouchGestureObservableConfig>(config);
  const eventSource = merge(
    fromEvent(element, TOUCH_START),
    fromEvent(document, TOUCH_END),
    fromEvent(document, TOUCH_MOVE, {passive: parsedConfig.passive}),
  );

  let hasFirstEvent = false;
  const maybeGestureEvent = (state: TouchGestureEventSourceState): boolean => {
    const hadFirstEvent = hasFirstEvent;
    hasFirstEvent = Boolean(state.firstEvent);
    // If state has a 'firstEvent', or had a `firstEvent`
    // on the last update, we might be gesturing.
    return hasFirstEvent || hadFirstEvent;
  };

  return pipe(
    eventSource,
    scan(updateEventSourceState, initEventSourceState(parsedConfig)),
    filter(maybeGestureEvent),
  );
}

/**
 * A touch gesture callbag source.
 */
export function createSource(
  /** The DOM element to observe for touch events. */
  element: Element,
  /** Configuration for the touch gesture source. */
  config?: MaybeConfig,
): GestureSource;
export function createSource(
  /** The touch gesture event source. */
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
  const isGesturing = (sourceState: TouchGestureEventSourceState): boolean => {
    if (sourceState.canceled) {
      return false;
    }
    if (shouldPreventDefault(sourceState)) {
      sourceState.event?.preventDefault;
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
 * An Observable of touch gestures.
 */
export function create(
  /** The DOM element to observe for touch events. */
  element: Element,
  /** Configuration for the TouchGestureObservable. */
  config?: Partial<TouchGestureObservableConfig> | null,
): DebugObservable<
  TouchGestureState | TouchGestureEndState,
  TouchGestureEventSourceState
> {
  const eventSource = share(createEventSource(element, config));
  return asObservable(createSource(eventSource), eventSource);
}

export default {create, createSource};

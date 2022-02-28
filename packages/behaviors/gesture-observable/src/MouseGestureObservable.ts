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

export const MOUSE_DOWN = 'mousedown';
export const MOUSE_MOVE = 'mousemove';
export const MOUSE_UP = 'mouseup';

/**
 * An event assocated with a mouse gesture.
 */
export interface MouseGestureEvent extends MouseEvent {
  type: typeof MOUSE_DOWN | typeof MOUSE_MOVE | typeof MOUSE_UP;
}

/**
 * Configuration for a MouseGestureObservable.
 */
export type MouseGestureObservableConfig = ObservableConfig;

/**
 * An event type associated with a mouse gesture.
 */
export type MouseGestureType =
  | typeof MOUSE_DOWN
  | typeof MOUSE_MOVE
  | typeof MOUSE_UP;

interface MouseGestureBaseState {
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
  type: MouseGestureType | null;
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
 * A snapshot of an in-progress mouse gesture.
 */
export interface MouseGestureState extends MouseGestureBaseState {
  /** Indicates a gesture is ongoing. */
  gesturing: true;
  /** The type of event associated with the gesture. */
  type: typeof MOUSE_DOWN | typeof MOUSE_MOVE;
}

/**
 * The last snapshot of a completed mouse gesture.
 */
export interface MouseGestureEndState extends MouseGestureBaseState {
  /** Indicates a gesture is no longer ongoing. */
  gesturing: false;
  /** The type of event associated with the end of a gesture. */
  type: typeof MOUSE_UP;
}

const DEFAULT_INITIAL_STATE: MouseGestureBaseState = {
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
  state: MouseGestureBaseState,
  event: MouseGestureEvent,
): MouseGestureBaseState | MouseGestureState | MouseGestureEndState {
  const {timeStamp: time} = event;
  switch (event.type) {
    case MOUSE_DOWN:
    case MOUSE_MOVE:
      if (state.gesturing) {
        return {
          ...state,
          time,
          duration: time - state.time,
          elapsed: time - state.timeInitial,
          x: event.clientX,
          y: event.clientY,
          xPrev: state.x,
          yPrev: state.y,
          xDelta: event.clientX - state.xInitial,
          yDelta: event.clientY - state.yInitial,
          xVelocity: event.clientX - state.x,
          yVelocity: event.clientY - state.y,
          gesturing: true,
          type: event.type,
        };
      } else {
        return {
          ...state,
          time,
          timeInitial: time,
          x: event.clientX,
          y: event.clientY,
          xInitial: event.clientX,
          yInitial: event.clientY,
          xPrev: event.clientX,
          yPrev: event.clientY,
          xDelta: 0,
          yDelta: 0,
          gesturing: true,
          type: event.type,
        };
      }
    case MOUSE_UP:
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

function shouldGesture(state: MouseGestureEventSourceState): boolean {
  if (!state.firstEvent) return false;
  if (!state.event) return false;
  if (!state.threshold) return true;
  switch (state.orientation) {
    case VERTICAL: {
      const yDelta = Math.abs(state.event.clientY - state.firstEvent.clientY);
      return yDelta > state.threshold;
    }
    case HORIZONTAL: {
      const xDelta = Math.abs(state.event.clientX - state.firstEvent.clientX);
      return xDelta > state.threshold;
    }
    default: {
      const yDelta = Math.abs(state.event.clientY - state.firstEvent.clientY);
      const xDelta = Math.abs(state.event.clientX - state.firstEvent.clientX);
      return Math.max(xDelta, yDelta) > state.threshold;
    }
  }
}

function shouldCancel(state: MouseGestureEventSourceState): boolean {
  if (!state.firstEvent) return false;
  if (!state.event) return false;
  if (!state.orientation) return false;
  const cancelThreshold = Math.max(0, state.cancelThreshold ?? 0);
  const xDelta = Math.abs(state.event.clientX - state.firstEvent.clientX);
  const yDelta = Math.abs(state.event.clientY - state.firstEvent.clientY);
  switch (state.orientation) {
    case VERTICAL: {
      return xDelta > yDelta && xDelta > cancelThreshold;
    }
    case HORIZONTAL: {
      return yDelta > xDelta && yDelta > cancelThreshold;
    }
  }
}

const CLICK = 'click';

class ClickHack {
  clickTimeout: NodeJS.Timeout | null = null;
  clickHandler = (event: Event): void => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof window === 'undefined') return;
    window.removeEventListener(CLICK, this.clickHandler, true);
  };

  preventNextClick(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener(CLICK, this.clickHandler, true);
    this.clickTimeout = setTimeout(this.destroy.bind(this), 0);
  }

  destroy(): void {
    if (this.clickTimeout != null) {
      clearTimeout(this.clickTimeout);
      this.clickTimeout = null;
    }
    if (typeof window === 'undefined') return;
    window.removeEventListener(CLICK, this.clickHandler, true);
  }
}

/**
 * A payload for debugging mouse gestures.
 *
 * This is the payload passed to the `__debug` gesture handler.
 */
export interface MouseGestureEventSourceState
  extends MouseGestureObservableConfig {
  event?: MouseGestureEvent;
  firstEvent: MouseGestureEvent | null;
  gesturing: boolean;
  canceled: boolean;
  clickHack: ClickHack | null;
}

type EventSource = Source<MouseGestureEventSourceState>;
type GestureSource = Source<MouseGestureState | MouseGestureEndState>;
type MaybeConfig = Partial<MouseGestureObservableConfig> | null;

const extractEvent = ({
  event,
}: MouseGestureEventSourceState): MouseGestureEvent =>
  event as MouseGestureEvent;

function initEventSourceState(
  config: MouseGestureObservableConfig,
): MouseGestureEventSourceState {
  return {
    ...config,
    firstEvent: null,
    gesturing: false,
    canceled: false,
    clickHack: config.preventDefault ? new ClickHack() : null,
  };
}

function shouldPreventDefault(state: MouseGestureEventSourceState): boolean {
  return (
    state.event instanceof MouseEvent &&
    state.event.type === MOUSE_MOVE &&
    state.preventDefault &&
    !state.event.defaultPrevented &&
    typeof state.event.preventDefault === 'function'
  );
}

function updateEventSourceState(
  state: MouseGestureEventSourceState,
  action: MouseGestureEvent,
): MouseGestureEventSourceState {
  state.event = action;

  switch (action.type) {
    case MOUSE_DOWN: {
      if (state.firstEvent) return state;
      state.firstEvent = action;
      if (state.threshold) return state;
      state.gesturing = true;
      return state;
    }
    case MOUSE_MOVE: {
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
    case MOUSE_UP: {
      if (!state.firstEvent) return state;
      if (state.gesturing && state.clickHack) {
        state.clickHack.preventNextClick();
      }
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
): EventSource {
  // Make sure we have a DOM element to observe.
  ensureDOMInstance(element, Element);
  // Parse and extract the config (with defaults).
  const parsedConfig = parseConfig<MouseGestureObservableConfig>(config);
  const eventSource = merge(
    fromEvent(element, MOUSE_DOWN),
    fromEvent(document, MOUSE_UP),
    fromEvent(document, MOUSE_MOVE, {passive: parsedConfig.passive}),
  );

  let hasFirstEvent = false;
  const maybeGestureEvent = (state: MouseGestureEventSourceState): boolean => {
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
 * A mouse gesture callbag source.
 */
export function createSource(
  /** The DOM element to observe for mouse events. */
  element: Element,
  /** Configuration for the mouse gesture source. */
  config?: MaybeConfig,
): GestureSource;
export function createSource(
  /** The mouse gesture event source. */
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
  const isGesturing = (sourceState: MouseGestureEventSourceState): boolean => {
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
 * An Observable of mouse gestures.
 */
export const create = (
  /** The DOM element to observe for mouse events. */
  element: Element,
  /** Configuration for the MouseGestureObservable. */
  config?: Partial<MouseGestureObservableConfig> | null,
): DebugObservable<
  MouseGestureState | MouseGestureEndState,
  MouseGestureEventSourceState
> => {
  const eventSource = share(createEventSource(element, config));
  return asObservable(createSource(eventSource), eventSource);
};

export default {create, createSource};

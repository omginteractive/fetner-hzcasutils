import {ensureDOMInstance} from '@hzdg/dom-utils';
import MovingAverage from '@hzdg/moving-average';
import {Source, Sink} from 'callbag';
import share from 'callbag-share';
import pipe from 'callbag-pipe';
import scan from 'callbag-scan';
import map from 'callbag-map';
import merge from 'callbag-merge';
import filter from 'callbag-filter';
import fromEvent from 'callbag-from-event';
import createSubject from 'callbag-subject';
import asObservable, {DebugObservable} from './asObservable';
import {HORIZONTAL, VERTICAL} from './Orientation';
import {parseConfig, ObservableConfig} from './ObservableConfig';

type Subject<T> = Source<T> & Sink<T>;

export {HORIZONTAL, VERTICAL};

export const WHEEL = 'wheel';
export const GESTURE_END = 'gestureend';
export const UNBLOCK = 'unblock';
export const CANCEL_END = 'cancelend';

/**
 * Configuration for a WheelGestureObservable.
 */
export interface WheelGestureObservableConfig extends ObservableConfig {
  velocityThreshold?: number;
  velocityDeviationThreshold?: number;
}

/**
 * How long to wait for additional intentional events
 * before ending a gesture.
 */
const GESTURE_END_TIMEOUT_MIN = 35;
const GESTURE_END_TIMEOUT_MAX = 140;
/**
 * The lower bound on the average intentional event delta.
 * When the average delta is smaller than this, incoming
 * wheel events won't be considered 'intentional'
 * unless they deviate significantly from the average.
 */
const VELOCITY_THRESHOLD = 0.1;
/**
 * How big the absolute difference between an event delta
 * and the average must be to be considered intentional.
 */
const VELOCITY_DEVIATION_THRESHOLD = 0.01;
/** How many pixels one delta{X,Y} unit is when `wheelMode` is 'line'. */
const LINE_HEIGHT = 40;
/** How many pixels one delta{X,Y} unit is when `wheelMode` is 'page'. */
const PAGE_HEIGHT = 800;
/** How many pixels one native wheelDelta{X,Y} 'spin' (probably) covers. */
const SPIN_FACTOR = 120;

type UnnormalizedWheelEvent = WheelEvent & {
  wheelDelta: number;
  wheelDeltaX: number;
  wheelDeltaY: number;
};

/**
 * An event assocated with a wheel gesture.
 */
export interface WheelGestureEvent extends WheelEvent {
  type: typeof WHEEL;
  /**
   * The original unnormalized wheel event.
   */
  originalEvent: UnnormalizedWheelEvent;
  /**
   * Normalized speed the wheel was spun (or trackpad dragged)
   * in the x dimension.
   *
   * Attempts to represent a single slow step on a wheel as 1,
   * with the intention to smooth over discrete wheel steps
   * to more closely resemble trackpad movement.
   */
  spinX: number;
  /**
   * Normalized speed the wheel was spun (or trackpad dragged)
   * in the y dimension.
   *
   * Attempts to represent a single slow step on a wheel as 1,
   * with the intention to smooth over discrete wheel steps
   * to more closely resemble trackpad movement.
   */
  spinY: number;
  /**
   * Normalized distance the wheel has moved (in pixels) in the x dimension.
   *
   * Attempts to represent the same 'line' or 'page' distance across browsers
   * for wheel events that have 'line' or 'page' `deltaMode`.
   */
  deltaX: number;
  /**
   * Normalized distance the wheel has moved (in pixels) in the y dimension.
   *
   * Attempts to represent the same 'line' or 'page' distance across browsers
   * for wheel events that have 'line' or 'page' `deltaMode`.
   */
  deltaY: number;
}

/**
 * An event assocated with the end of a wheel gesture.
 * This is needed for wheel gestures because
 * there is nothing that natively represents 'wheel end'.
 */
export interface GestureEndEvent {
  type: typeof GESTURE_END;
  timeStamp: number;
}

interface UnblockEvent {
  type: typeof UNBLOCK;
  timeStamp: number;
}

interface CancelEndEvent {
  type: typeof CANCEL_END;
  timeStamp: number;
}

type WheelGestureAction = GestureEndEvent | UnblockEvent | CancelEndEvent;

const isGestureEndEvent = (
  event: {type?: string | null} | null,
): event is GestureEndEvent => event?.type === GESTURE_END;

// Based on https://github.com/facebookarchive/fixed-data-table/blob/3a9bf3/src/vendor_upstream/dom/normalizeWheel.js
function normalizeWheel(event: UnnormalizedWheelEvent): WheelGestureEvent {
  let {deltaX, deltaY} = event;
  const {deltaMode, timeStamp = Date.now()} = event;

  if ((deltaX || deltaY) && deltaMode) {
    if (deltaMode === 1) {
      // delta in LINE units
      deltaX *= LINE_HEIGHT;
      deltaY *= LINE_HEIGHT;
    } else {
      // delta in PAGE units
      deltaX *= PAGE_HEIGHT;
      deltaY *= PAGE_HEIGHT;
    }
  }

  let spinX = 0;
  let spinY = 0;

  if ('detail' in event) {
    spinY = event.detail;
  }
  if ('wheelDelta' in event) {
    spinY = -event.wheelDelta / SPIN_FACTOR;
  }
  if ('wheelDeltaY' in event) {
    spinY = -event.wheelDeltaY / SPIN_FACTOR;
  }
  if ('wheelDeltaX' in event) {
    spinX = -event.wheelDeltaX / SPIN_FACTOR;
  }

  // Fall-back if spin cannot be determined
  if (deltaX && !spinX) {
    spinX = deltaX < 1 ? -1 : 1;
  }

  if (deltaY && !spinY) {
    spinY = deltaY < 1 ? -1 : 1;
  }

  return {
    ...event,
    type: 'wheel',
    originalEvent: event,
    spinX,
    spinY,
    deltaX,
    deltaY,
    deltaMode,
    timeStamp,
  };
}

/**
 * An event type associated with a wheel gesture.
 */
export type WheelGestureType = typeof WHEEL | typeof GESTURE_END;

interface WheelGestureBaseState {
  /** The latest x position for the gesture. */
  x: number;
  /** The latest y position for the gesture. */
  y: number;
  /** The cumulative change of the spin speed in the x dimension. */
  xSpin: number;
  /** The cumulative change of the spin speed in the y dimension. */
  ySpin: number;
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
  type: WheelGestureType | null;
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
 * A snapshot of an in-progress wheel gesture.
 */
export interface WheelGestureState extends WheelGestureBaseState {
  /** Indicates a gesture is ongoing. */
  gesturing: true;
  /** The type of event associated with the gesture. */
  type: typeof WHEEL;
}

/**
 * The last snapshot of a completed wheel gesture.
 */
export interface WheelGestureEndState extends WheelGestureBaseState {
  /** Indicates a gesture is no longer ongoing. */
  gesturing: false;
  /** The type of event associated with the end of a gesture. */
  type: typeof GESTURE_END;
}

const INITIAL_GESTURE_STATE: WheelGestureBaseState = {
  x: 0,
  y: 0,
  xSpin: 0,
  ySpin: 0,
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
  state: WheelGestureBaseState,
  event: WheelGestureEvent | GestureEndEvent,
): WheelGestureBaseState | WheelGestureState | WheelGestureEndState {
  const {timeStamp: time} =
    'originalEvent' in event ? event.originalEvent : event;
  switch (event.type) {
    case WHEEL:
      if (state.gesturing) {
        return {
          ...state,
          time,
          duration: time - state.time,
          elapsed: time - state.timeInitial,
          x: event.clientX || event.originalEvent.clientX || state.x,
          y: event.clientY || event.originalEvent.clientY || state.y,
          xPrev: state.x,
          yPrev: state.y,
          xDelta: state.xDelta - event.deltaX,
          yDelta: state.yDelta - event.deltaY,
          xSpin: state.xSpin + event.spinX,
          ySpin: state.ySpin + event.spinY,
          xVelocity: event.deltaX ? -event.deltaX : 0,
          yVelocity: event.deltaY ? -event.deltaY : 0,
          gesturing: true,
          type: event.type,
        };
      } else {
        return {
          ...state,
          time,
          timeInitial: time,
          x: event.clientX || event.originalEvent.clientX || 0,
          y: event.clientY || event.originalEvent.clientY || 0,
          xInitial: event.clientX || event.originalEvent.clientX || 0,
          yInitial: event.clientY || event.originalEvent.clientY || 0,
          xPrev: event.clientX || event.originalEvent.clientX || 0,
          yPrev: event.clientY || event.originalEvent.clientY || 0,
          xDelta: event.deltaX ? -event.deltaX : 0,
          yDelta: event.deltaY ? -event.deltaY : 0,
          xVelocity: event.deltaX ? -event.deltaX : 0,
          yVelocity: event.deltaY ? -event.deltaY : 0,
          xSpin: event.spinX,
          ySpin: event.spinY,
          gesturing: true,
          type: event.type,
        };
      }
    case GESTURE_END: {
      return {
        ...state,
        time,
        duration: time - state.time,
        elapsed: time - state.timeInitial,
        gesturing: false,
        type: event.type,
      };
    }
  }
  throw new Error(`Could not handle event ${event}`);
}

/**
 * A payload for debugging wheel gestures.
 *
 * This is the payload passed to the `__debug` gesture handler.
 */
export interface WheelGestureEventSourceState
  extends WheelGestureObservableConfig {
  event?: WheelGestureEvent;
  x: MovingAverage;
  y: MovingAverage;
  v: MovingAverage;
  t: MovingAverage;
  gesturing: boolean;
  intentional: boolean;
  blocked: boolean;
  canceled: boolean;
  lastTimestamp: number | null;
}

type EventSource = Source<WheelGestureEventSourceState>;
type GestureSource = Source<WheelGestureState | WheelGestureEndState>;
type MaybeConfig = Partial<WheelGestureObservableConfig> | null;
type ActionsSubject = Subject<WheelGestureAction>;

const extractEvent = ({
  event,
}: WheelGestureEventSourceState): WheelGestureEvent =>
  event as WheelGestureEvent;

function initSourceState(
  config: WheelGestureObservableConfig,
): WheelGestureEventSourceState {
  const state = {
    x: new MovingAverage({size: 6, weight: -1}),
    y: new MovingAverage({size: 6, weight: -1}),
    v: new MovingAverage({size: 6, weight: -1}),
    t: new MovingAverage({size: 6, weight: 0, round: true}),
    endTimeout: null,
    gesturing: false,
    intentional: false,
    blocked: false,
    canceled: false,
    lastTimestamp: null,
    ...config,
  };
  state.t.push(GESTURE_END_TIMEOUT_MAX);
  return state;
}

function shouldGesture(state: WheelGestureEventSourceState): boolean {
  if (!state.event) return false;
  if (!state.threshold) return true;
  switch (state.orientation) {
    case VERTICAL: {
      const yDelta = Math.abs(state.y.delta);
      return yDelta > state.threshold;
    }
    case HORIZONTAL: {
      const xDelta = Math.abs(state.x.delta);
      return xDelta > state.threshold;
    }
    default: {
      const yDelta = Math.abs(state.y.delta);
      const xDelta = Math.abs(state.x.delta);
      return Math.max(xDelta, yDelta) > state.threshold;
    }
  }
}

function shouldCancel(state: WheelGestureEventSourceState): boolean {
  if (!state.event) return false;
  if (!state.orientation) return false;
  const cancelThreshold = Math.max(0, state.cancelThreshold ?? 0);
  const xDelta = Math.abs(state.x.delta);
  const yDelta = Math.abs(state.y.delta);
  switch (state.orientation) {
    case VERTICAL: {
      return xDelta > yDelta && xDelta > cancelThreshold;
    }
    case HORIZONTAL: {
      return yDelta > xDelta && yDelta > cancelThreshold;
    }
  }
}

function shouldPreventDefault({
  event,
  preventDefault,
  passive,
  canceled,
}: WheelGestureEventSourceState): boolean {
  return (
    event?.originalEvent instanceof WheelEvent &&
    event.originalEvent.type === WHEEL &&
    preventDefault &&
    !passive &&
    !canceled &&
    !event.originalEvent.defaultPrevented &&
    typeof event.originalEvent.preventDefault === 'function'
  );
}

function updateSourceState(
  state: WheelGestureEventSourceState,
  action: WheelGestureEvent | WheelGestureAction,
): WheelGestureEventSourceState {
  const wasGesturing = state.gesturing;
  switch (action.type) {
    case CANCEL_END:
    case GESTURE_END:
    case UNBLOCK: {
      if (wasGesturing || state.canceled || state.blocked) {
        state.x.reset();
        state.y.reset();
        state.v.reset();
        state.t.reset();
        state.t.push(GESTURE_END_TIMEOUT_MAX);
        state.lastTimestamp = null;
        state.gesturing = false;
        state.intentional = false;
        state.blocked = wasGesturing;
        state.canceled = false;
      }
      break;
    }
    default: {
      state.event = action;
      state.v.push(
        Math.hypot(
          isNaN(state.x.peek()) ? 0 : action.spinX - state.x.peek(),
          isNaN(state.y.peek()) ? 0 : action.spinY - state.y.peek(),
        ),
      );
      state.x.push(action.spinX);
      state.y.push(action.spinY);

      if (state.lastTimestamp) {
        state.t.push(
          Math.min(
            GESTURE_END_TIMEOUT_MAX,
            Math.max(
              GESTURE_END_TIMEOUT_MIN,
              (action.timeStamp - state.lastTimestamp) * 2,
            ),
          ),
        );
      }
      state.lastTimestamp = action.timeStamp;

      if (state.canceled || state.blocked) return state;

      state.gesturing = state.gesturing || shouldGesture(state);
      state.intentional =
        (state.gesturing && !wasGesturing) ||
        !state.v.rolling ||
        state.v.deviation > VELOCITY_DEVIATION_THRESHOLD ||
        state.v.value > VELOCITY_THRESHOLD;
      state.canceled = state.gesturing ? false : shouldCancel(state);
      break;
    }
  }

  return state;
}

function createEventSource(
  /** The state update action stream. */
  actions: ActionsSubject,
  /** The DOM element to observe for wheel events. */
  element: Element,
  /** Configuration for the wheel gesture source. */
  config?: MaybeConfig,
): EventSource {
  // Make sure we have a DOM element to observe.
  ensureDOMInstance(element, Element);
  // Parse and extract the config (with defaults).
  const parsedConfig = parseConfig<WheelGestureObservableConfig>({
    ...config,
    velocityThreshold: config?.velocityThreshold ?? VELOCITY_THRESHOLD,
    velocityDeviationThreshold:
      config?.velocityDeviationThreshold ?? VELOCITY_DEVIATION_THRESHOLD,
  });
  const eventSource = pipe(
    fromEvent(element, WHEEL, {passive: parsedConfig.passive}),
    map(normalizeWheel),
  );
  return pipe(
    merge(eventSource, actions),
    scan(updateSourceState, initSourceState(parsedConfig)),
  );
}

/**
 * A wheel gesture callbag source.
 */
export function createSource(
  /** The DOM element to observe for wheel events. */
  element: Element,
  /** Configuration for the wheel gesture source. */
  config?: MaybeConfig,
): GestureSource;
export function createSource(
  /** The gesture event source. */
  source: EventSource,
  /** The state update action stream. */
  actions: ActionsSubject,
): GestureSource;
export function createSource(
  elementOrSource: Element | EventSource,
  actionsOrConfig?: MaybeConfig | ActionsSubject,
): GestureSource {
  let source: EventSource;
  let actions: ActionsSubject;
  if (typeof elementOrSource === 'function') {
    source = elementOrSource;
    if (typeof actionsOrConfig !== 'function') {
      throw new Error(
        'an actions source is required when using an event source!',
      );
    }
    actions = actionsOrConfig;
  } else {
    actions = createSubject<WheelGestureAction>();
    source = createEventSource(
      actions,
      elementOrSource,
      actionsOrConfig as MaybeConfig,
    );
  }

  const dispatch = (action: WheelGestureAction): void => {
    actions(1, action);
  };

  let endTimeout: NodeJS.Timeout | null = null;
  let lastEvent: WheelGestureEvent | undefined;

  const dispatchEndEvent = (
    sourceState: WheelGestureEventSourceState,
  ) => (): void => {
    if (endTimeout != null) clearTimeout(endTimeout);
    endTimeout = null;
    if (sourceState.gesturing) {
      dispatch(new WheelEvent(GESTURE_END, lastEvent) as GestureEndEvent);
    } else if (sourceState.blocked) {
      dispatch(new WheelEvent(UNBLOCK, lastEvent) as UnblockEvent);
    } else if (sourceState.canceled) {
      dispatch(new WheelEvent(CANCEL_END, lastEvent) as CancelEndEvent);
    }
  };

  const scheduleGestureEnd = (
    sourceState: WheelGestureEventSourceState,
  ): void => {
    if (endTimeout != null) clearTimeout(endTimeout);
    endTimeout = setTimeout(dispatchEndEvent(sourceState), sourceState.t.value);
  };

  const isGesturing = (sourceState: WheelGestureEventSourceState): boolean => {
    if (!sourceState.event || isGestureEndEvent(sourceState.event)) {
      return false;
    }

    lastEvent = sourceState.event;

    if (shouldPreventDefault(sourceState)) {
      sourceState.event?.originalEvent.preventDefault();
    }

    if (sourceState.canceled || sourceState.blocked) {
      // Debounce the cancel end timeout.
      scheduleGestureEnd(sourceState);
      return false;
    }

    if (sourceState.gesturing && sourceState.intentional) {
      // Debounce the gesture end timeout.
      scheduleGestureEnd(sourceState);
    }

    return sourceState.gesturing;
  };

  return share(
    pipe(
      merge(
        pipe(source, filter(isGesturing), map(extractEvent)),
        pipe(actions, filter(isGestureEndEvent)),
      ),
      scan(updateGestureState, INITIAL_GESTURE_STATE),
    ),
  );
}

/**
 * An Observable of a wheel gesture.
 *
 * Uses normalized versions of wheel event values because they
 * can vary significantly on different platforms and browsers.
 * For example, some devices (like trackpads) emit more events
 * at smaller increments with fine granularity, and some emit
 * massive jumps with linear speed or acceleration.
 *
 * Also uses a `gestureend` event to indicate when the intent
 * to end a wheel gesture has been detected. This is useful
 * because there is no native representation of a 'wheelend' event
 * (like you get from touch with 'touchend' or mouse with 'mouseup'),
 * which makes it difficult to decide when to resolve a guess
 * for a gesturing user's intention.
 */
export function create(
  /** The DOM element to observe for wheel events. */
  element: Element,
  /** Configuration for the WheelGestureObservable. */
  config?: MaybeConfig,
): DebugObservable<
  WheelGestureState | WheelGestureEndState,
  WheelGestureEventSourceState
> {
  const actions = createSubject<WheelGestureAction>();
  const eventSource = share(createEventSource(actions, element, config));
  return asObservable(createSource(eventSource, actions), eventSource);
}

export default {create, createSource};

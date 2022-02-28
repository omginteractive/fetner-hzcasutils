import Observable from 'zen-observable';
import {ensureDOMInstance} from '@hzdg/dom-utils';
import merge from 'callbag-merge';
import asObservable from './asObservable';
import * as Orientation from './Orientation';
import * as WheelGestureObservable from './WheelGestureObservable';
import * as MouseGestureObservable from './MouseGestureObservable';
import * as TouchGestureObservable from './TouchGestureObservable';
import * as KeyboardGestureObservable from './KeyboardGestureObservable';
import * as ObservableConfig from './ObservableConfig';

export {
  WheelGestureObservable,
  MouseGestureObservable,
  TouchGestureObservable,
  KeyboardGestureObservable,
};

export {HORIZONTAL, VERTICAL} from './Orientation';
export {WHEEL, GESTURE_END} from './WheelGestureObservable';
export {MOUSE_DOWN, MOUSE_MOVE, MOUSE_UP} from './MouseGestureObservable';
export {TOUCH_START, TOUCH_MOVE, TOUCH_END} from './TouchGestureObservable';
export {
  KEY_DOWN,
  KEY_UP,
  SPACE,
  PAGE_UP,
  PAGE_DOWN,
  END,
  HOME,
  ARROW_LEFT,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_DOWN,
} from './KeyboardGestureObservable';

export type WheelGestureType = WheelGestureObservable.WheelGestureType;
export type WheelGestureEvent = WheelGestureObservable.WheelGestureEvent;
export type WheelGestureEventSourceState = WheelGestureObservable.WheelGestureEventSourceState;
export type GestureEndEvent = WheelGestureObservable.GestureEndEvent;
export type WheelGestureState = WheelGestureObservable.WheelGestureState;
export type WheelGestureEndState = WheelGestureObservable.WheelGestureEndState;
export type WheelGestureObservableConfig = WheelGestureObservable.WheelGestureObservableConfig;

export type MouseGestureType = MouseGestureObservable.MouseGestureType;
export type MouseGestureEvent = MouseGestureObservable.MouseGestureEvent;
export type MouseGestureEventSourceState = MouseGestureObservable.MouseGestureEventSourceState;
export type MouseGestureState = MouseGestureObservable.MouseGestureState;
export type MouseGestureEndState = MouseGestureObservable.MouseGestureEndState;
export type MouseGestureObservableConfig = MouseGestureObservable.MouseGestureObservableConfig;

export type TouchGestureType = TouchGestureObservable.TouchGestureType;
export type TouchGestureEvent = TouchGestureObservable.TouchGestureEvent;
export type TouchGestureEventSourceState = TouchGestureObservable.TouchGestureEventSourceState;
export type TouchGestureState = TouchGestureObservable.TouchGestureState;
export type TouchGestureEndState = TouchGestureObservable.TouchGestureEndState;
export type TouchGestureObservableConfig = TouchGestureObservable.TouchGestureObservableConfig;

export type KeyboardGestureType = KeyboardGestureObservable.KeyboardGestureType;
export type KeyboardGestureEvent = KeyboardGestureObservable.KeyboardGestureEvent;
export type KeyboardGestureEventSourceState = KeyboardGestureObservable.KeyboardGestureEventSourceState;
export type KeyboardGestureState = KeyboardGestureObservable.KeyboardGestureState;
export type KeyboardGestureEndState = KeyboardGestureObservable.KeyboardGestureEndState;
export type KeyboardGestureObservableConfig = KeyboardGestureObservable.KeyboardGestureObservableConfig;

/**
 * An event associated with a gesture.
 */
export type GestureEvent =
  | MouseGestureEvent
  | TouchGestureEvent
  | KeyboardGestureEvent
  | WheelGestureEvent
  | GestureEndEvent;

/**
 * A payload for debugging gestures.
 *
 * This is the payload passed to the `__debug` gesture handler.
 */
export type GestureEventSourceState =
  | MouseGestureEventSourceState
  | TouchGestureEventSourceState
  | KeyboardGestureEventSourceState
  | WheelGestureEventSourceState;

/**
 * An event type associated with a gesture.
 */
export type GestureType =
  | MouseGestureType
  | TouchGestureType
  | KeyboardGestureType
  | WheelGestureType;

/**
 * A snapshot of a previous or in-progress gesture.
 */
export type GestureState =
  | MouseGestureState
  | MouseGestureEndState
  | TouchGestureState
  | TouchGestureEndState
  | KeyboardGestureState
  | KeyboardGestureEndState
  | WheelGestureState
  | WheelGestureEndState;

interface GestureSourceConfig {
  /** Whether or not to observe keyboard gestures. Defaults to `true`. */
  keyboard: boolean;
  /** Whether or not to observe mouse gestures. Defaults to `true`. */
  mouse: boolean;
  /** Whether or not to observe touch gestures. Defaults to `true`. */
  touch: boolean;
  /** Whether or not to observe wheel gestures. Defaults to `true`. */
  wheel: boolean;
}

/**
 * Configuration for a GestureObservable.
 */
export type GestureObservableConfig = GestureSourceConfig &
  ObservableConfig.ObservableConfig;

const DEFAULT_SOURCE_CONFIG: GestureSourceConfig = {
  keyboard: true,
  mouse: true,
  touch: true,
  wheel: true,
};

export {Orientation};

export function parseConfig(
  config?: Partial<GestureObservableConfig> | null,
): GestureObservableConfig {
  const parsedConfig = Object.assign(
    ObservableConfig.parseConfig(config),
    DEFAULT_SOURCE_CONFIG,
  );
  if (config) {
    const {keyboard, mouse, touch, wheel} = config;
    if (keyboard || mouse || touch || wheel) {
      parsedConfig.keyboard = Boolean(keyboard);
      parsedConfig.mouse = Boolean(mouse);
      parsedConfig.touch = Boolean(touch);
      parsedConfig.wheel = Boolean(wheel);
    }
  }
  return parsedConfig;
}

/**
 * An Observable of gestures.
 */
export function create(
  /** The DOM element to observe for gestures. */
  element: Element,
  /** Configuration for the GestureObservable. */
  config?: Partial<GestureObservableConfig> | null,
): Observable<GestureState> {
  ensureDOMInstance(element, Element);
  config = parseConfig(config);

  const sources = [];
  if (config.mouse) {
    sources.push(MouseGestureObservable.createSource(element, config));
  }
  if (config.touch) {
    sources.push(TouchGestureObservable.createSource(element, config));
  }
  if (config.wheel) {
    sources.push(WheelGestureObservable.createSource(element, config));
  }
  if (config.keyboard) {
    sources.push(KeyboardGestureObservable.createSource(element, config));
  }

  const gestureState = merge(...sources);

  return asObservable(gestureState);
}

export default {create};

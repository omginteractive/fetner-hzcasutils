import {WheelGestureObservable} from '@hzdg/gesture-observable';
import useRefCallback from '@hzdg/use-ref-callback';
import {useObservableGestureEffect} from './utils';

export type WheelGestureObservableConfig = WheelGestureObservable.WheelGestureObservableConfig;
export type WheelGestureState = WheelGestureObservable.WheelGestureState;
export type WheelGestureEndState = WheelGestureObservable.WheelGestureEndState;
export type WheelGestureEventSourceState = WheelGestureObservable.WheelGestureEventSourceState;
export type WheelGestureConfig = Partial<
  WheelGestureObservable.WheelGestureObservableConfig
>;

/**
 * A callback for when wheel gesture state changes.
 * Receives either an ongoing gesture state, or the ending gesture state.
 */
export type WheelGestureChangeHandler = (
  state: WheelGestureState | WheelGestureEndState,
) => void;

export interface WheelGestureHandlers {
  /**
   * A callback for when a wheel gesture starts.
   * Receives the initializing gesture state.
   */
  onStart?: (state: WheelGestureState) => void;
  /**
   * A callback for when an ongoing wheel gesture updates.
   * Receives the latest gesture state.
   */
  onMove?: (state: WheelGestureState) => void;
  /**
   * A callback for when a wheel gesture has completed.
   * Receives the ending gesture state.
   */
  onEnd?: (state: WheelGestureEndState) => void;
}

export type WheelGestureHandler =
  | WheelGestureChangeHandler
  | WheelGestureHandlers;

/**
 * `useWheelGesture` is a React hook for components that want to handle
 * wheel gesture intent. It can be used with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-wheel-gesture
 */
function useWheelGesture<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element on which to detect
   * wheel gestures. Useful for ref forwarding or sharing.
   */
  providedRef: React.RefObject<T>,
  /**
   * A function to handle wheel gesture updates,
   * or a configuration of handlers, like
   * `{onStart?, onMove?, onEnd?}`.
   */
  handler: WheelGestureHandler,
  /**
   * An object describing how to configure wheel gesture detection.
   */
  config?: WheelGestureConfig,
): void;
/**
 * `useWheelGesture` is a React hook for components that want to handle
 * wheel gesture intent. It can be used with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-wheel-gesture
 */
function useWheelGesture<T extends HTMLElement>(
  /**
   * A function to handle wheel gesture updates,
   * or a configuration of handlers, like
   * `{onStart?, onMove?, onEnd?}`.
   */
  handler: WheelGestureHandler,
  /**
   * An object describing how to configure wheel gesture detection.
   */
  config?: WheelGestureConfig,
): (node: T | null) => void;
function useWheelGesture<T extends HTMLElement>(
  handlerOrProvidedRef: React.RefObject<T> | WheelGestureHandler,
  handlerOrConfig?: WheelGestureHandler | WheelGestureConfig,
  maybeConfig?: WheelGestureConfig,
): ((node: T | null) => void) | void {
  let handler: WheelGestureHandler;
  let config: WheelGestureConfig | undefined;
  let providedRef: React.RefObject<T> | null = null;

  if ('current' in handlerOrProvidedRef) {
    providedRef = handlerOrProvidedRef;
    handler = handlerOrConfig as WheelGestureHandler;
    config = maybeConfig;
  } else {
    handler = handlerOrProvidedRef as WheelGestureHandler;
    config = handlerOrConfig as WheelGestureConfig;
  }

  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);
  useObservableGestureEffect(WheelGestureObservable, ref, handler, config);
  if (!providedRef) return setRef;
}

export default useWheelGesture;

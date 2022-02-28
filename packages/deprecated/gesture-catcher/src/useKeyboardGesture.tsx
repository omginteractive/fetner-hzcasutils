import {KeyboardGestureObservable} from '@hzdg/gesture-observable';
import useRefCallback from '@hzdg/use-ref-callback';
import {useObservableGestureEffect} from './utils';

export type KeyboardGestureObservableConfig = KeyboardGestureObservable.KeyboardGestureObservableConfig;
export type KeyboardGestureState = KeyboardGestureObservable.KeyboardGestureState;
export type KeyboardGestureEndState = KeyboardGestureObservable.KeyboardGestureEndState;
export type KeyboardGestureEventSourceState = KeyboardGestureObservable.KeyboardGestureEventSourceState;
export type KeyboardGestureConfig = Partial<
  KeyboardGestureObservable.KeyboardGestureObservableConfig
>;

/**
 * A callback for when keyboard gesture state changes.
 * Receives either an ongoing gesture state, or the ending gesture state.
 */
export type KeyboardGestureChangeHandler = (
  state: KeyboardGestureState | KeyboardGestureEndState,
) => void;

export interface KeyboardGestureHandlers {
  /**
   * A callback for when a keyboard gesture starts.
   * Receives the initializing gesture state.
   */
  onStart?: (state: KeyboardGestureState) => void;
  /**
   * A callback for when an ongoing keyboard gesture updates.
   * Receives the latest gesture state.
   */
  onMove?: (state: KeyboardGestureState) => void;
  /**
   * A callback for when a keyboard gesture has completed.
   * Receives the ending gesture state.
   */
  onEnd?: (state: KeyboardGestureEndState) => void;
}

export type KeyboardGestureHandler =
  | KeyboardGestureChangeHandler
  | KeyboardGestureHandlers;

/**
 * `useKeyboardGesture` is a React hook for components that want to handle
 * keyboard gesture intent. It can be used with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-keyboard-gesture
 */
function useKeyboardGesture<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element on which to detect
   * keyboard gestures. Useful for ref forwarding or sharing.
   */
  providedRef: React.RefObject<T>,
  /**
   * A function to handle keyboard gesture updates,
   * or a configuration of handlers, like
   * `{onStart?, onMove?, onEnd?}`.
   */
  handler: KeyboardGestureHandler,
  /**
   * An object describing how to configure keyboard gesture detection.
   */
  config?: KeyboardGestureConfig,
): void;
/**
 * `useKeyboardGesture` is a React hook for components that want to handle
 * keyboard gesture intent. It can be used with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-keyboard-gesture
 */
function useKeyboardGesture<T extends HTMLElement>(
  /**
   * A function to handle keyboard gesture updates,
   * or a configuration of handlers, like
   * `{onStart?, onMove?, onEnd?}`.
   */
  handler: KeyboardGestureHandler,
  /**
   * An object describing how to configure keyboard gesture detection.
   */
  config?: KeyboardGestureConfig,
): (node: T | null) => void;
function useKeyboardGesture<T extends HTMLElement>(
  handlerOrProvidedRef: React.RefObject<T> | KeyboardGestureHandler,
  handlerOrConfig?: KeyboardGestureHandler | KeyboardGestureConfig,
  maybeConfig?: KeyboardGestureConfig,
): ((node: T | null) => void) | void {
  let handler: KeyboardGestureHandler;
  let config: KeyboardGestureConfig | undefined;
  let providedRef: React.RefObject<T> | null = null;

  if ('current' in handlerOrProvidedRef) {
    providedRef = handlerOrProvidedRef;
    handler = handlerOrConfig as KeyboardGestureHandler;
    config = maybeConfig;
  } else {
    handler = handlerOrProvidedRef as KeyboardGestureHandler;
    config = handlerOrConfig as KeyboardGestureConfig;
  }

  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);
  useObservableGestureEffect(KeyboardGestureObservable, ref, handler, config);
  if (!providedRef) return setRef;
}

export default useKeyboardGesture;

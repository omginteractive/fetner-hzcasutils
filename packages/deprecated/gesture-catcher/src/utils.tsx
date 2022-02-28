import {useRef, useCallback, useEffect, useState} from 'react';
import Observable from 'zen-observable';

interface GestureState {
  gesturing: boolean;
}

interface GestureChangeHandler<S extends GestureState> {
  (state: S): void;
}

interface GestureHandlers<S extends GestureState> {
  onStart?: (state: S) => void;
  onMove?: (state: S) => void;
  onEnd?: (state: S) => void;
}

interface DebugHandler {
  __debug: (event: Event) => void;
}

interface DebugObservable<T, E> extends Observable<T> {
  __debug(
    debugHandler: (e: E) => void,
    ...observerArgs: Parameters<Observable<T>['subscribe']>
  ): ZenObservable.Subscription;
}

interface ObservableFactory<T extends GestureState | null, E> {
  create(...args: unknown[]): Observable<T> | DebugObservable<T, E>;
}

function dispatchGestureDebug<E extends Event>(
  handler?: (event: E) => void,
  event?: E,
): void {
  if (event && typeof handler === 'function') handler(event);
}

function dispatchGestureStateChange<S extends GestureState>(
  handler: GestureChangeHandler<S> | GestureHandlers<S>,
  state: S,
  lastState: S | null,
): void {
  if (state) {
    if (typeof handler === 'function') {
      handler(state);
    } else {
      if (state.gesturing) {
        if (!lastState || !lastState.gesturing) {
          if (handler && typeof handler.onStart === 'function') {
            handler.onStart(state);
          }
        } else if (lastState && lastState.gesturing) {
          if (handler && typeof handler.onMove === 'function') {
            handler.onMove(state);
          }
        }
      } else if (!lastState || lastState.gesturing) {
        if (handler && typeof handler.onEnd === 'function') {
          handler.onEnd(state);
        }
      }
    }
  }
}

function isDebugHandler(handler: unknown): handler is DebugHandler {
  return (
    handler &&
    typeof handler !== 'function' &&
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    typeof (handler as any).__debug === 'function'
  );
}

/**
 * `useObservableGestureEffect` will manage a subscription to the given
 * gesture `Observable` on the `ref` DOM element with the given `config`,
 * calling the current `handler` whenever a gesture state change is observed.
 */
export function useObservableGestureEffect<
  E extends HTMLElement,
  S extends GestureState,
  H,
  C
>(
  /**
   * The gesture observable to use. Expected to have a `create`
   * static method that returns an `Observable` instance.
   */
  Observable: ObservableFactory<S, Event>,
  /**
   * A ref to the DOM element to observe.
   */
  ref: React.RefObject<E>,
  /**
   * A handler or handlers for gesture state changes.
   */
  handler: H,
  /**
   * The configuration for the gesture observable.
   */
  config?: C,
): void {
  const lastState = useRef<S | null>(null);
  const subscribed = useRef(false);
  const [subscriptions] = useState(
    () => new Map<Element, ZenObservable.Subscription>(),
  );

  const cleanupSubscriptions = useCallback(() => {
    subscriptions.forEach(subscription => {
      subscription.unsubscribe();
    });
    subscriptions.clear();
    subscribed.current = false;
  }, [subscriptions]);

  const debugHandler: DebugHandler['__debug'] | null = isDebugHandler(handler)
    ? handler.__debug
    : null;

  const handleGestureDebug = useCallback(
    function handleGestureDebug(event) {
      if (subscribed.current && debugHandler) {
        dispatchGestureDebug(debugHandler, event);
      }
    },
    [debugHandler],
  );

  const handleGestureStateChange = useCallback(
    /**
     * `handleGestureStateChange` will call the correct
     * change handler with a new `GestureState` whenever
     * a gesture change is observed.
     */
    function handleGestureState(state) {
      if (subscribed.current && handler) {
        dispatchGestureStateChange<S>(handler, state, lastState.current);
      }
      lastState.current = state;
    },
    [handler],
  );

  // Cleanup all subscriptions whenever
  // the handler or config changes, and on unmount.
  useEffect(() => cleanupSubscriptions, [
    cleanupSubscriptions,
    handleGestureStateChange,
    handleGestureDebug,
    config,
  ]);

  useEffect(
    /**
     * `subscribeIfNecessary` will run to determine if we need to
     * subscribe to events on an element. If we are already subscribed
     * to the element, it will do nothing.
     */
    function subscribeIfNecessary() {
      const element = ref.current;
      if (!element || !subscriptions.has(element)) {
        cleanupSubscriptions();
        if (element) {
          const subject = Observable.create(element, config);
          subscriptions.set(
            element,
            handleGestureDebug && '__debug' in subject
              ? subject.__debug(handleGestureDebug, handleGestureStateChange)
              : subject.subscribe(handleGestureStateChange),
          );
          subscribed.current = true;
        }
      }
    },
  );
}

import invariant from 'invariant';
import {useRef, useLayoutEffect, useCallback, useState, useEffect} from 'react';
import {getDocument, getNearestScrollNode} from '@hzdg/dom-utils';

export interface ScrollRect {
  top: number | null;
  left: number | null;
  width: number | null;
  height: number | null;
}

export type NodeLike = Node | {node: Node} | {element: Node};

export function getScrollRect(element: HTMLElement | Document): ScrollRect {
  let scrollingElement: Element;
  if ('scrollingElement' in element && element.scrollingElement) {
    scrollingElement = element.scrollingElement;
  } else if ('body' in element) {
    scrollingElement = element.body;
  } else {
    scrollingElement = element;
  }
  invariant(
    scrollingElement,
    `The provided element ${element} is not a scrolling element!`,
  );
  const {
    scrollTop: top,
    scrollLeft: left,
    scrollWidth: width,
    scrollHeight: height,
  } = scrollingElement;
  return {top, left, width, height};
}

export function getNode(node: NodeLike | null): Node | null {
  if (node) {
    node = 'node' in node ? node.node : node;
    node = 'element' in node ? node.element : node;
  }
  return node;
}

/**
 * `useForceUpdate` will return a function that, when called
 * will force the component to rerender.
 */
export function useForceUpdate(): () => void {
  const [, flipUpdateBit] = useState(false);
  const forceUpdate = useCallback(function forceUpdate() {
    flipUpdateBit((v) => !v);
  }, []);
  return forceUpdate;
}

/**
 * `useNearestScrollNodeRef` is a React hook for finding
 * the nearest scrollable ancestor of a DOM node.
 *
 * Returns a `RefObject` pointing the nearest scrollable node, or `null`.
 */
export function useNearestScrollNodeRef<T extends Node>(
  /**
   * A ref to a DOM Element.
   * Note that the node does not have to be scrollable itself,
   * as `useNearestScrollNodeRef` will traverse the DOM to find
   * a scrollable parent.
   */
  ref: React.RefObject<T>,
): React.RefObject<HTMLElement | Document | null> {
  const {current} = ref;
  const forceUpdate = useForceUpdate();
  const scrollRef = useRef<HTMLElement | Document | null>(null);
  useLayoutEffect(() => {
    const doc = getDocument(current);
    const scrollNode = getNearestScrollNode(current);
    scrollRef.current = doc?.documentElement === scrollNode ? doc : scrollNode;
    if (scrollRef.current !== current) forceUpdate();
  }, [current, forceUpdate]);
  return scrollRef;
}

export interface Unsubscribe {
  (): void;
}

export interface Subscribe {
  (handler: EventListener): Unsubscribe;
}

/**
 * `useSubscribableEvent` is a React hook for subscribing
 * and unsubscribing to DOM events using a 'subscribable' API
 * instead of the native `EventTarget` (`{add,remove}EventListener`) API.
 *
 * Returns a `Subscribe` function that is called with an `EventListener`
 * and returns an `Unsubscribe` callback.
 */
export function useSubscribableEvent<T extends EventTarget | null>(
  /**
   * A ref to a DOM `EventTarget`.
   * This is the target that can emit events of the type specified by `event`.
   *
   * If the ref value is `null` (i.e., not mounted),
   * then subscribers will not receive events.
   */
  ref: React.RefObject<T>,
  /**
   * The event type to make subscribable.
   */
  event: string,
  /**
   * Options for the event listener. These are the same options
   * that would be passed to a DOM `EventTarget` `addEventListener` method.
   */
  options: AddEventListenerOptions = {},
): Subscribe {
  // Note: we use state instead of a ref to track these values
  // because `useState` supports lazy instantiation (via a callback),
  // whereas`useRef` would have us creating and throwing away a `new Map()`
  // on every subsequent render.
  const [subscribers] = useState(() => new Map<EventListener, boolean>());
  const [listeners] = useState(
    () => new Map<NonNullable<T>, (force?: boolean) => void>(),
  );

  const forceUpdate = useForceUpdate();

  const listenerOptions = useRef(options);
  const {capture, once, passive} = options;
  useEffect(
    /**
     * `updateOptionsIfNecesssary` will update the listener options
     * if they change. This may result in a new event binding being
     * created on layout.
     */
    function updateOptionsIfNecesssary() {
      listenerOptions.current = {capture, once, passive};
      if (listeners.size > 0) {
        for (const removeListenerIfPossible of listeners.values()) {
          removeListenerIfPossible(true);
        }
      }
    },
    [capture, once, passive, listeners],
  );

  /**
   * `handleEvent` is called for every event emitted by the `EventTarget`.
   * It will pass the event to every subscriber.
   */
  const handleEvent = useCallback(
    function handleEvent(event: Event) {
      if (subscribers.size) {
        for (const subscriber of subscribers.keys()) {
          subscriber(event);
        }
      }
    },
    [subscribers],
  );

  useLayoutEffect(
    /**
     * `addListenerIfNecessary` will run on layout to determine if we need to
     * start listening to events from the `EventTarget`. If we are
     * already listening, or if there are no subscribers, it will do nothing.
     */
    function addListenerIfNecessary() {
      if (!ref.current) return;
      const eventTarget = ref.current as NonNullable<T>;
      const eventOptions = listenerOptions.current;
      if (!listeners.has(eventTarget) && subscribers.size > 0) {
        eventTarget.addEventListener(event, handleEvent, eventOptions);
        listeners.set(
          eventTarget,
          /**
           * `removeListenerIfPossible` will be run when a subscriber
           * unsubscribes, when the listener options change, and on unmount.
           * It will stop listening to the `EventTarget` if `force`
           * is truthy or if there are no subscribers.
           */
          function removeListenerIfPossible(force?: boolean) {
            if (force || subscribers.size <= 0) {
              eventTarget.removeEventListener(event, handleEvent, eventOptions);
              listeners.delete(eventTarget);
            }
          },
        );
      }
    },
  );

  useEffect(() => {
    /**
     * `cleanup` will run on unmount to remove event listeners.
     */
    function cleanup(): void {
      if (listeners.size > 0) {
        for (const removeListenerIfPossible of listeners.values()) {
          removeListenerIfPossible(true);
        }
      }
    }
    return cleanup;
  }, [listeners]);

  /**
   * `subscribe` will add the `EventListener` to the `subscribers` map,
   * if the `EventListener` isn't already subscribed.
   */
  const subscribe = useCallback(
    function subscribe(handler: EventListener) {
      if (!subscribers.has(handler)) {
        subscribers.set(handler, true);
      }
      /**
       * `unsubscribe` will remove the subscribed `EventListener` from
       * the `subscribers` map, if the `EventListener` is still subscribed.
       */
      function unsubscribe(): void {
        if (subscribers.has(handler)) {
          subscribers.delete(handler);
          forceUpdate();
        }
      }
      forceUpdate();
      return unsubscribe;
    },
    [subscribers, forceUpdate],
  );
  return subscribe;
}

const SCROLL = 'scroll';
const LISTENER_OPTIONS: AddEventListenerOptions = {passive: true};

/**
 * `useScrollEffect` will subscribe to scroll events on the given
 * `scrollRef`, passing them to the given `listener` callback.
 * A memoized version of the `listener` callback will be used
 * until one of the `inputs` has changed.
 */
export function useScrollEffect<T extends EventTarget | null>(
  scrollRef: React.RefObject<T>,
  listener: EventListener,
  deps: unknown[],
): void {
  const handler = useCallback(listener, deps);
  const subscribe = useSubscribableEvent(scrollRef, SCROLL, LISTENER_OPTIONS);
  useEffect(() => subscribe(handler), [subscribe, handler]);
}

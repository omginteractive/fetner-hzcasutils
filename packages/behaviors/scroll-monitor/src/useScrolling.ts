import {useState, useEffect, useRef, useCallback} from 'react';
import useRefCallback from '@hzdg/use-ref-callback';
import {useNearestScrollNodeRef, useScrollEffect} from './utils';

const SCROLL_TIMEOUT = 60;

/**
 * `useScrolling` is a React hook for components that care about
 * whether or not the nearest scrollable container is scrolling.
 *
 * If a `providedRef` is passed to `useScrolling`,
 * returns a boolean value, that indicates whether or not
 * the nearest scrollable container is scrolling.
 *
 * If no `providedRef` is passed, returns an array containing a boolean
 * and a callback `ref`. The `ref` should be passed to an underlying DOM node.
 * Note that the node does not have to be scrollable itself,
 * as `useScrolling` will traverse the DOM to find a scrollable parent
 * to observe.
 *
 * The returned boolean is `true` when the nearest
 * scrollable container is scrolling, and `false` when it is not.
 */
function useScrolling<T extends HTMLElement>(): [
  boolean,
  (node: T | null) => void,
];
function useScrolling<T extends HTMLElement>(
  /**
   * A ref to use.
   * If provided, `useScrolling` will not return a ref.
   * Useful when the component needs to handle ref forwarding.
   */
  providedRef: React.RefObject<T>,
): boolean;
function useScrolling<T extends HTMLElement>(
  providedRef?: React.RefObject<T>,
): boolean | [boolean, (node: T | null) => void] {
  // Keep track of whether or not the nearest scrollable container is scrolling.
  const [scrolling, setScrolling] = useState(false);

  // Keep a ref to the nearest scrollable container.
  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);
  const scrollRef = useNearestScrollNodeRef(ref);

  // Keep a ref to a timeout id.
  const scrollTimeout = useRef<NodeJS.Timeout | null>(null);

  /**
   * `clearScrollTimeout` will... uh... clear the scroll timeout.
   */
  const clearScrollTimeout = useCallback(function clearScrollTimeout() {
    if (scrollTimeout.current !== null) {
      clearTimeout(scrollTimeout.current);
      scrollTimeout.current = null;
    }
  }, []);

  /**
   * `stopScrolling` will clear the scroll timeout and
   * flip `scrolling` to `false`. This will be called when
   * the scroll timeout expires.
   */
  const stopScrolling = useCallback(
    function stopScrolling() {
      clearScrollTimeout();
      setScrolling(false);
    },
    [clearScrollTimeout],
  );

  /**
   * `startScrolling` will clear the scroll timeout,
   * flip `scrolling` to `true`, and start a new scroll timeout.
   */
  const startScrolling = useCallback(
    function startScrolling() {
      clearScrollTimeout();
      setScrolling(true);
      scrollTimeout.current = setTimeout(stopScrolling, SCROLL_TIMEOUT);
    },
    [clearScrollTimeout, stopScrolling],
  );

  useEffect(() => {
    /**
     * `cleanup` will clear the scroll timeout when we unmount.
     */
    return function cleanup() {
      clearScrollTimeout();
    };
  }, [clearScrollTimeout]);

  // Subscribe to scroll events on the nearest scrolling element,
  // calling the `startScrolling` callback whenever a scroll event occurs.
  useScrollEffect(scrollRef, startScrolling, [startScrolling]);

  // If a ref has been provided, just return the `scrolling` value.
  // If a ref has not not been provided, return a callback ref
  // along with the `scrolling` value.
  return providedRef ? scrolling : [scrolling, setRef];
}

export default useScrolling;

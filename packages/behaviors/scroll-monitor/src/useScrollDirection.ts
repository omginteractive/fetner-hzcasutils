import {useState, useRef} from 'react';
import useRefCallback from '@hzdg/use-ref-callback';
import {ScrollPosition, getScrollPosition} from './useScrollPosition';
import {useNearestScrollNodeRef, useScrollEffect} from './utils';

const INITIAL_SCROLL_DIRECTION: ScrollDirectionState = {
  vertical: null,
  horizontal: null,
};

/**
 * `ScrollDirection` is an enum of possible scroll direction states.
 */
export enum ScrollDirection {
  /** Indicates that scrolling is moving in a downward direction. */
  DOWN = 'down',
  /** Indicates that scrolling is moving in a upward direction. */
  UP = 'up',
  /** Indicates that scrolling is moving in a leftward direction. */
  LEFT = 'left',
  /** Indicates that scrolling is moving in a righward direction. */
  RIGHT = 'right',
}
export const DOWN = ScrollDirection.DOWN;
export const UP = ScrollDirection.UP;
export const LEFT = ScrollDirection.LEFT;
export const RIGHT = ScrollDirection.RIGHT;

export type VerticalScrollDirection = ScrollDirection.DOWN | ScrollDirection.UP;
export type HorizontalScrollDirection =
  | ScrollDirection.LEFT
  | ScrollDirection.RIGHT;

/**
 * `ScrollDirectionState` is an object of `vertical` and `horizontal` values,
 * where `vertical` is either `'up'` or `'down'`, and `horizontal` is either
 * `'left'` or `'right'`.
 */
export interface ScrollDirectionState {
  /**
   * The direction the nearest scrollable container
   * most recently scrolled vertically,
   * where 'direction' is either `'up'` or `'down'`.
   */
  vertical: VerticalScrollDirection | null;
  /**
   * The direction the nearest scrollable container
   * most recently scrolled horizontally,
   * where 'direction' is either `'left'` or `'right'`.
   */
  horizontal: HorizontalScrollDirection | null;
}

/**
 * `getScrollDirection` compares two `ScrollPosition` objects
 * and returns a `ScrollDirectionState` object.
 *
 * `ScrollDirectionState.vertical` will be one of `ScrollDirection.UP`
 * or `ScrollDirection.DOWN`, while `ScrollDirectionState.horizontal`
 * will be one of `ScrollDirection.LEFT` or `ScrollDirection.RIGHT`.
 */
export function getScrollDirection(
  position: ScrollPosition,
  lastPosition: ScrollPosition | null,
): ScrollDirectionState {
  let vertical: ScrollDirection.DOWN | ScrollDirection.UP | null = null;
  let horizontal: ScrollDirection.LEFT | ScrollDirection.RIGHT | null = null;

  if (typeof position.top === 'number') {
    vertical = position.top > 0 ? DOWN : null;
    if (lastPosition && typeof lastPosition.top === 'number') {
      if (lastPosition.top === position.top) vertical = null;
      else if (lastPosition.top > position.top) vertical = UP;
    }
  }

  if (typeof position.left === 'number') {
    horizontal = position.left > 0 ? RIGHT : null;
    if (lastPosition && typeof lastPosition.left === 'number') {
      if (lastPosition.left === position.left) horizontal = null;
      else if (lastPosition.left > position.left) horizontal = LEFT;
    }
  }

  return {vertical, horizontal};
}

/**
 * `useScrollDirection` is a React hook for components that care about
 * the nearest scrollable container's scroll direction.
 *
 * If a `providedRef` is passed to `useScrollDirection`,
 * returns a `ScrollDirection` value.
 *
 * If no `providedRef` is passed, returns an array containing a
 * `ScrollDirection` object and a callback `ref`. The `ref` should be passed
 * to an underlying DOM node. Note that the node does not have to be scrollable itself,
 * as `useScrollDirection` will traverse the DOM to find a scrollable parent
 * to observe.
 *
 * `ScrollDirectionState.vertical` will be one of `ScrollDirection.UP`
 *  or `ScrollDirection.DOWN`, while `ScrollDirectionState.horizontal`
 * will be one of `ScrollDirection.LEFT` or `ScrollDirection.RIGHT`.
 */
function useScrollDirection<T extends HTMLElement>(): [
  ScrollDirectionState,
  (node: T | null) => void
];
function useScrollDirection<T extends HTMLElement>(
  /**
   * A ref to use.
   * If provided, `useScrollDirection` will not return a ref.
   * Useful when the component needs to handle ref forwarding.
   */
  providedRef: React.RefObject<T>,
): ScrollDirectionState;
function useScrollDirection<T extends HTMLElement>(
  providedRef?: React.RefObject<T>,
): ScrollDirectionState | [ScrollDirectionState, (node: T | null) => void] {
  const scrollPosition = useRef<ScrollPosition | null>(null);
  const [direction, setDirection] = useState(INITIAL_SCROLL_DIRECTION);

  // Keep a ref to the nearest scrollable container.
  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);
  const scrollRef = useNearestScrollNodeRef(ref);

  // Subscribe to scroll events on the nearest scrolling element,
  // calling the handler whenever a scroll event occurs.
  useScrollEffect(
    scrollRef,
    function handleScrollChange(event: Event) {
      const nextPosition = getScrollPosition(event);
      const next = getScrollDirection(nextPosition, scrollPosition.current);
      scrollPosition.current = nextPosition;
      setDirection(prev => {
        let state = prev;
        if (next.horizontal !== null && next.horizontal !== state.horizontal) {
          state = {...state, horizontal: next.horizontal};
        }
        if (next.vertical !== null && next.vertical !== state.vertical) {
          state = {...state, vertical: next.vertical};
        }
        return state;
      });
    },
    [],
  );

  // If a ref has been provided, just return the `direction` value.
  // If a ref has not not been provided, return a callback ref
  // along with the `direction` value.
  return providedRef ? direction : [direction, setRef];
}

export default useScrollDirection;

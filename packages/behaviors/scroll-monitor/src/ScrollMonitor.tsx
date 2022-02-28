import {useState, useMemo} from 'react';
import PropTypes from 'prop-types';
import useRefCallback from '@hzdg/use-ref-callback';
import useScrolling from './useScrolling';
import useScrollPosition, {ScrollPosition} from './useScrollPosition';
import useScrollDirection, {ScrollDirectionState} from './useScrollDirection';
import useScrollIntersection, {
  ScrollIntersectionConfig,
  Intersects,
} from './useScrollIntersection';

/**
 * Scroll state passed to the ScrollMonitor render prop (children function).
 */
export interface ScrollMonitorRenderProps<T extends HTMLElement> {
  /**
   * A callback ref that should be passed to an underlying DOM node.
   * Note that the node does not have to be scrollable itself,
   * as `ScrollMonitor` will traverse the DOM to find a scrollable parent
   * to observe.
   */
  scrollRef: (node: T | null) => void;
  /**
   * Whether or not the nearest scrollable container is currently scrolling.
   *
   * Only set if the `ScrollMonitor` `scrolling` prop is `true`.
   */
  scrolling?: boolean;
  /**
   * The current position of the nearest scrollable container.
   *
   * Only set if the `ScrollMonitor` `position` prop is `true`.
   */
  position?: ScrollPosition;
  /**
   * The latest vertical and horizontal direction of scroll
   * in the nearest scrollable container.
   *
   * Only set if the `ScrollMonitor` `direction` prop is `true`.
   */
  direction?: ScrollDirectionState;
  /**
   * Whether or not the latest position of the nearest scrollable container
   * intersects with one or more defined areas.
   *
   * Only set if the `ScrollMonitor` `inersects` prop is given a defined
   * area, or array of areas, of the form
   * `{top?: number, right?: number, bottom?: number, left?: number}`.
   */
  intersects?: Intersects;
}

export interface ScrollMonitorProps<T extends HTMLElement> {
  /**
   * A function that takes scroll monitor state and returns a React element.
   * Also known as a 'render prop'.
   */
  children: (state: ScrollMonitorRenderProps<T>) => JSX.Element;
  /**
   * An optional ref object or callback ref.
   * Useful when the owner component needs to handle ref forwarding.
   */
  innerRef?: React.Ref<T>;
  /**
   * Whether or not to monitor scroll direction.
   *
   * If `true`, then scroll state will have a `direction` value
   * like `{vertical: 'down', horizontal: 'right'}`.
   */
  direction?: boolean | null;
  /**
   * Whether or not to monitor scroll position.
   *
   * If `true`, then scroll state will have a `position` value
   * like `{top: 10, left: 10}`.
   */
  position?: boolean | null;
  /**
   * Whether or not to monitor scrolling state.
   *
   * if `true`, then scroll state will have a boolean `scrolling` value
   * where `true` means scrolling is happening.
   */
  scrolling?: boolean | null;
  /**
   * One area, or array of areas, of the form
   * `{top?: number, right?: number, bottom?: number, left?: number}`
   * within a scrollable area to monitor for intersection with scroll position.
   *
   * If defined, then scroll state will have an `intersects` value
   * like `true` or `[true, false]`, depending on if the config defines
   * a single area an array of areas. The value indicates whether or not
   * scroll position currently intersects with the defined area.
   */
  intersects?: ScrollIntersectionConfig | null;
  /**
   * A callback for when scrolling starts.
   */
  onStart?: (() => void) | null;
  /**
   * A callback for when scroll position changes.
   * Receives the latest scroll state, in the same form as the render prop.
   */
  onChange?: ((state: ScrollMonitorRenderProps<T>) => void) | null;
  /**
   * A callback for when scrolling stops.
   */
  onEnd?: (() => void) | null;
}

/**
 * A React component for monitoring and interacting with scroll position.
 *
 * `ScrollMonitor` is a headless component, meaning
 * it accepts a child render prop, and returns the result
 * of calling that render prop with the latest state of
 * the nearest scrollable container.
 */
function ScrollMonitor<T extends HTMLElement>(
  props: ScrollMonitorProps<T>,
): JSX.Element {
  const {innerRef} = props;
  const [scrollRef, setScrollRef] = useRefCallback(null, innerRef);
  const scrolling = useScrolling(scrollRef);
  const direction = useScrollDirection(scrollRef);
  const intersects = useScrollIntersection(scrollRef, props.intersects || []);

  const [position, setPosition] = useState<ScrollPosition>({
    top: null,
    left: null,
  });
  useScrollPosition(scrollRef, setPosition);

  const scrollingEnabled =
    props.scrolling || Boolean(props.onStart || props.onChange || props.onEnd);
  const positionEnabled = props.position || Boolean(props.onChange);
  const directionEnabled = Boolean(props.direction);
  const intersectionEnabled = Boolean(props.intersects);

  // Create the new state.
  const state = useMemo(() => {
    const state: ScrollMonitorRenderProps<T> = {scrollRef: setScrollRef};
    if (scrollingEnabled) state.scrolling = scrolling;
    if (positionEnabled) state.position = position;
    if (directionEnabled) state.direction = direction;
    if (intersectionEnabled) state.intersects = intersects;
    return state;
  }, [
    setScrollRef,
    scrolling,
    position,
    direction,
    intersects,
    scrollingEnabled,
    positionEnabled,
    directionEnabled,
    intersectionEnabled,
  ]);

  // Call the `onStart` hook if the scroll container is scrolling.
  const {onStart} = props;
  useMemo(() => {
    if (typeof onStart === 'function' && scrolling) {
      onStart();
    }
  }, [onStart, scrolling]);

  // Call the `onChange` hook if the scroll container is scrolling.
  const {onChange} = props;
  useMemo(() => {
    if (typeof onChange === 'function' && scrolling) {
      onChange(state);
    }
  }, [onChange, scrolling, state]);

  // Call the `onEnd` hook if the scroll container is not scrolling.
  const {onEnd} = props;
  // Keep track whether or not the scroll container
  // was scrolling during the previous `onEnd` effect.
  const [wasScrolling, setWasScrolling] = useState(false);
  useMemo(() => {
    // Call the `onEnd` hook if scrolling just stopped.
    if (typeof onEnd === 'function' && wasScrolling && !scrolling) {
      onEnd();
    }
    // Set whether or not the scroll container was scrolling during this effect.
    setWasScrolling(scrolling);
  }, [onEnd, wasScrolling, scrolling]);

  // Call the render prop with the current state.
  const {children: render} = props;
  return render(state);
}

ScrollMonitor.propTypes = {
  children: PropTypes.func.isRequired,
  innerRef: PropTypes.oneOfType([
    PropTypes.func,
    PropTypes.shape({
      current: PropTypes.node,
    }),
  ]),
  vertical: PropTypes.bool,
  horizontal: PropTypes.bool,
  direction: PropTypes.bool,
  position: PropTypes.bool,
  scrolling: PropTypes.bool,
  intersects: PropTypes.oneOfType([
    PropTypes.shape({
      top: PropTypes.number,
      right: PropTypes.number,
      bottom: PropTypes.number,
      left: PropTypes.number,
    }),
    PropTypes.arrayOf(
      PropTypes.shape({
        top: PropTypes.number,
        right: PropTypes.number,
        bottom: PropTypes.number,
        left: PropTypes.number,
      }),
    ),
  ]),
  onStart: PropTypes.func,
  onChange: PropTypes.func,
  onEnd: PropTypes.func,
};

export default ScrollMonitor;

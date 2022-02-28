import {useEffect, useState, useRef, useCallback} from 'react';
import {useWindowSize, WindowSize} from '@hzdg/windowsize-monitor';
import ResizeObservable, {ResizeObservableSize} from '@hzdg/resize-observable';
import useRefCallback from '@hzdg/use-ref-callback';
import memoizeOne from 'memoize-one';

// We really would just like to use DOMRect as our type here, but due to
// the new nature of the API and the polyfill behavior, The DOMRect interface
// isn't always fully implemented. in particular, the `toJSON()` method is
// often missing. Since we aren't using it directly anyway, we just omit it
// from our expected type.
type ElementSize = Readonly<
  Pick<ResizeObservableSize, Exclude<keyof ResizeObservableSize, 'toJSON'>>
>;

/**
 * A DOMRect-like object, but with additional useful measurements.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/DOMRect
 * @see https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserverEntry
 */
export interface Size {
  /** The x coordinate of the DOMRect's origin. */
  readonly x: number;
  /** The y coordinate of the DOMRect's origin. */
  readonly y: number;
  /** The width of the DOMRect. */
  readonly width: number;
  /** The height of the DOMRect. */
  readonly height: number;
  /**
   * The top coordinate value of the DOMRect
   * (has the same value as y, or y + height if height is negative.)
   */
  readonly top: number;
  /**
   * The right coordinate value of the DOMRect
   * (has the same value as x + width, or x if width is negative.)
   */
  readonly right: number;
  /**
   * The bottom coordinate value of the DOMRect
   * (has the same value as y + height, or y if height is negative.)
   */
  readonly bottom: number;
  /**
   * The left coordinate value of the DOMRect
   * (has the same value as x, or x + width if width is negative.)
   */
  readonly left: number;
  /**
   * The DOMRect width as a percentage of the viewport width
   * (where 0 is 0% and 1 is 100%.)
   */
  readonly vw: number;
  /**
   * The DOMRect height as a percentage of the viewport height
   * (where 0 is 0% and 1 is 100%.)
   */
  readonly vh: number;
  /**
   * An object containing the new border box size of the observed element.
   * The border box size accounts for border and padding on the element.
   */
  readonly borderBoxSize: {
    /**
     * The length of the observed element's border box
     * in the block dimension. For boxes with a horizontal writing-mode,
     * this is the vertical dimension, or height; if the writing-mode
     * is vertical, this is the horizontal dimension, or width.
     */
    readonly blockSize: number;
    /**
     * The length of the observed element's border box
     * in the inline dimension. For boxes with a horizontal writing-mode,
     * this is the horizontal dimension, or width; if the writing-mode
     * is vertical, this is the vertical dimension, or height.
     */
    readonly inlineSize: number;
  };
  /**
   * An object containing the new content box size of the observed element.
   * The content box size does not account for border or padding on the element.
   */
  readonly contentBoxSize: {
    /**
     * The length of the observed element's content box
     * in the block dimension. For boxes with a horizontal writing-mode,
     * this is the vertical dimension, or height; if the writing-mode
     * is vertical, this is the horizontal dimension, or width.
     */
    readonly blockSize: number;
    /**
     * The length of the observed element's content box
     * in the inline dimension. For boxes with a horizontal writing-mode,
     * this is the horizontal dimension, or width; if the writing-mode
     * is vertical, this is the vertical dimension, or height.
     */
    readonly inlineSize: number;
  };
}

const INITIAL_ELEMENT_SIZE: ElementSize = {
  x: 0,
  y: 0,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
  width: 0,
  height: 0,
  borderBoxSize: {
    blockSize: 0,
    inlineSize: 0,
  },
  contentBoxSize: {
    blockSize: 0,
    inlineSize: 0,
  },
};

const INITIAL_VIEW_SIZE: WindowSize = {
  width: 0,
  height: 0,
};

function shallowEqual(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): boolean {
  if (a === b) return true;
  for (const k in a) {
    if (a[k] !== b[k]) {
      return false;
    }
  }
  return true;
}

/**
 * `getSize` calculates a new `Size` from a `DOMRect` and viewport size.
 */
const getSize = memoizeOne(
  function getSize(elementSize: ElementSize, viewSize: WindowSize): Size {
    return Object.freeze({
      x: elementSize.x,
      y: elementSize.y,
      top: elementSize.top,
      right: elementSize.right,
      bottom: elementSize.bottom,
      left: elementSize.left,
      width: elementSize.width,
      height: elementSize.height,
      vw: Math.round((elementSize.width / viewSize.width) * 100) / 100 || 0,
      vh: Math.round((elementSize.height / viewSize.height) * 100) / 100 || 0,
      borderBoxSize: elementSize.borderBoxSize,
      contentBoxSize: elementSize.contentBoxSize,
    });
  },
  function areInputsEqual(
    [newElementSize, newViewSize],
    [lastElementSize, lastViewSize],
  ) {
    return (
      shallowEqual(newElementSize, lastElementSize) &&
      shallowEqual(
        newElementSize.borderBoxSize,
        lastElementSize.borderBoxSize,
      ) &&
      shallowEqual(
        newElementSize.contentBoxSize,
        lastElementSize.contentBoxSize,
      ) &&
      shallowEqual(newViewSize, lastViewSize)
    );
  },
);

/**
 * `useForceUpdate` will return a function that, when called
 * will force the component to rerender.
 */
function useForceUpdate(): () => void {
  const [, flipUpdateBit] = useState(false);
  const forceUpdate = useCallback(function forceUpdate() {
    flipUpdateBit(v => !v);
  }, []);
  return forceUpdate;
}

function useSubscription(
  ref: React.RefObject<HTMLElement | null>,
  handler: (size: ResizeObservableSize) => void,
): boolean {
  const subscribed = useRef<HTMLElement | null>(null);
  const subscription = useRef<ZenObservable.Subscription | null>(null);
  const subscriber = useRef<typeof handler | null>(null);

  const subscribeIfNecessary = useCallback(() => {
    if (ref.current && handler) {
      subscribed.current = ref.current;
      subscriber.current = handler;
      subscription.current = ResizeObservable.create(ref.current).subscribe(
        handler,
      );
    }
  }, [ref, handler]);

  const cleanup = useCallback(() => {
    if (subscription.current) subscription.current.unsubscribe();
    subscribed.current = null;
    subscription.current = null;
    subscriber.current = null;
  }, []);

  // Resubscribe when ref or handler changes.
  if (subscribed.current !== ref.current || subscriber.current !== handler) {
    cleanup();
    subscribeIfNecessary();
  }

  // Cleanup subscription on unmount.
  useEffect(() => cleanup, [cleanup]);

  return Boolean(subscribed.current);
}

/**
 * `useSize` is a React hook for components that care about their size.
 * It can be used statefully or not, and with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-size
 */
function useSize<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element to measure.
   * Useful for ref forwarding or sharing.
   */
  providedRef: React.RefObject<T>,
  /**
   * `handler` will receive a `Size` object each time
   * the observed element's size changes.
   */
  handler: (size: Size) => void,
): void;
function useSize<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element to measure.
   * Useful for ref forwarding or sharing.
   */
  providedRef: React.RefObject<T>,
): Size;
function useSize<T extends HTMLElement>(
  /**
   * `handler` will receive a `Size` object each time
   * the observed element's size changes.
   */
  handler: (size: Size) => void,
): (node: T | null) => void;
function useSize<T extends HTMLElement>(): [Size, (node: T | null) => void];
function useSize<T extends HTMLElement>(
  handlerOrProvidedRef?: React.RefObject<T> | ((size: Size) => void),
  handler?: (size: Size) => void,
): Size | ((node: T | null) => void) | [Size, (node: T | null) => void] | void {
  const changeHandler = useRef<((size: Size) => void) | null>(null);
  let providedRef: React.RefObject<T> | null = null;

  if (typeof handlerOrProvidedRef === 'function') {
    changeHandler.current = handlerOrProvidedRef;
  } else if (typeof handlerOrProvidedRef === 'object') {
    providedRef = handlerOrProvidedRef;
    if (typeof handler === 'function') {
      changeHandler.current = handler;
    }
  }

  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);

  const viewSize = useRef(INITIAL_VIEW_SIZE);
  const elementSize = useRef(INITIAL_ELEMENT_SIZE);
  // Note: we use `setState` here to take advantage of the
  // init function so that we only calculate the initial size once.
  const [initialSize] = useState(() =>
    getSize(elementSize.current, viewSize.current),
  );
  const size = useRef(initialSize);

  const subscribed = useRef<boolean>(false);

  const forceUpdate = useForceUpdate();

  const handleSizeChange = useCallback(
    /**
     * `handleSizeChange` will update the current change handler
     * with a new `Size` whenever the observed element's size or
     * the viewport size changes.
     */
    function handleSizeChange() {
      if (!subscribed.current) return;
      const nextSize = getSize(elementSize.current, viewSize.current);
      if (size.current !== nextSize) {
        size.current = nextSize;
        const cb = changeHandler.current;
        if (typeof cb === 'function') {
          // If we have a callback, then we're in 'stateless' mode,
          // so just call it with the new size.
          cb(size.current);
        } else {
          // Otherwise, we're in 'stateful' mode, so we should rerender,
          // as the size has changed.
          forceUpdate();
        }
      }
    },
    [forceUpdate],
  );

  const handleWindowSizeChange = useCallback(
    /**
     * `handleWindowSizeChange` will update the current view size
     * with a new `WindowSize` whenever it changes, and also
     * call `handleSizeChange` to update the container size.
     */
    function handleWindowSizeChange(windowSize) {
      viewSize.current = windowSize;
      handleSizeChange();
    },
    [handleSizeChange],
  );

  useWindowSize(handleWindowSizeChange);

  const handleElementSizeChange = useCallback(
    /**
     * `handleElementSizeChange` will update the current element size
     * with a new `Size` whenever it changes, and also
     * call `handleSizeChange` to update the container size.
     */
    function handleElementSizeChange(newSize: ResizeObservableSize) {
      elementSize.current = newSize;
      handleSizeChange();
    },
    [handleSizeChange],
  );

  subscribed.current = useSubscription(ref, handleElementSizeChange);

  if (!providedRef) {
    if (changeHandler.current) {
      return setRef;
    } else {
      return [size.current, setRef];
    }
  } else if (!changeHandler.current) {
    return size.current;
  }
}

export default useSize;

import {useState, useMemo, useEffect, useRef, useCallback} from 'react';
import useRefCallback from '@hzdg/use-ref-callback';
import 'intersection-observer'; // polyfill

function useIntersectionThreshold(
  threshold: number | number[] | undefined,
): number | number[] | undefined {
  return useMemo(
    () => threshold,
    // Note: We spread `threshold` value(s) as dependencies because
    // `threshold` might be an array that is not referentially stable
    // across renders, but we don't care if it isn't;
    // we only care if its deconstructed values are.
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
    Array.isArray(threshold) ? threshold : [threshold],
  );
}

function useIntersectionObserverInit(
  config: IntersectionObserverInit = {},
): IntersectionObserverInit | undefined {
  const {root = undefined, rootMargin = undefined} = config;
  const threshold = useIntersectionThreshold(config.threshold);
  return useMemo(() => {
    let init: IntersectionObserverInit;
    if (root || rootMargin || threshold) {
      init = {};
      if (root) init.root = root;
      if (rootMargin) init.rootMargin = rootMargin;
      if (threshold) init.threshold = threshold;
      return init;
    }
  }, [root, rootMargin, threshold]);
}

export interface IntersectionHandler {
  /**
   * `IntersectionHandler` will receive an `IntersectionObserverEntry` object
   * each time the observed element's intersection with the ancestor element
   * or viewport changes.
   *
   * @see https://hz-core.netlify.app/use-intersection#state
   */
  (entry: IntersectionObserverEntry): void;
}

/**
 * `useIntersection` is a React hook for components that care about
 * their interesction with an ancestor element or with the viewport.
 * It can be used statefully or not, and with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-intersection
 */
function useIntersection<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element to measure.
   * Useful for ref forwarding or sharing.
   *
   * @see https://hz-core.netlify.app/use-intersection#shared-ref--ref-forwarding
   */
  providedRef: React.RefObject<T>,
  /**
   * `handler` will receive an `IntersectionObserverEntry` object each time
   * the observed element's intersection with the ancestor element
   * or viewport changes.
   *
   * @see https://hz-core.netlify.app/use-intersection#state
   */
  handler: IntersectionHandler,
  /**
   * Optional configuration for the intersection observer.
   *
   * @see https://hz-core.netlify.app/use-intersection#config
   */
  config?: IntersectionObserverInit,
): void;
/**
 * `useIntersection` is a React hook for components that care about
 * their interesction with an ancestor element or with the viewport.
 * It can be used statefully or not, and with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-intersection
 */
function useIntersection<T extends HTMLElement>(
  /**
   * An existing ref being passed to the DOM element to measure.
   * Useful for ref forwarding or sharing.
   *
   * @see https://hz-core.netlify.app/use-intersection#shared-ref--ref-forwarding
   */
  providedRef: React.RefObject<T>,
  /**
   * Optional configuration for the intersection observer.
   *
   * @see https://hz-core.netlify.app/use-intersection#config
   */
  config?: IntersectionObserverInit,
): boolean;
/**
 * `useIntersection` is a React hook for components that care about
 * their interesction with an ancestor element or with the viewport.
 * It can be used statefully or not, and with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-intersection
 */
function useIntersection<T extends HTMLElement>(
  /**
   * `handler` will receive an `IntersectionObserverEntry` object each time
   * the observed element's intersection with the ancestor element
   * or viewport changes.
   *
   * @see https://hz-core.netlify.app/use-intersection#state
   */
  handler: IntersectionHandler,
  /**
   * Optional configuration for the intersection observer.
   *
   * @see https://hz-core.netlify.app/use-intersection#config
   */
  config?: IntersectionObserverInit,
): (node: T | null) => void;
/**
 * `useIntersection` is a React hook for components that care about
 * their interesction with an ancestor element or with the viewport.
 * It can be used statefully or not, and with an existing ref or not.
 *
 * @see https://hz-core.netlify.app/use-intersection
 */
function useIntersection<T extends HTMLElement>(
  /**
   * Optional configuration for the intersection observer.
   *
   * @see https://hz-core.netlify.app/use-intersection#config
   */
  config?: IntersectionObserverInit,
): [boolean, (node: T | null) => void];
function useIntersection<T extends HTMLElement>(
  providedRefOrHandlerOrConfig?:
    | React.RefObject<T>
    | IntersectionHandler
    | IntersectionObserverInit,
  handlerOrConfig?: IntersectionHandler | IntersectionObserverInit,
  maybeConfig?: IntersectionObserverInit,
):
  | [boolean, (node: T | null) => void]
  | ((node: T | null) => void)
  | boolean
  | void {
  const changeHandler = useRef<IntersectionHandler | null>(null);
  let providedRef: React.RefObject<T> | null = null;
  let config: IntersectionObserverInit | undefined = undefined;

  if (providedRefOrHandlerOrConfig) {
    if (typeof providedRefOrHandlerOrConfig === 'function') {
      changeHandler.current = providedRefOrHandlerOrConfig;
      if (handlerOrConfig) {
        if ('current' in handlerOrConfig) {
          providedRef = handlerOrConfig;
          config = maybeConfig;
        } else if (typeof handlerOrConfig === 'object') {
          config = handlerOrConfig;
        }
      }
    } else if ('current' in providedRefOrHandlerOrConfig) {
      providedRef = providedRefOrHandlerOrConfig;
      if (typeof handlerOrConfig === 'function') {
        changeHandler.current = handlerOrConfig;
        config = maybeConfig;
      } else if (typeof handlerOrConfig === 'object') {
        config = handlerOrConfig;
      }
    } else if (typeof providedRefOrHandlerOrConfig === 'object') {
      config = providedRefOrHandlerOrConfig;
    }
  }

  const [ref, setRef] = useRefCallback<T>(null);
  if (providedRef) setRef(providedRef.current);

  const subscribed = useRef<T | null>(null);

  const [intersects, setIntersects] = useState(false);

  const handleIntersectionChange = useCallback(
    /**
     * `handleIntersectionChange` will update the current change handler
     * with a new `IntersectionObserverEntry` whenever the observed element's
     * intersection with the ancestor element or viewport changes.
     */
    function handleIntersectionChange(entry: IntersectionObserverEntry) {
      if (!subscribed.current) return;
      const cb = changeHandler.current;
      if (typeof cb === 'function') {
        cb(entry);
      } else {
        setIntersects(entry.isIntersecting);
      }
    },
    [],
  );

  const intersectionObserverInit = useIntersectionObserverInit(config);

  const isSubscribed = ref.current === subscribed.current;

  useEffect(
    /**
     * `subscribeIfNecessary` will run to determine if we need to
     * subscribe to intersection events on an element. If we are already
     * subscribed to the element, it will do nothing.
     */
    function subscribeIfNecessary() {
      const currentElement = ref.current;
      if (currentElement) {
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) {
            if (entry.target === currentElement) {
              return handleIntersectionChange(entry);
            }
          }
        }, intersectionObserverInit);
        observer.observe(currentElement);
        subscribed.current = currentElement;

        return function unsubscribe() {
          subscribed.current = null;
          if (currentElement) {
            observer.unobserve(currentElement);
          }
        };
      }
    },
    [isSubscribed, ref, handleIntersectionChange, intersectionObserverInit],
  );

  if (!providedRef) {
    if (changeHandler.current) {
      return setRef;
    } else {
      return [intersects, setRef];
    }
  } else if (!changeHandler.current) {
    return intersects;
  }
}

export default useIntersection;

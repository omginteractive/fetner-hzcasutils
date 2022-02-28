import {useCallback, useRef, useMemo, useEffect} from 'react';
import useValueObject from '@hzdg/use-value-object';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => any;

/**
 * A callback that memoizes its result until the
 * configured wait period has elapsed since the last invocation.
 *
 * Has two utility `cancel` and `flush` methods that allow
 * canceling the next delayed invocation and forcing immediate
 * invocation, respectively.
 */
export interface Debounced<T extends Callback> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  /** Cancel the next scheduled invocation of the callback. */
  cancel(): void;
  /** Force the next invocation of the callback to occur immediately. */
  flush(): void;
}

/**
 * Options to configure `useDebouncedCallback`.
 */
export interface DebounceOptions {
  /**
   * The amount of time (in ms) to wait
   * before allowing the callback to be invoked.
   *
   * Defaults to `0`.
   */
  wait?: number;
  /**
   * The maximum amount of time (in ms) to wait
   * before allowing the callback to be invoked.
   */
  maxWait?: number | false;
  /**
   * Invoke the callback before debouncing.
   *
   * Defaults to `false`.
   *
   * If `false` while `wait` is `0`, behaves similarly
   * to calling the callback with `setTimeout(callback, 0)`.
   */
  leading?: boolean;
  /**
   * Invoke the callback after debouncing.
   *
   * Defaults to `true`.
   *
   * If `true` while `leading` is `true`, the trailing invocation
   * is only scheduled if the callback is called more than once
   * while invocation is debounced.
   */
  trailing?: boolean;
}

type ParsedOptions = Required<DebounceOptions>;

/**
 * `parseOptions` will apply default options to partial options
 * provided to `useDebouncedCallback`.
 */
function parseOptions(waitOrOpts: number | DebounceOptions): ParsedOptions {
  const opts: ParsedOptions = {
    wait: 0,
    maxWait: false,
    leading: false,
    trailing: true,
  };
  if (typeof waitOrOpts === 'number') {
    opts.wait = waitOrOpts;
  } else {
    opts.wait = Math.max(opts.wait, waitOrOpts?.wait ?? opts.wait);
    opts.maxWait = waitOrOpts?.maxWait
      ? Math.max(opts.wait, waitOrOpts.maxWait)
      : opts.maxWait;
    opts.leading = waitOrOpts?.leading ?? opts.leading;
    opts.trailing = waitOrOpts?.trailing ?? opts.trailing;
  }
  return opts;
}

/**
 * A sentinel value that indicates
 * the callback has not been invoked before.
 */
const NORETURN = Symbol('NORETURN');

/**
 * `isReturnType` will determine if the given value
 * is the result of invoking the callback.
 */
function isReturnType<T extends Callback>(
  value: unknown,
): value is ReturnType<T> {
  return value !== NORETURN;
}

/**
 * `resultOrUndefined` will return the given value
 * if it is the result of invoking the callback, or `undefined`.
 */
function resultOrUndefined<T extends Callback>(
  value: unknown,
): ReturnType<T> | undefined {
  return isReturnType<T>(value) ? value : undefined;
}

/**
 * `useDebouncedCallback` will return a memoized _and debounced_ version
 * of the callback that changes only if one of the debounce options
 * changes or if one of the inputs changes.
 *
 * The debounced callback will return a memoized result until the
 * wait period specified by the debounce options has elapsed
 * since the last invocation.
 */
export default function useDebouncedCallback<T extends Callback>(
  /** The callback to debounce */
  callback: T,
  /**
   * Options to configure `useDebouncedCallback`, or
   * the amount of time (in ms) to wait before the callback will be invoked.
   */
  waitOrOptions: number | DebounceOptions = 0,
  /**
   * A list of dependencies of the callback, similar to `useCallback`.
   *
   * If omitted, then the debounced callback will change
   * whenever `callback` changes.
   */
  deps: React.DependencyList = [callback],
): Debounced<T> {
  const memoizedCallback = useCallback(callback, deps);
  const options = useValueObject(parseOptions(waitOrOptions));
  /** The current debouce timeout id. */
  const timeout = useRef<NodeJS.Timeout | undefined>();
  /** The latest _unapplied_ arguments to the debounced callback.*/
  const args = useRef<Parameters<T> | undefined>();
  /** The latest return value from the underlying callback. */
  const result = useRef<ReturnType<T> | typeof NORETURN>(NORETURN);
  /** The last time the debounced callback was called. */
  const callTime = useRef<number | undefined>();
  /** The last time the underlying callback was called. */
  const flushTime = useRef(0);

  /** How much time (in ms) must elapse before the next flush can occur. */
  const getWaitRemaining = useCallback(
    (
      /**
       * The time from which to calculate the remaining wait.
       *
       * Defaults to `Date.now()`.
       */
      now: number = Date.now(),
    ) => {
      const {wait, maxWait} = options;
      // If the debounced callback has never been called before,
      // we must wait for the full amount of time specified by `wait`.
      if (callTime.current == null) return wait;
      const callElapsed = now - callTime.current;
      /**
       * Our remaining wait is defined as the difference between `
       * wait` and how much time has elapsed since the last call
       * to the debounced callback.
       */
      const waitRemaining = wait - callElapsed;

      // If we have a `maxWait`, then we should take the minimum
      // of the remaining wait time or the remaining max wait time.
      if (maxWait !== false) {
        const flushElapsed = now - flushTime.current;
        /**
         * Our remaining _max_ wait is defined as the difference between
         * `maxWait` and how much time has elapsed since the last invocation
         * of the underlying callback.
         */
        const maxWaitRemaining = maxWait - flushElapsed;
        return Math.min(waitRemaining, maxWaitRemaining);
      }
      return waitRemaining;
    },
    [options],
  );

  /**
   * Whether enough time has elapsed since the last flush to allow another.
   *
   * Returns `true` if the debounced callback hasn't been called before.
   */
  const canFlush = useCallback(
    (now: number): boolean => {
      if (callTime.current == null) return true;
      return getWaitRemaining(now) <= 0;
    },
    [getWaitRemaining],
  );

  /**
   * Apply the latest arguments to the underlying callback
   * and return the result.
   *
   * Returns `undefined` if the debounced callback hasn't been called before,
   * or the previous result if the debounced callback hasn't been called since
   * the last flush.
   */
  const flushNow = useCallback(
    (
      /**
       * The timestamp for the flush.
       *
       * Defaults to `Date.now()`.
       */
      now: number = Date.now(),
    ) => {
      if (args.current) {
        result.current = memoizedCallback(...args.current);
      }
      args.current = undefined;
      flushTime.current = now;
      return resultOrUndefined<T>(result.current);
    },
    [memoizedCallback],
  );

  /**
   * Flush a new result on the trailing edge of the timeout if necessary,
   * and then restart the debounce timeout if necessary.
   */
  const handleTimeout = useCallback(() => {
    const now = Date.now();
    if (canFlush(now)) {
      if (timeout.current != null) {
        clearTimeout(timeout.current);
        timeout.current = undefined;
      }
      if (options.trailing && args.current) {
        flushNow(now);
        return;
      }
      args.current = undefined;
      return;
    }
    if (timeout.current != null) clearTimeout(timeout.current);
    timeout.current = setTimeout(handleTimeout, getWaitRemaining(now));
  }, [options, canFlush, flushNow, getWaitRemaining]);

  /** Force the next invocation of the callback to occur immediately. */
  const flush = useCallback(() => {
    if (timeout.current != null) {
      clearTimeout(timeout.current);
      timeout.current = undefined;
      if (options.trailing && args.current) {
        flushNow();
        return;
      }
      args.current = undefined;
    }
  }, [flushNow, options]);

  /** Cancel the next scheduled invocation of the callback. */
  const cancel = useCallback(() => {
    if (timeout.current != null) clearTimeout(timeout.current);
    flushTime.current = 0;
    callTime.current = undefined;
    timeout.current = undefined;
    args.current = undefined;
  }, []);

  /**
   * A debounced version of the memoized callback.
   */
  const debouncedCallback = useCallback(
    (...withArgs: Parameters<T>) => {
      const now = Date.now();
      /**
       * `true` if the debounced callback hasn't been called before,
       * or a `boolean` representing whether or not enough time has elapsed
       * since the last flush to allow another.
       */
      const flushable = canFlush(now);
      args.current = withArgs;
      callTime.current = now;

      if (flushable) {
        if (timeout.current == null) {
          // If we're not currently debounced,
          // and`leading` is `true`, flush a new result now.
          if (options.leading) {
            flushNow(now);
          }
        } else if (options.maxWait !== false) {
          // If we're currently debounced, but we have a `maxWait`,
          // restart the debounce timeout and flush a new result now.
          // Note: this is safe to do here because `canFlush()`
          // has already determined that `maxWait` has been reached.
          clearTimeout(timeout.current);
          timeout.current = undefined;
          flushNow(now);
        }
      }

      if (timeout.current == null) {
        // Debounce additional calls to `debouncedCallback`.
        timeout.current = setTimeout(handleTimeout, options.wait);
      }

      return resultOrUndefined<T>(result.current);
    },
    [options, canFlush, flushNow, handleTimeout],
  );

  // Cancel the next scheduled invocation
  // whenever the debounced callback changes.
  useEffect(cancel, [debouncedCallback]);

  // Return the debounced callback
  // with added `cancel()` and `flush()` methods.
  return useMemo<Debounced<T>>(
    () => Object.assign(debouncedCallback, {cancel, flush}),
    [debouncedCallback, cancel, flush],
  );
}

import useValueObject from '@hzdg/use-value-object';
import useDebouncedCallback, {
  DebounceOptions,
} from '@hzdg/use-debounced-callback';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => any;

/**
 * A callback that memoizes its result until the
 * configured wait period has elapsed.
 *
 * Has two utility `cancel` and `flush` methods that allow
 * canceling the next delayed invocation and forcing immediate
 * invocation, respectively.
 */
export interface Throttled<T extends Callback> {
  (...args: Parameters<T>): ReturnType<T> | undefined;
  /** Cancel the next scheduled invocation of the callback. */
  cancel(): void;
  /** Force the next invocation of the callback to occur immediately. */
  flush(): void;
}

/**
 * Options to configure `useThrottledCallback`.
 */
export interface ThrottleOptions {
  /**
   * The amount of time (in ms) to wait
   * before allowing the callback to be invoked.
   *
   * Defaults to `0`.
   */
  wait?: number;
  /**
   * Invoke the callback before throttling.
   *
   * Defaults to `true`.
   *
   * If `false` while `wait` is `0`, behaves similarly
   * to calling the callback with `setTimeout(callback, 0)`.
   */
  leading?: boolean;
  /**
   * Invoke the callback after throttling.
   *
   * Defaults to `true`.
   *
   * If `true` while `leading` is `true`, the trailing invocation
   * is only scheduled if the callback is called more than once
   * while invocation is throttled.
   */
  trailing?: boolean;
}

type ParsedOptions = Required<DebounceOptions>;

/**
 * `parseOptions` will apply default options to partial options
 * provided to `useThrottledCallback`.
 */
function parseOptions(waitOrOpts: number | ThrottleOptions): ParsedOptions {
  const opts: ParsedOptions = {
    wait: 0,
    maxWait: 0,
    leading: true,
    trailing: true,
  };
  if (typeof waitOrOpts === 'number') {
    opts.wait = waitOrOpts;
    opts.maxWait = waitOrOpts;
  } else {
    opts.wait = Math.max(opts.wait, waitOrOpts?.wait ?? opts.wait);
    opts.maxWait = opts.wait;
    opts.leading = waitOrOpts?.leading ?? opts.leading;
    opts.trailing = waitOrOpts?.trailing ?? opts.trailing;
  }
  return opts;
}

/**
 * `useThrottledCallback` will return a memoized _and throttled_ version
 * of the callback that changes only if one of the throttle options
 * changes or if one of the inputs changes.
 *
 * The throttled callback will return a memoized result until the
 * wait period specified by the throttle options has elapsed.
 */
export default function useThrottledCallback<T extends Callback>(
  /** The callback to throttle */
  callback: T,
  /**
   * Options to configure `useThrottledCallback`, or
   * the amount of time (in ms) to wait before the callback will be invoked.
   */
  waitOrOptions: number | ThrottleOptions = 0,
  /**
   * A list of dependencies of the callback, similar to `useCallback`.
   *
   * If omitted, then the throttled callback will change
   * whenever `callback` changes.
   */
  deps: React.DependencyList = [callback],
): Throttled<T> {
  const options = useValueObject(parseOptions(waitOrOptions));
  return useDebouncedCallback(callback, options, deps);
}

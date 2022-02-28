/* eslint-env jest, browser */
import {renderHook} from '@testing-library/react-hooks';
import useThrottledCallback from '../src';

const __DateDotNow__ = Date.now;
let __now__ = 0;

const wait = (delay: number): void => {
  __now__ += delay;
  jest.advanceTimersByTime(delay);
};

beforeEach(() => {
  __now__ = 0; // Date.now();
  Date.now = jest.fn(() => __now__);
  jest.useFakeTimers();
});

afterEach(() => {
  Date.now = __DateDotNow__;
  jest.useRealTimers();
});

type Args = Parameters<typeof useThrottledCallback>;
type Result = ReturnType<typeof useThrottledCallback>;

describe('useThrottledCallback', () => {
  it('returns a memoized callback', async () => {
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useThrottledCallback(...props.args),
      {initialProps: {args: [jest.fn()]}},
    );

    // Expect a memoized callback.
    expect(result.current).toBeInstanceOf(Function);
    let lastResult = result.current;
    rerender();
    expect(result.current).toBe(lastResult);

    // Expect a memoized callback with a `wait` arg.
    lastResult = result.current;
    rerender({args: [jest.fn(), 32]});
    expect(result.current).toBeInstanceOf(Function);
    expect(result.current).not.toBe(lastResult);
    lastResult = result.current;
    rerender();
    expect(result.current).toBe(lastResult);

    // Expect a memoized callback with options.
    lastResult = result.current;
    rerender({args: [jest.fn(), {wait: 32}]});
    expect(result.current).toBeInstanceOf(Function);
    expect(result.current).not.toBe(lastResult);
    lastResult = result.current;
    rerender();
    expect(result.current).toBe(lastResult);
  });

  it('updates the memoized callback when `callback` changes', () => {
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useThrottledCallback(...props.args),
      {initialProps: {args: [jest.fn()]}},
    );

    // Expect a new memoized callback when the callback changes.
    const lastResult = result.current;
    const cb = jest.fn();
    rerender({args: [cb]});
    expect(result.current).not.toBe(lastResult);
  });

  it('updates the memoized callback when `wait` changes', () => {
    const cb = jest.fn();
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useThrottledCallback(...props.args),
      {initialProps: {args: [cb, 32]}},
    );

    // Expect the same memoized callback when `wait` hasn't changed.
    let lastResult = result.current;
    rerender({args: [cb, 32]});
    expect(result.current).toBe(lastResult);

    // Expect a new memoized callback when `wait` has changed.
    lastResult = result.current;
    rerender({args: [cb, 33]});
    expect(result.current).not.toBe(lastResult);
  });

  it('updates the memoized callback when `options` change', () => {
    const cb = jest.fn();
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useThrottledCallback(...props.args),
      {initialProps: {args: [cb, {wait: 32, trailing: true}]}},
    );

    // Expect the same memoized callback when options match previous options.
    let lastResult = result.current;
    rerender({args: [cb, {wait: 32, trailing: true}]});
    expect(result.current).toBe(lastResult);

    // Expect a new memoized callback when options change.
    lastResult = result.current;
    rerender({args: [cb, {wait: 33, trailing: true}]});
    expect(result.current).not.toBe(lastResult);
  });

  it('updates the memoized callback when dependencies change', () => {
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useThrottledCallback(...props.args),
      {initialProps: {args: [jest.fn(), 32, [0]]}},
    );

    // Expect the same memoized callback when deps match previous deps.
    let lastResult = result.current;
    rerender({args: [jest.fn(), 32, [0]]});
    expect(result.current).toBe(lastResult);

    // Expect a new memoized callback when deps change.
    lastResult = result.current;
    rerender({args: [jest.fn(), 32, [1]]});
    expect(result.current).not.toBe(lastResult);
  });

  it('throttles the callback', () => {
    const callback = jest.fn();
    const opts = 32;
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect initial call not to be throttled.
    result.current('test');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('test');

    // Expect callback not to be called again when throttle times out
    // and no additional calls were throttled.
    wait(32);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect next call after throttle has timed out not to be throttled.
    result.current('test2');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('test2');

    // Expect `callback` not to be called while throttled.
    wait(30);
    result.current('test3');
    expect(callback).toHaveBeenCalledTimes(2);

    // Expect `callback` to be called again after throttle times out.
    wait(2);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith('test3');
  });

  it('should not immediately call `callback` when `wait` is `0` and `leading` is `false`', () => {
    const callback = jest.fn();
    const opts = {wait: 0, leading: false};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect initial call to be throttled.
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called on next tick.
    wait(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('applies default options', () => {
    const callback = jest.fn();
    const opts = {};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Note: Expected behavior should resemble the default options
    // `{wait: 0, leading: true, trailing: true}`.

    // Expect initial `callback` not to be throttled (`leading` is `true`).
    result.current('test');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('test');

    // Expect `callback` not to have been called on next tick.
    wait(0);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect next `callback` not to be throttled.
    result.current('test2');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('test2');

    // Expect throttled `callback` to be called after time out.
    result.current('test3');
    expect(callback).toHaveBeenCalledTimes(2);
    wait(0);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith('test3');
  });

  it('supports a `wait` option', () => {
    const callback = jest.fn();
    const opts = {wait: 32};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect initial call not to be throttled.
    result.current('test');
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('test');

    // Expect `callback` not to be called after time out.
    wait(32);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect next `callback` after time out not to be throttled.
    result.current('test2');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('test2');

    // Expect additional calls to the `callback` to be throttled.
    result.current('test3');
    wait(30);
    result.current('test4');
    expect(callback).toHaveBeenCalledTimes(2);

    // Expect last throttled call to be applied on time out.
    wait(2);
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith('test4');
  });

  it('supports a `leading` option', () => {
    const trailing = jest.fn();
    const leading = jest.fn();
    const leadingAndTrailing = jest.fn();
    const {result} = renderHook(() => ({
      trailing: useThrottledCallback(trailing, {wait: 32, leading: false}),
      leading: useThrottledCallback(leading, {
        wait: 32,
        leading: true,
        trailing: false,
      }),
      leadingAndTrailing: useThrottledCallback(leadingAndTrailing, {
        wait: 32,
        leading: true,
      }),
    }));

    // Expect trailing callback to have been throttled.
    result.current.trailing('test');
    expect(trailing).not.toHaveBeenCalled();

    // Expect leading callbacks not to have been throttled.
    result.current.leading('test');
    result.current.leadingAndTrailing('test');
    expect(leading).toHaveBeenCalledTimes(1);
    expect(leadingAndTrailing).toHaveBeenCalledTimes(1);

    // Expect trailing callback to be called after time out,
    // and leading callbacks not to have been called after timeout.
    wait(32);
    expect(trailing).toHaveBeenCalledTimes(1);
    expect(leading).toHaveBeenCalledTimes(1);
    expect(leadingAndTrailing).toHaveBeenCalledTimes(1);
  });

  it('returns the last result for subsequent leading throttled calls', () => {
    const callback = jest.fn();
    const opts = {leading: true, trailing: false};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect the initial call immediately.
    result.current('test1');
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect additional calls to be throttled.
    result.current('test2');
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to have been called with a trailing call.
    wait(0);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect the next call after timeout immediately.
    result.current('test3');
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('test3');
  });

  it('supports a `trailing` option', () => {
    const withTrailing = jest.fn();
    const withoutTrailing = jest.fn();
    const {result} = renderHook(() => ({
      withTrailing: useThrottledCallback(withTrailing, {trailing: true}),
      withoutTrailing: useThrottledCallback(withoutTrailing, {trailing: false}),
    }));

    // Expect initial calls not to be throttled.
    result.current.withTrailing();
    expect(withTrailing).toHaveBeenCalledTimes(1);
    result.current.withoutTrailing();
    expect(withoutTrailing).toHaveBeenCalledTimes(1);

    // Expect trailing calls not to occur after timeout
    // when no additional calls are throttled.
    wait(0);
    expect(withTrailing).toHaveBeenCalledTimes(1);
    expect(withoutTrailing).toHaveBeenCalledTimes(1);

    // Expect next calls after timeout not to be throttled.
    result.current.withTrailing();
    result.current.withoutTrailing();
    expect(withTrailing).toHaveBeenCalledTimes(2);
    expect(withoutTrailing).toHaveBeenCalledTimes(2);

    // Expect trailing calls to occur after timeout
    // when additional calls are throttled, but no
    // trailing calls when `trailing` is `false`.
    result.current.withTrailing();
    result.current.withoutTrailing();
    wait(0);
    expect(withTrailing).toHaveBeenCalledTimes(3);
    expect(withoutTrailing).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending throttled timeout when `cancel()` is called', () => {
    const callback = jest.fn();
    const opts = {wait: 32, maxWait: 64};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect initial call not to be throttled
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to be called when throttle timeout is canceled.
    result.current();
    wait(30);
    result.current.cancel();
    wait(2);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect next `callback` call not to be throttled.
    result.current();
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('flushes a pending throttled timeout when `flush()` is called', () => {
    const callback = jest.fn();
    const opts = {wait: 32, maxWait: 64};
    const {result} = renderHook(() => useThrottledCallback(callback, opts));

    // Expect initial call not to be throttled.
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to be called when throttled.
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect throttled `callback` to be called when flushed.
    wait(30);
    result.current.flush();
    expect(callback).toHaveBeenCalledTimes(2);

    // Expect flushed `callback` not to be called again after time out.
    wait(2);
    expect(callback).toHaveBeenCalledTimes(2);

    // Expect next `callback` not to be throttled.
    result.current();
    expect(callback).toHaveBeenCalledTimes(3);
  });
});

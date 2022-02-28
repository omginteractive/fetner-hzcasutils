/* eslint-env jest, browser */
import {renderHook} from '@testing-library/react-hooks';
import useDebouncedCallback from '../src';

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

type Args = Parameters<typeof useDebouncedCallback>;
type Result = ReturnType<typeof useDebouncedCallback>;

describe('useDebouncedCallback', () => {
  it('returns a memoized callback', async () => {
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useDebouncedCallback(...props.args),
      {
        initialProps: {args: [jest.fn()]},
      },
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
      props => useDebouncedCallback(...props.args),
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
      props => useDebouncedCallback(...props.args),
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
      props => useDebouncedCallback(...props.args),
      {initialProps: {args: [cb, {wait: 32, maxWait: 50}]}},
    );

    // Expect the same memoized callback when options match previous options.
    let lastResult = result.current;
    rerender({args: [cb, {wait: 32, maxWait: 50}]});
    expect(result.current).toBe(lastResult);

    // Expect a new memoized callback when options change.
    lastResult = result.current;
    rerender({args: [cb, {wait: 33, maxWait: 50}]});
    expect(result.current).not.toBe(lastResult);
  });

  it('updates the memoized callback when dependencies change', () => {
    const {result, rerender} = renderHook<{args: Args}, Result>(
      props => useDebouncedCallback(...props.args),
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

  it('debounces the callback', () => {
    const callback = jest.fn();
    const opts = 32;
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced.
    result.current('test');
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` not to be called before debounce times out.
    wait(31);
    expect(callback).not.toHaveBeenCalled();

    // Expect 'callback' to have been called after debounce
    // times out with the last args received before debounce timed out.
    wait(1);
    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenLastCalledWith('test');

    // Expect `callback` not to have been called when
    // additional calls to `handler` have restarted the debounce timeout.
    result.current('test2');
    wait(31);
    result.current('test3');
    wait(1);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` to be called with the last args
    // received after debounce times out.
    wait(32);
    expect(callback).toHaveBeenCalledTimes(2);
    expect(callback).toHaveBeenLastCalledWith('test3');
  });

  it('should not immediately call `callback` when `wait` is `0`', () => {
    const callback = jest.fn();
    const opts = 0;
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced.
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called on next tick.
    wait(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('applies default options', () => {
    const callback = jest.fn();
    const opts = {};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Note: Expected behavior should resemble the default options
    // `{wait: 0, leading: false, trailing: true}`.

    // Expect initial call to be debounced.
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called on next tick.
    wait(0);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('supports a `wait` option', () => {
    const callback = jest.fn();
    const opts = {wait: 32};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced.
    result.current('test');
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` not to be called before debounce times out.
    wait(31);
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called after debounce times out.
    wait(1);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('supports a `leading` option', () => {
    const leading = jest.fn();
    const leadingAndTrailing = jest.fn();
    const opts = {wait: 32, leading: true};
    const {result} = renderHook(() => ({
      leading: useDebouncedCallback(leading, opts),
      leadingAndTrailing: useDebouncedCallback(leadingAndTrailing, opts),
    }));

    // Expect the initial call immediately when `leading` is  `true`, .
    result.current.leading('test');
    expect(leading).toHaveBeenCalledTimes(1);

    // Expect only the _first_ call immediately.
    result.current.leadingAndTrailing('test1');
    result.current.leadingAndTrailing('test2');
    expect(leadingAndTrailing).toHaveBeenCalledTimes(1);
    expect(leadingAndTrailing).toHaveBeenLastCalledWith('test1');

    // Expect the last debounced call to be handled on the trailing
    // edge of the debounce timeout, as `trailing` is `true` by default.
    wait(32);
    expect(leadingAndTrailing).toHaveBeenCalledTimes(2);
    expect(leadingAndTrailing).toHaveBeenLastCalledWith('test2');

    // Expect subsequent calls to happen immediately when not debounced.
    result.current.leading('test');
    expect(leading).toHaveBeenCalledTimes(2);
  });

  it('returns the last result for subsequent leading debounced calls', () => {
    const callback = jest.fn();
    const opts = {leading: true, trailing: false};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect the initial call immediately.
    result.current('test1');
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect additional calls to be debounced.
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
      withTrailing: useDebouncedCallback(withTrailing, {trailing: true}),
      withoutTrailing: useDebouncedCallback(withoutTrailing, {trailing: false}),
    }));

    // Expect initial calls to be debounced.
    result.current.withTrailing();
    expect(withTrailing).not.toHaveBeenCalled();
    result.current.withoutTrailing();
    expect(withoutTrailing).not.toHaveBeenCalled();

    // After debounce has timed out, expect trailing
    // callback to have been called, and non-trailing
    // callback not to have been called.
    wait(0);
    expect(withTrailing).toHaveBeenCalledTimes(1);
    expect(withoutTrailing).not.toHaveBeenCalled();
  });

  it('supports a `maxWait` option', () => {
    const callback = jest.fn();
    const opts = {wait: 32, maxWait: 64};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced.
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called after debounce times out.
    wait(32);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to have been called after being debounced
    // multiple times.
    result.current();
    wait(30);
    result.current();
    wait(30);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` to have been called after being debounced
    // for longer than `maxWait`.
    result.current();
    wait(30);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('supports `maxWait` in a tight loop', () => {
    const withMaxWait = jest.fn();
    const withoutMaxWait = jest.fn();
    const {result} = renderHook(() => ({
      withMaxWait: useDebouncedCallback(withMaxWait, {wait: 64, maxWait: 128}),
      withoutMaxWait: useDebouncedCallback(withoutMaxWait, 96),
    }));

    const start = Date.now();
    while (Date.now() - start < 320) {
      result.current.withMaxWait();
      result.current.withoutMaxWait();
      wait(Math.round(Math.random() * 32));
    }

    expect(withMaxWait).toHaveBeenCalledTimes(2);
    expect(withoutMaxWait).not.toHaveBeenCalled();
  });

  it('queues a trailing call for subsequent debounced calls after `maxWait`', () => {
    const callback = jest.fn();
    const opts = {wait: 150, maxWait: 200};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced.
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` not to have been called before debounce times out.
    wait(90);
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to have been called once after
    // `maxWait` has been reached.
    wait(110);
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to have been called again
    // before debounce times out.
    wait(10);
    result.current();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` to have been called again after debounce timed out.
    wait(150);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('cancels a pending debounced timeout when `cancel()` is called', () => {
    const callback = jest.fn();
    const opts = {wait: 32, maxWait: 64};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` not to be called when debounce timeout is canceled.
    result.current.cancel();
    wait(32);
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to be called after uncanceled debounce times out.
    result.current();
    wait(32);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('flushes a pending debounced timeout when `flush()` is called', () => {
    const callback = jest.fn();
    const opts = {wait: 32, maxWait: 64};
    const {result} = renderHook(() => useDebouncedCallback(callback, opts));

    // Expect initial call to be debounced
    result.current();
    expect(callback).not.toHaveBeenCalled();

    // Expect `callback` to be called when debounce is flushed.
    result.current.flush();
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` not to be called again after debounce was flushed.
    wait(32);
    expect(callback).toHaveBeenCalledTimes(1);

    // Expect `callback` to be called again after debounce times out.
    result.current();
    wait(32);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});

/* eslint-env jest */
import React, {useState} from 'react';
import {render, fireEvent, getByTestId, act} from '@testing-library/react';
import ScrollMonitor, {ScrollMonitorRenderProps} from '../ScrollMonitor';
import {DOWN, RIGHT, UP, LEFT} from '../useScrollDirection';

type Mutable<T> = {-readonly [K in keyof T]: T[K]};

const SCROLL_SIZE = 100;

const printScrollState = (
  scrollState: ScrollMonitorRenderProps<HTMLElement>,
): string => {
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  const {scrollRef, ...printable} = scrollState;
  return JSON.stringify(printable, null, 2);
};

const renderScrollState = (
  scrollState: ScrollMonitorRenderProps<HTMLElement>,
): JSX.Element => (
  <div
    ref={scrollState.scrollRef}
    style={{width: SCROLL_SIZE, height: SCROLL_SIZE}}
  >
    <pre data-testid="scrollState">{printScrollState(scrollState)}</pre>
  </div>
);

const getScrollState = (
  container: HTMLElement,
): ScrollMonitorRenderProps<HTMLElement> =>
  JSON.parse(getByTestId(container, 'scrollState').innerHTML);

function scrollTo(scrollLeft: number, scrollTop: number): void {
  fireEvent.scroll(document.body, {
    bubbles: true,
    target: {scrollLeft, scrollTop},
  });
}

const runAllTimers = (): void => {
  act(() => {
    jest.runAllTimers();
  });
};

beforeAll(() => {
  // Monkeypatch `body.scrollWidth` and `body.scrollHeight`
  // to give our tests some scrollable area to play with.
  // We need to do this cuz jsdom doesn't actually do any layout,
  // so all sizes will always be reported as `0`.
  Object.defineProperties(document.body, {
    scrollWidth: {
      configurable: true,
      get() {
        return SCROLL_SIZE;
      },
    },
    scrollHeight: {
      configurable: true,
      get() {
        return SCROLL_SIZE;
      },
    },
  });
});

afterAll(() => {
  // Restore the original `body.scrollWidth` and `body.scrollHeight`.
  delete (document.body as Mutable<typeof document.body>).scrollWidth;
  delete (document.body as Mutable<typeof document.body>).scrollHeight;
});

describe('<ScrollMonitor>', () => {
  describe('scrolling', () => {
    test('it does nothing when disabled', async () => {
      const {container} = render(
        <ScrollMonitor>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).scrolling).not.toBeDefined();
      scrollTo(0, 0);
      expect(getScrollState(container).scrolling).not.toBeDefined();
    });

    test('it renders scrolling state', async () => {
      // Mock timers cuz scrolling state flips via a debounced timeout.
      jest.useFakeTimers();
      const {container} = render(
        <ScrollMonitor scrolling>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container)).toMatchObject({scrolling: false});
      scrollTo(0, 0);
      expect(getScrollState(container)).toMatchObject({scrolling: true});
      runAllTimers();
      expect(getScrollState(container)).toMatchObject({scrolling: false});
    });
  });

  describe('position', () => {
    test('it does nothing when disabled', async () => {
      const {container} = render(
        <ScrollMonitor>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).position).not.toBeDefined();
      scrollTo(0, 0);
      expect(getScrollState(container).position).not.toBeDefined();
    });

    test('it renders scroll position state', async () => {
      const {container} = render(
        <ScrollMonitor position>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).position).toMatchObject({
        top: null,
        left: null,
      });
      scrollTo(0, 0);
      expect(getScrollState(container).position).toMatchObject({
        top: 0,
        left: 0,
      });
      scrollTo(1, 2);
      expect(getScrollState(container).position).toMatchObject({
        top: 2,
        left: 1,
      });
    });
  });

  describe('direction', () => {
    test('it does nothing when disabled', async () => {
      const {container} = render(
        <ScrollMonitor>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).direction).not.toBeDefined();
      scrollTo(0, 0);
      expect(getScrollState(container).direction).not.toBeDefined();
    });

    test('it renders scroll direction state', async () => {
      const {container} = render(
        <ScrollMonitor direction>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).direction).toMatchObject({
        vertical: null,
        horizontal: null,
      });
      scrollTo(1, 2);
      expect(getScrollState(container).direction).toMatchObject({
        vertical: DOWN,
        horizontal: RIGHT,
      });
      scrollTo(0, 1);
      expect(getScrollState(container).direction).toMatchObject({
        vertical: UP,
        horizontal: LEFT,
      });
    });
  });

  describe('bounds', () => {
    test('it does nothing when disabled', async () => {
      const {container} = render(
        <ScrollMonitor>{renderScrollState}</ScrollMonitor>,
      );
      expect(getScrollState(container).intersects).not.toBeDefined();
      scrollTo(0, 0);
      expect(getScrollState(container).intersects).not.toBeDefined();
    });

    test('it renders scroll intersects state', async () => {
      const {container} = render(
        <ScrollMonitor intersects={{bottom: 3}}>
          {renderScrollState}
        </ScrollMonitor>,
      );
      expect(getScrollState(container).intersects).toBe(false);
      scrollTo(0, 2);
      expect(getScrollState(container).intersects).toBe(true);
      scrollTo(0, 4);
      expect(getScrollState(container).intersects).toBe(false);
    });
  });

  test('it renders scroll intersects array state', async () => {
    const {container} = render(
      <ScrollMonitor intersects={[{top: 10, bottom: 30}, {top: 20, right: 10}]}>
        {renderScrollState}
      </ScrollMonitor>,
    );
    expect(getScrollState(container).intersects).toMatchObject([false, false]);
    scrollTo(0, 20);
    expect(getScrollState(container).intersects).toMatchObject([true, true]);
    scrollTo(0, 10);
    expect(getScrollState(container).intersects).toMatchObject([true, false]);
    scrollTo(5, 31);
    expect(getScrollState(container).intersects).toMatchObject([false, true]);
    scrollTo(11, 31);
    expect(getScrollState(container).intersects).toMatchObject([false, false]);
  });

  describe('onStart', () => {
    test('it is called on scroll start', async () => {
      // Mock timers cuz scrolling state flips via a debounced timeout.
      jest.useFakeTimers();

      const onStart1 = jest.fn();
      let setOnStart: (cb: jest.Mock) => void;

      const App = (): JSX.Element => {
        const [state, setState] = useState({onStart: onStart1});
        setOnStart = (nextOnStart: jest.Mock) =>
          setState({onStart: nextOnStart});
        return <ScrollMonitor {...state}>{renderScrollState}</ScrollMonitor>;
      };

      const {container} = render(<App />);

      expect(getScrollState(container).scrolling).toBe(false);
      // Should not be called as no scrolling is happening.
      expect(onStart1).not.toHaveBeenCalled();
      // Start scrolling.
      scrollTo(0, 2);
      expect(getScrollState(container).scrolling).toBe(true);
      // Should be called as scrolling has started.
      expect(onStart1).toHaveBeenCalledTimes(1);
      // Keep scrolling.
      scrollTo(0, 4);
      // Should only have been called once!
      expect(onStart1).toHaveBeenCalledTimes(1);

      // Run the timeout that resets scrolling to false.
      runAllTimers();
      expect(getScrollState(container).scrolling).toBe(false);

      // Should still only have been called once!
      expect(onStart1).toHaveBeenCalledTimes(1);

      // Start scrolling again.
      scrollTo(0, 6);
      expect(getScrollState(container).scrolling).toBe(true);
      // Should be called a second time.
      expect(onStart1).toHaveBeenCalledTimes(2);

      // Test changing identity of the callback.
      const onStart2 = jest.fn();
      act(() => {
        setOnStart(onStart2);
      });
      // We don't expect onStart1 to be called again.
      expect(onStart1).toHaveBeenCalledTimes(2);
      // We _do_ expect onStart2 to be called
      // because scrolling is currently happening.
      expect(onStart2).toHaveBeenCalledTimes(1);

      // Run the timeout that resets scrolling to false.
      runAllTimers();
      expect(getScrollState(container).scrolling).toBe(false);

      // Change the callback identity again,
      const onStart3 = jest.fn();
      act(() => {
        setOnStart(onStart3);
      });

      expect(getScrollState(container).scrolling).toBe(false);

      // This time expecting none of the callbacks to be called.
      expect(onStart1).toHaveBeenCalledTimes(2);
      expect(onStart2).toHaveBeenCalledTimes(1);
      expect(onStart3).not.toHaveBeenCalled();
    });
  });

  describe('onChange', () => {
    test('it is called on scroll change', async () => {
      // Mock timers cuz scrolling state flips via a debounced timeout.
      jest.useFakeTimers();
      const onChange1 = jest.fn();
      let setOnChange: (cb: jest.Mock) => void;
      const App = (): JSX.Element => {
        const [state, setState] = useState({onChange: onChange1});
        setOnChange = (nextOnChange: jest.Mock) =>
          setState({onChange: nextOnChange});
        return <ScrollMonitor {...state}>{renderScrollState}</ScrollMonitor>;
      };
      render(<App />);

      expect(onChange1).not.toHaveBeenCalled();
      // Start scrolling.
      scrollTo(0, 2);
      expect(onChange1).toHaveBeenCalledTimes(1);
      expect(onChange1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          position: {
            top: 2,
            left: 0,
          },
        }),
      );
      // Continue scrolling.
      scrollTo(0, 4);
      expect(onChange1).toHaveBeenCalledTimes(2);
      expect(onChange1).toHaveBeenLastCalledWith(
        expect.objectContaining({
          position: {
            top: 4,
            left: 0,
          },
        }),
      );
      // Test changing identity of the callback.
      const onChange2 = jest.fn();
      act(() => {
        setOnChange(onChange2);
      });
      // Don't expect onChange1 to be called again.
      expect(onChange1).toHaveBeenCalledTimes(2);
      expect(onChange2).toHaveBeenCalledTimes(1);
      expect(onChange2).toHaveBeenLastCalledWith(
        expect.objectContaining({
          position: {
            top: 4,
            left: 0,
          },
        }),
      );
      // Run the timeout that resets scrolling to false.
      runAllTimers();
      // Don't expect onChange2 to have been called again,
      // since position didn't change.
      expect(onChange1).toHaveBeenCalledTimes(2);
      expect(onChange2).toHaveBeenCalledTimes(1);
      // Test changing identity of the callback again.
      const onChange3 = jest.fn();
      act(() => {
        setOnChange(onChange3);
      });
      // Don't expect it to have been called, since scrolling has stopped.
      expect(onChange3).not.toHaveBeenCalled();
    });
  });

  describe('onEnd', () => {
    test('it is called on scroll end', async () => {
      // Mock timers cuz scrolling state flips via a debounced timeout.
      jest.useFakeTimers();

      const onEnd1 = jest.fn();
      let setOnEnd: (cb: jest.Mock) => void;

      const App = (): JSX.Element => {
        const [state, setState] = useState({onEnd: onEnd1});
        setOnEnd = (nextOnEnd: jest.Mock) => setState({onEnd: nextOnEnd});
        return <ScrollMonitor {...state}>{renderScrollState}</ScrollMonitor>;
      };

      render(<App />);

      // Should not be called as no scrolling is happening.
      expect(onEnd1).not.toHaveBeenCalled();
      // Start scrolling.
      scrollTo(0, 2);
      // Should not have been called as scrolling has started (or ended) yet.
      expect(onEnd1).not.toHaveBeenCalled();
      // Run the timeout that resets scrolling to false.
      runAllTimers();
      // Should have been called once!
      expect(onEnd1).toHaveBeenCalledTimes(1);
      // Start scrolling again.
      scrollTo(0, 6);
      // Should not have been called a second time yet.
      expect(onEnd1).toHaveBeenCalledTimes(1);
      // Run the timeout that resets scrolling to false.
      runAllTimers();
      // Should have been called a second time.
      expect(onEnd1).toHaveBeenCalledTimes(2);
      // Start scrolling again.
      scrollTo(0, 8);
      // Should not have been called a second time yet.
      expect(onEnd1).toHaveBeenCalledTimes(2);
      // Test changing identity of the callback.
      const onEnd2 = jest.fn();
      act(() => {
        setOnEnd(onEnd2);
      });
      // We don't expect onEnd1 to be called again.
      expect(onEnd1).toHaveBeenCalledTimes(2);
      // We don't expect onEnd2 to have been called yet.
      expect(onEnd2).not.toHaveBeenCalled();
      // Run the timeout that resets scrolling to false.
      runAllTimers();
      // We don't expect onEnd1 to be called again.
      expect(onEnd1).toHaveBeenCalledTimes(2);
      // We expect onEnd2 to be called because scrolling ended.
      expect(onEnd2).toHaveBeenCalledTimes(1);
    });
  });
});

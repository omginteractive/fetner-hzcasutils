/** @jsdom-global Object */
/* eslint-env jest, browser */
import React from 'react';
import {render, act} from '@testing-library/react';
import {WheelSequence} from 'testutils/EventSequence';
import useWheelGesture, {WheelGestureConfig} from '../useWheelGesture';

const GestureStateMatcher = {
  duration: expect.any(Number),
  elapsed: expect.any(Number),
  time: expect.any(Number),
  timeInitial: expect.any(Number),
};

// Threshold required to trigger a wheel gesture.
const DEFAULT_THRESHOLD = 40;

beforeEach(() => {
  jest.useFakeTimers();
});

function runAllTimers(): void {
  act(() => {
    jest.runAllTimers();
  });
}

test('useWheelGesture passes gesture states to a handler', async () => {
  const handler = jest.fn();
  const WheelGestureUser = (): JSX.Element => {
    const ref = useWheelGesture<HTMLDivElement>(handler);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<WheelGestureUser />);
  const target = getByTestId('gesture-target');
  await new WheelSequence(target)
    .wheel({deltaX: DEFAULT_THRESHOLD + 1})
    .wheel({deltaX: 5})
    .wheel({deltaX: 3, deltaY: 5});
  runAllTimers();
  expect(handler.mock.calls).toHaveLength(4);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useWheelGesture uses an existing ref', async () => {
  const handler = jest.fn();
  const WheelGestureUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    useWheelGesture<HTMLDivElement>(ref, handler);
    return <div ref={node => setNode(node)} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<WheelGestureUser />);
  const target = getByTestId('gesture-target');
  await new WheelSequence(target).wheel({deltaY: DEFAULT_THRESHOLD + 5});
  runAllTimers();
  expect(handler.mock.calls).toHaveLength(2);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useWheelGesture handles changes to handler and ref', async () => {
  // Create two handlers.
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  // Create two refs.
  const ref1 = React.createRef();
  const ref2 = React.createRef();

  const WheelGestureUser = React.forwardRef(
    ({handler}: {handler: jest.Mock}, forwardedRef): JSX.Element => {
      // Use a different ref based on the index prop.
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const ref = forwardedRef as React.MutableRefObject<HTMLDivElement | null>;
      ref.current = node;
      useWheelGesture<HTMLDivElement>(ref, handler);
      return (
        <div>
          <div
            ref={ref === ref1 ? node => setNode(node) : null}
            data-testid="gesture-target1"
          />
          <div
            ref={ref === ref2 ? node => setNode(node) : null}
            data-testid="gesture-target2"
          />
        </div>
      );
    },
  );
  WheelGestureUser.displayName = 'WheelGestureUser';

  const {getByTestId, rerender} = render(
    <WheelGestureUser handler={handler1} ref={ref1} />,
  );

  const target1 = getByTestId('gesture-target1');
  const target2 = getByTestId('gesture-target2');

  // Test that gesturing on the first target updates the current handler.
  await new WheelSequence(target1).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new WheelSequence(target2).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  // Switch the ref to the other gesture target.
  rerender(<WheelGestureUser handler={handler1} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new WheelSequence(target1).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new WheelSequence(target2).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the handler.
  rerender(<WheelGestureUser handler={handler2} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new WheelSequence(target1).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new WheelSequence(target2).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the ref back to the first target.
  rerender(<WheelGestureUser handler={handler2} ref={ref1} />);

  // Test that gesturing on the first target updates the current handler.
  await new WheelSequence(target1).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new WheelSequence(target2).wheel({deltaY: DEFAULT_THRESHOLD + 3});
  runAllTimers();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);
});

test('useWheelGesture resubscribes on config changes', async () => {
  const handler = jest.fn();
  const WheelGestureUser = ({
    config,
  }: {
    config?: WheelGestureConfig;
  }): JSX.Element => {
    const ref = useWheelGesture<HTMLDivElement>(handler, config);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId, rerender} = render(
    <WheelGestureUser config={{threshold: 9}} />,
  );
  const target = getByTestId('gesture-target');
  await new WheelSequence(target).wheel({deltaX: 1}).repeat(8);
  runAllTimers();
  expect(handler.mock.calls).toHaveLength(0);

  handler.mockReset();

  rerender(<WheelGestureUser config={{threshold: 10}} />);
  await new WheelSequence(target).wheel({deltaX: 1}).repeat(10);
  runAllTimers();
  expect(handler.mock.calls).toHaveLength(2);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'threshold 10');
  });

  handler.mockReset();

  rerender(<WheelGestureUser />);
  await new WheelSequence(target)
    .wheel({deltaX: DEFAULT_THRESHOLD + 1})
    .wheel({deltaX: 1});
  runAllTimers();
  expect(handler.mock.calls).toHaveLength(3);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'no config');
  });
});

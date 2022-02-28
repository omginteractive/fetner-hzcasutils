/** @jsdom-global Object */
/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import {TouchSequence} from 'testutils/EventSequence';
import useTouchGesture, {TouchGestureConfig} from '../useTouchGesture';

const GestureStateMatcher = {
  duration: expect.any(Number),
  elapsed: expect.any(Number),
  time: expect.any(Number),
  timeInitial: expect.any(Number),
};

test('useTouchGesture passes gesture states to a handler', async () => {
  const handler = jest.fn();
  const TouchGestureUser = (): JSX.Element => {
    const ref = useTouchGesture<HTMLDivElement>(handler);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<TouchGestureUser />);
  const target = getByTestId('gesture-target');
  await new TouchSequence(target)
    .start()
    .move({x: 5})
    .move({x: 3, y: 5})
    .end();
  expect(handler.mock.calls).toHaveLength(4);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useTouchGesture uses an existing ref', async () => {
  const handler = jest.fn();
  const TouchGestureUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    useTouchGesture<HTMLDivElement>(ref, handler);
    return <div ref={node => setNode(node)} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<TouchGestureUser />);
  const target = getByTestId('gesture-target');
  await new TouchSequence(target)
    .start()
    .move({x: 3, y: 5})
    .end();
  expect(handler.mock.calls).toHaveLength(3);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useTouchGesture handles changes to handler and ref', async () => {
  // Create two handlers.
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  // Create two refs.
  const ref1 = React.createRef();
  const ref2 = React.createRef();

  const TouchGestureUser = React.forwardRef(
    ({handler}: {handler: jest.Mock}, forwardedRef): JSX.Element => {
      // Use a different ref based on the index prop.
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const ref = forwardedRef as React.MutableRefObject<HTMLDivElement | null>;
      ref.current = node;
      useTouchGesture<HTMLDivElement>(ref, handler);
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
  TouchGestureUser.displayName = 'TouchGestureUser';

  const {getByTestId, rerender} = render(
    <TouchGestureUser handler={handler1} ref={ref1} />,
  );

  const target1 = getByTestId('gesture-target1');
  const target2 = getByTestId('gesture-target2');

  // Test that gesturing on the first target updates the current handler.
  await new TouchSequence(target1).start().end();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new TouchSequence(target2).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  // Switch the ref to the other gesture target.
  rerender(<TouchGestureUser handler={handler1} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new TouchSequence(target1).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new TouchSequence(target2).start().end();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the handler.
  rerender(<TouchGestureUser handler={handler2} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new TouchSequence(target1).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new TouchSequence(target2).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the ref back to the first target.
  rerender(<TouchGestureUser handler={handler2} ref={ref1} />);

  // Test that gesturing on the first target updates the current handler.
  await new TouchSequence(target1).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new TouchSequence(target2).start().end();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);
});

test('useTouchGesture resubscribes on config changes', async () => {
  const handler = jest.fn();
  const TouchGestureUser = ({
    config,
  }: {
    config?: TouchGestureConfig;
  }): JSX.Element => {
    const ref = useTouchGesture<HTMLDivElement>(handler, config);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId, rerender} = render(
    <TouchGestureUser config={{threshold: 20}} />,
  );
  const target = getByTestId('gesture-target');
  await new TouchSequence(target)
    .start()
    .move({x: 11})
    .end();
  expect(handler.mock.calls).toHaveLength(0);

  handler.mockReset();

  rerender(<TouchGestureUser config={{threshold: 10}} />);
  await new TouchSequence(target)
    .start()
    .move({x: 11})
    .end();
  expect(handler.mock.calls).toHaveLength(2);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'threshold 10');
  });

  handler.mockReset();

  rerender(<TouchGestureUser />);
  await new TouchSequence(target)
    .start()
    .move({x: 1})
    .end();
  expect(handler.mock.calls).toHaveLength(3);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'no config');
  });
});

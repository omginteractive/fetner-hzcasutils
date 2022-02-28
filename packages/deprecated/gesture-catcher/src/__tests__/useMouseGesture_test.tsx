/** @jsdom-global Object */
/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import {MouseSequence} from 'testutils/EventSequence';
import useMouseGesture, {MouseGestureConfig} from '../useMouseGesture';

const GestureStateMatcher = {
  duration: expect.any(Number),
  elapsed: expect.any(Number),
  time: expect.any(Number),
  timeInitial: expect.any(Number),
};

test('useMouseGesture passes gesture states to a handler', async () => {
  const handler = jest.fn();
  const MouseGestureUser = (): JSX.Element => {
    const ref = useMouseGesture<HTMLDivElement>(handler);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<MouseGestureUser />);
  const target = getByTestId('gesture-target');
  await new MouseSequence(target)
    .down()
    .move({x: 5})
    .move({x: 3, y: 5})
    .up();
  expect(handler.mock.calls).toHaveLength(4);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useMouseGesture uses an existing ref', async () => {
  const handler = jest.fn();
  const MouseGestureUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    useMouseGesture<HTMLDivElement>(ref, handler);
    return <div ref={node => setNode(node)} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<MouseGestureUser />);
  const target = getByTestId('gesture-target');
  await new MouseSequence(target)
    .down()
    .move({x: 3, y: 5})
    .up();
  expect(handler.mock.calls).toHaveLength(3);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useMouseGesture handles changes to handler and ref', async () => {
  // Create two handlers.
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  // Create two refs.
  const ref1 = React.createRef();
  const ref2 = React.createRef();

  const MouseGestureUser = React.forwardRef(
    ({handler}: {handler: jest.Mock}, forwardedRef): JSX.Element => {
      // Use a different ref based on the index prop.
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const ref = forwardedRef as React.MutableRefObject<HTMLDivElement | null>;
      ref.current = node;
      useMouseGesture<HTMLDivElement>(ref, handler);
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
  MouseGestureUser.displayName = 'MouseGestureUser';

  const {getByTestId, rerender} = render(
    <MouseGestureUser handler={handler1} ref={ref1} />,
  );

  const target1 = getByTestId('gesture-target1');
  const target2 = getByTestId('gesture-target2');

  // Test that gesturing on the first target updates the current handler.
  await new MouseSequence(target1).down().up();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new MouseSequence(target2).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  // Switch the ref to the other gesture target.
  rerender(<MouseGestureUser handler={handler1} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new MouseSequence(target1).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new MouseSequence(target2).down().up();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the handler.
  rerender(<MouseGestureUser handler={handler2} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new MouseSequence(target1).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new MouseSequence(target2).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the ref back to the first target.
  rerender(<MouseGestureUser handler={handler2} ref={ref1} />);

  // Test that gesturing on the first target updates the current handler.
  await new MouseSequence(target1).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new MouseSequence(target2).down().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);
});

test('useMouseGesture resubscribes on config changes', async () => {
  const handler = jest.fn();
  const MouseGestureUser = ({
    config,
  }: {
    config?: MouseGestureConfig;
  }): JSX.Element => {
    const ref = useMouseGesture<HTMLDivElement>(handler, config);
    return <div ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId, rerender} = render(
    <MouseGestureUser config={{threshold: 20}} />,
  );
  const target = getByTestId('gesture-target');
  await new MouseSequence(target)
    .down()
    .move({x: 11})
    .up();
  expect(handler.mock.calls).toHaveLength(0);

  handler.mockReset();

  rerender(<MouseGestureUser config={{threshold: 10}} />);
  await new MouseSequence(target)
    .down()
    .move({x: 11})
    .up();
  expect(handler.mock.calls).toHaveLength(2);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'threshold 10');
  });

  handler.mockReset();

  rerender(<MouseGestureUser />);
  await new MouseSequence(target)
    .down()
    .move({x: 1})
    .up();
  expect(handler.mock.calls).toHaveLength(3);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher, 'no config');
  });
});

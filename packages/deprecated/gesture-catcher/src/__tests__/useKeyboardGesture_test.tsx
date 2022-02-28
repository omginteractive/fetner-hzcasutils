/** @jsdom-global Object */
/* eslint-env jest, browser */
/* eslint-disable jsx-a11y/no-noninteractive-tabindex */
import React from 'react';
import {render} from '@testing-library/react';
import {KeyboardSequence} from 'testutils/EventSequence';
import useKeyboardGesture from '../useKeyboardGesture';

const GestureStateMatcher = {
  duration: expect.any(Number),
  elapsed: expect.any(Number),
  time: expect.any(Number),
  timeInitial: expect.any(Number),
};

test('useKeyboardGesture passes gesture states to a handler', async () => {
  const handler = jest.fn();
  const KeyboardGestureUser = (): JSX.Element => {
    const ref = useKeyboardGesture<HTMLDivElement>(handler);
    return <div tabIndex={0} ref={ref} data-testid="gesture-target" />;
  };
  const {getByTestId} = render(<KeyboardGestureUser />);
  const target = getByTestId('gesture-target');
  await new KeyboardSequence(target)
    .space()
    .repeat()
    .repeat()
    .up();
  expect(handler.mock.calls).toHaveLength(4);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useKeyboardGesture uses an existing ref', async () => {
  const handler = jest.fn();
  const KeyboardGestureUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    useKeyboardGesture<HTMLDivElement>(ref, handler);
    return (
      <div
        tabIndex={0}
        ref={node => setNode(node)}
        data-testid="gesture-target"
      />
    );
  };
  const {getByTestId} = render(<KeyboardGestureUser />);
  const target = getByTestId('gesture-target');
  await new KeyboardSequence(target).arrowDown().up();
  expect(handler.mock.calls).toHaveLength(2);
  handler.mock.calls.forEach(([state]) => {
    expect(state).toMatchSnapshot(GestureStateMatcher);
  });
});

test('useKeyboardGesture handles changes to handler and ref', async () => {
  // Create two handlers.
  const handler1 = jest.fn();
  const handler2 = jest.fn();

  // Create two refs.
  const ref1 = React.createRef();
  const ref2 = React.createRef();

  const KeyboardGestureUser = React.forwardRef(
    ({handler}: {handler: jest.Mock}, forwardedRef): JSX.Element => {
      // Use a different ref based on the index prop.
      const [node, setNode] = React.useState<HTMLDivElement | null>(null);
      const ref = forwardedRef as React.MutableRefObject<HTMLDivElement | null>;
      ref.current = node;
      useKeyboardGesture<HTMLDivElement>(ref, handler);
      return (
        <div>
          <div
            tabIndex={0}
            ref={ref === ref1 ? node => setNode(node) : null}
            data-testid="gesture-target1"
          />
          <div
            tabIndex={0}
            ref={ref === ref2 ? node => setNode(node) : null}
            data-testid="gesture-target2"
          />
        </div>
      );
    },
  );
  KeyboardGestureUser.displayName = 'KeyboardGestureUser';

  const {getByTestId, rerender} = render(
    <KeyboardGestureUser handler={handler1} ref={ref1} />,
  );

  const target1 = getByTestId('gesture-target1');
  const target2 = getByTestId('gesture-target2');

  // Test that gesturing on the first target updates the current handler.
  await new KeyboardSequence(target1).space().up();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new KeyboardSequence(target2).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  // Switch the ref to the other gesture target.
  rerender(<KeyboardGestureUser handler={handler1} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new KeyboardSequence(target1).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new KeyboardSequence(target2).space().up();
  expect(handler1.mock.calls).toHaveLength(2);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the handler.
  rerender(<KeyboardGestureUser handler={handler2} ref={ref2} />);

  // Test that gesturing on the first target
  // does not update the current handler.
  await new KeyboardSequence(target1).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target updates the current handler.
  await new KeyboardSequence(target2).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Switch the ref back to the first target.
  rerender(<KeyboardGestureUser handler={handler2} ref={ref1} />);

  // Test that gesturing on the first target updates the current handler.
  await new KeyboardSequence(target1).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(2);

  handler1.mockReset();
  handler2.mockReset();

  // Test that gesturing on the second target
  // does not update the current handler.
  await new KeyboardSequence(target2).space().up();
  expect(handler1.mock.calls).toHaveLength(0);
  expect(handler2.mock.calls).toHaveLength(0);
});

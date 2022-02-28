/** @jsdom-global Object */
/* eslint-env jest, browser */
import React from 'react';
import {render, act} from '@testing-library/react';
import useSize from '../src';
import 'testutils/MockMutationObserver';

beforeEach(() => {
  jest.useFakeTimers();
});

function runAllTimers(): void {
  act(() => {
    jest.runAllTimers();
  });
}

test('useSize gets the initial size', () => {
  const SizeUser = (): JSX.Element => {
    const [size, ref] = useSize<HTMLDivElement>();
    return (
      <div ref={ref} style={{width: 120, height: 120}} data-testid="size">
        {JSON.stringify(size, null, 2)}
      </div>
    );
  };
  const {getByTestId} = render(<SizeUser />);
  runAllTimers();
  expect(getByTestId('size')).toMatchSnapshot();
});

test('useSize passes the initial size to a handler', () => {
  const handler = jest.fn();
  const SizeUser = (): JSX.Element => {
    const ref = useSize<HTMLDivElement>(handler);
    return <div ref={ref} style={{width: 120, height: 120}} />;
  };
  render(<SizeUser />);
  runAllTimers();
  expect(handler.mock.calls).toMatchSnapshot();
});

test('useSize uses an existing ref', () => {
  const SizeUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    const size = useSize<HTMLDivElement>(ref);
    return (
      <div
        ref={node => setNode(node)}
        style={{width: 120, height: 120}}
        data-testid="size"
      >
        {JSON.stringify(size, null, 2)}
      </div>
    );
  };
  const {getByTestId} = render(<SizeUser />);
  runAllTimers();
  expect(getByTestId('size')).toMatchSnapshot();
});

test('useSize uses an existing ref and a handler', () => {
  const handler = jest.fn();
  const SizeUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef(node);
    ref.current = node;
    useSize<HTMLDivElement>(ref, handler);
    return (
      <div ref={node => setNode(node)} style={{width: 120, height: 120}} />
    );
  };
  render(<SizeUser />);
  runAllTimers();
  expect(handler.mock.calls).toMatchSnapshot();
});

test('useSize resubscribes to changed refs', () => {
  const SizeUser = ({index}: {index: number}): JSX.Element => {
    const [size, ref] = useSize<HTMLDivElement>();
    return (
      <div data-testid="size">
        <div ref={index ? null : ref} style={{width: 1, height: 1}}>
          {index ? 'see below' : JSON.stringify(size, null, 2)}
        </div>
        <div ref={index ? ref : null} style={{width: 2, height: 2}}>
          {index ? JSON.stringify(size, null, 2) : 'see above'}
        </div>
      </div>
    );
  };
  const {getByTestId, rerender} = render(<SizeUser index={0} />);
  runAllTimers();
  expect(getByTestId('size')).toMatchSnapshot();
  rerender(<SizeUser index={1} />);
  runAllTimers();
  expect(getByTestId('size')).toMatchSnapshot();
});

test('useSize works on iframed elements', () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const node = (iframe.contentDocument as Document).createElement('div');
  const SizeUser = (): JSX.Element => {
    const [size, ref] = useSize<HTMLDivElement>();
    return (
      <div ref={ref} style={{width: 120, height: 120}} data-testid="size">
        {JSON.stringify(size, null, 2)}
      </div>
    );
  };
  const {getByTestId} = render(<SizeUser />, {container: node});
  runAllTimers();
  expect(getByTestId('size')).toMatchSnapshot();
});

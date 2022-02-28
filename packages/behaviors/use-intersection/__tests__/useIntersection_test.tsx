/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import useIntersection from '../src';

test('useIntersection gets the initial intersects', async () => {
  let intersects;
  const IntersectionUser = (): JSX.Element => {
    let ref;
    [intersects, ref] = useIntersection<HTMLDivElement>();
    return <div ref={ref} data-testid="intersects" />;
  };
  render(<IntersectionUser />);
  expect(intersects).toBe(false);
});

test('useIntersection uses an existing ref', async () => {
  let intersects;
  const IntersectionUser = (): JSX.Element => {
    const ref = React.useRef(null);
    intersects = useIntersection<HTMLDivElement>(ref);
    return <div ref={ref} data-testid="intersects" />;
  };
  render(<IntersectionUser />);
  expect(intersects).toBe(false);
});

test('useIntersection uses a handler', async () => {
  const cb = jest.fn();
  jest.useFakeTimers();
  const IntersectionUser = (): JSX.Element => {
    const ref = useIntersection<HTMLDivElement>(cb);
    return <div ref={ref} data-testid="intersects" />;
  };
  render(<IntersectionUser />);
  jest.runAllTimers();
  expect(cb).toHaveBeenCalledTimes(1);
  expect(cb.mock.calls[0]).toHaveLength(1);
  expect(cb.mock.calls[0][0]).toMatchSnapshot({
    time: expect.any(Number),
  });
});

test('useIntersection uses an existing ref and a handler', async () => {
  let intersects;
  const cb = jest.fn();
  jest.useFakeTimers();
  const IntersectionUser = (): JSX.Element => {
    const [node, setNode] = React.useState<HTMLDivElement | null>(null);
    const ref = React.useRef<HTMLDivElement | null>(node);
    const setRef = (v: HTMLDivElement | null): void => setNode(v);
    ref.current = node;
    intersects = useIntersection<HTMLDivElement>(ref, cb);
    return <div ref={setRef} data-testid="intersects" />;
  };
  render(<IntersectionUser />);
  jest.runAllTimers();
  expect(intersects).toBeUndefined();
  expect(cb).toHaveBeenCalledTimes(1);
  expect(cb.mock.calls[0]).toHaveLength(1);
  expect(cb.mock.calls[0][0]).toMatchSnapshot({
    time: expect.any(Number),
  });
});

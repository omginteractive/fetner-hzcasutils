/* eslint-env jest, browser */
import {renderHook} from '@testing-library/react-hooks';
import useValueObject from '../src';

type VOWithInit<T, I = T> = T & {
  transform(v: I): T;
};

describe('useValueObject', () => {
  it('returns the first shallowly equal object', () => {
    const {result, rerender} = renderHook(
      (props: {test: string; test2?: string}) => useValueObject(props),
      {initialProps: {test: 'value'}},
    );

    expect(result.current).toMatchObject({test: 'value'});

    let lastResult = result.current;
    rerender({test: 'value'});
    expect(result.current).toBe(lastResult);

    lastResult = result.current;
    rerender({test: 'value', test2: 'value2'});
    expect(result.current).not.toBe(lastResult);
    expect(result.current).toMatchObject({test: 'value', test2: 'value2'});

    lastResult = result.current;
    rerender({test: 'value', test2: 'value2'});
    expect(result.current).toBe(lastResult);
  });

  it('returns a new object when shallow equality breaks', () => {
    const {result, rerender} = renderHook(
      (props: {test: string; test2?: string}) => useValueObject(props),
      {initialProps: {test: 'value'}},
    );

    expect(result.current).toMatchObject({test: 'value'});

    let lastResult = result.current;
    rerender({test: 'value'});
    expect(result.current).toBe(lastResult);

    lastResult = result.current;
    rerender({test: 'value2'});
    expect(result.current).not.toBe(lastResult);
    expect(result.current).toMatchObject({test: 'value2'});

    lastResult = result.current;
    rerender({test: 'value2', test2: 'value'});
    expect(result.current).not.toBe(lastResult);
    expect(result.current).toMatchObject({test: 'value2', test2: 'value'});
  });

  it('returns the first shallowly equal object with transform', () => {
    const {result, rerender} = renderHook(
      ({transform, ...props}: VOWithInit<{test: string; test2?: string}>) =>
        useValueObject(props, transform),
      {initialProps: {test: 'value', transform: v => v}},
    );

    expect(result.current).toMatchObject({test: 'value'});

    let lastResult = result.current;
    rerender({test: 'value', transform: v => ({...v, withTest: 'value'})});
    expect(result.current).not.toBe(lastResult);
    expect(result.current).toMatchObject({test: 'value', withTest: 'value'});

    lastResult = result.current;
    rerender({test: 'value', transform: v => ({...v, withTest: 'value'})});
    expect(result.current).toBe(lastResult);
  });

  it('returns a new object when shallow equality breaks with transform', () => {
    const {result, rerender} = renderHook(
      ({transform, ...props}: VOWithInit<{test: string; test2?: string}>) =>
        useValueObject(props, transform),
      {
        initialProps: {
          test: 'value',
          transform: v => ({...v, withTest: 'value'}),
        },
      },
    );

    expect(result.current).toMatchObject({test: 'value', withTest: 'value'});

    const lastResult = result.current;
    rerender({test: 'value2', transform: v => ({...v, withTest: 'value'})});
    expect(result.current).not.toBe(lastResult);
    expect(result.current).toMatchObject({test: 'value2', withTest: 'value'});
  });

  it('returns the same object when shallow equality holds with transform', () => {
    const {result, rerender} = renderHook(
      ({transform, ...props}): {withTest: string} =>
        useValueObject(props, transform),
      {initialProps: {test: 'value', transform: () => ({withTest: 'value'})}},
    );

    expect(result.current).toMatchObject({withTest: 'value'});

    const lastResult = result.current;
    rerender({test: 'value2', transform: () => ({withTest: 'value'})});
    expect(result.current).toBe(lastResult);
  });
});

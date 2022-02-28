import {useRef, useMemo} from 'react';

type Maybe<T> = T | null | undefined;
type Primitive = Maybe<string | number | boolean | symbol | bigint>;

export type ValueObject<T = Record<string, Primitive>> = {
  [K in keyof T]: T[K] extends Primitive ? T[K] : never;
};

function fingerprintValueObject<T extends ValueObject>(obj: Maybe<T>): string {
  if (obj == null) return JSON.stringify(obj);
  let value = '';
  for (const key of Object.keys(obj).sort()) {
    value = value.length
      ? `${value}::${key}:${JSON.stringify(obj[key])}`
      : `${key}:${JSON.stringify(obj[key])}`;
  }
  return value;
}

/**
 * `equalValueObject` compares two simple objects for shallow equality.
 *
 * The objects are considered equal if they are the strictly equal,
 * or if all values on `a` are strictly equal to all values on `b`,
 * and vice-versa.
 *
 * Note that it expects objects that are composed of simple string keys
 * and primitive values (i.e., no object or array values).
 */
export function equalValueObject<A extends ValueObject, B extends A>(
  a: Maybe<A>,
  b: Maybe<B>,
): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (a === undefined || b === undefined) return false;
  if (Object.keys(a).length !== Object.keys(b).length) return false;
  return fingerprintValueObject(a) === fingerprintValueObject(b);
}

/**
 * `useValueObject` will always return the _first_ object it was called with
 * that is shallowly equal to each consecutive object it is called with.
 *
 * Note that it expects objects that are composed of simple string keys
 * and primitive values (i.e., no object or array values).
 *
 * For example, this is useful for accepting simple configuration objects
 * as props while avoiding recalculating other state or memoized values
 * that are derived from the configuration.
 */
function useValueObject<T extends ValueObject<T>>(value: T): T;
function useValueObject<I extends ValueObject<I>, O extends ValueObject<O>>(
  value: I,
  transform: (v: I) => O,
): O;
function useValueObject<I extends ValueObject<I>, O extends ValueObject<O>>(
  value: I,
  transform?: (v: I) => O,
): typeof transform extends (v: I) => O ? O : I {
  const fingerprintRef = useRef<string>();
  const nextValue = useMemo(
    () => (typeof transform === 'function' ? transform(value) : value),
    [transform, value],
  );
  const valueRef = useRef(nextValue);
  const nextId = fingerprintValueObject(nextValue);
  if (fingerprintRef.current !== nextId) {
    valueRef.current = nextValue;
    fingerprintRef.current = nextId;
  }
  return valueRef.current;
}

export default useValueObject;

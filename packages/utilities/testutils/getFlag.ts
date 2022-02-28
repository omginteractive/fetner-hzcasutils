import getValue from './getValue';

export default function getFlag<T, V>(
  obj: T,
  key: keyof T,
  defaultValue?: V,
): boolean {
  return Boolean(getValue(obj, key, defaultValue));
}

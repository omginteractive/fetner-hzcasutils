function getValue<T, K extends keyof T>(obj: T, key: K): T[K];
function getValue<T, K extends keyof T, V>(
  obj: T,
  key: K,
  defaultValue: V,
): Exclude<T[K], undefined> | V;
function getValue<T, K extends keyof T, V>(
  obj: T,
  key: K,
  defaultValue?: V,
): T[K] | V | undefined {
  const value = obj[key];
  return value === undefined ? defaultValue : value;
}

export default getValue;

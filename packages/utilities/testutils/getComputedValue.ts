/**
 * `getComputedValue` will return a getter for a value
 * from an Element's computed styles.
 */
function getComputedValue<K extends keyof CSSStyleDeclaration>(
  /** The name of the computed style to get, i.e., 'width'. */
  value: K,
): (this: Element) => CSSStyleDeclaration[K];
/**
 * `getComputedValue` will return a getter for a value
 * from an Element's computed styles cast as `Number`.
 */
function getComputedValue<K extends keyof CSSStyleDeclaration>(
  /** The name of the computed style to get, i.e., 'width'. */
  value: K,
  as: typeof Number,
): (this: Element) => number;
/**
 * `getComputedValue` will return a getter for a value
 * from an Element's computed styles cast as `Boolean`.
 */
function getComputedValue<K extends keyof CSSStyleDeclaration>(
  /** The name of the computed style to get, i.e., 'width'. */
  value: K,
  as: typeof Boolean,
): (this: Element) => boolean;
function getComputedValue<
  K extends keyof CSSStyleDeclaration,
  T extends typeof Number | typeof Boolean
>(value: K, as?: T) {
  return function(this: Element) {
    const computed = getComputedStyle(this)[value];
    switch (as) {
      case Number:
        return parseFloat(computed);
      case Boolean:
        return Boolean(computed);
      default:
        return computed;
    }
  };
}

export default getComputedValue;

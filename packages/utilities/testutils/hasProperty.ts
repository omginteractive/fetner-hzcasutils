type FirstArgument<T> = T extends (arg1: infer U) => unknown ? U : unknown;

export default function hasProperty<T extends object>(
  obj: T,
  key: FirstArgument<typeof Object.hasOwnProperty>,
): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

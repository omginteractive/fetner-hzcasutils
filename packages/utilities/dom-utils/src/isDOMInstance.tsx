import getWindow from './getWindow';

export default function isDOMInstance<T extends Node>(
  node: unknown,
  type: Function = Node,
): node is T {
  if (node instanceof type) return true;
  const window = getWindow(node as Node);
  if (window) {
    type = ((window as unknown) as Record<string, Function>)[type.name] || type;
  }
  return node instanceof type;
}

export default function findAncestor(
  node: HTMLElement | null,
  predicate: (node: HTMLElement) => boolean,
): HTMLElement | null {
  while (node) {
    if (predicate(node)) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

import isClient from './isClient';
import isDOMInstance from './isDOMInstance';
import findAncestor from './findAncestor';

/**
 * Get the nearest ancestor element that has overflow set to scroll,
 * or the document element.
 */
export default function getNearestScrollNode(
  node: Node | null,
): HTMLElement | null {
  if (!isClient) return null;
  if (isDOMInstance<Document>(node, Document)) return node.documentElement;
  if (!isDOMInstance<HTMLElement>(node, HTMLElement)) return null;
  const ancestor = findAncestor(node, (node) => {
    const {overflowX, overflowY} = getComputedStyle(node);
    if (overflowX === 'scroll') return true;
    if (overflowY === 'scroll') return true;
    return false;
  });
  return ancestor ?? node.ownerDocument?.documentElement ?? null;
}

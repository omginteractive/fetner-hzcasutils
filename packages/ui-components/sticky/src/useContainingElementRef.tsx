import {useRef, useMemo} from 'react';
import {getContainingElement} from '@hzdg/dom-utils';

function isDescendantOf(
  maybeAncestor: HTMLElement | null,
  node: HTMLElement | null,
): boolean {
  if (!maybeAncestor || !node) return false;
  if (maybeAncestor === node) return false;
  return maybeAncestor.contains(node);
}

/**
 * `useContainingElementRef` is a React hook for finding
 * the containing block element of a DOM node.
 *
 * Returns a `RefObject` pointing the containing block element, or `null`.
 */
export default function useContainingElementRef(
  /** A ref to a DOM Element. */
  ref: React.RefObject<HTMLElement>,
  scrollNodeRef: React.RefObject<HTMLElement>,
): React.RefObject<HTMLElement> {
  const {current} = ref;
  const {current: scrollNode} = scrollNodeRef;
  const containingElementRef = useRef<HTMLElement | null>(null);
  containingElementRef.current = useMemo(() => {
    const candidate = getContainingElement(current);
    if (isDescendantOf(scrollNode, candidate)) {
      return candidate;
    }
    return null;
  }, [current, scrollNode]);
  return containingElementRef;
}

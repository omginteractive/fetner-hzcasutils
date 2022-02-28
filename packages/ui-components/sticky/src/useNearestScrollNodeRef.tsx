import {useRef} from 'react';
import {useNearestScrollNodeRef as _useNearestScrollNodeRef} from '@hzdg/scroll-monitor';
/**
 * `useNearestScrollNodeRef` is a React hook for finding
 * the nearest scrollable element to a DOM node.
 *
 * Returns a `RefObject` pointing to the nearest scrollable element, or `null`.
 */
export default function useNearestScrollNodeRef(
  ref: React.RefObject<HTMLElement>,
): React.RefObject<HTMLElement> {
  const {current} = _useNearestScrollNodeRef(ref);
  const scrollNodeRef = useRef<HTMLElement | null>(null);
  if (current && 'documentElement' in current) {
    scrollNodeRef.current = current.documentElement;
  } else {
    scrollNodeRef.current = current;
  }
  return scrollNodeRef;
}

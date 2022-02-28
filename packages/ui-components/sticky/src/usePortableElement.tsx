import {useRef} from 'react';

/**
 * `usePortableElement` will return a DOM element
 * created from the sticky portal element's owner document.
 *
 * Sticky content can then be portaled into this element
 * instead of being rendered inline so that we can 'reparent'
 * the sticky content without losing its local state.
 */
export default function usePortableElement(
  portalRef: React.RefObject<HTMLElement>,
): HTMLDivElement | null {
  const lastPortalRef = useRef(portalRef.current);
  const el = useRef<HTMLDivElement | null>(null);
  if (portalRef.current) {
    if (!el.current || portalRef.current != lastPortalRef.current) {
      el.current =
        portalRef.current.ownerDocument?.createElement('div') || null;
    }
  }
  lastPortalRef.current = portalRef.current;
  return el.current;
}

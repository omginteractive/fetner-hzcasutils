import {useEffect, useRef} from 'react';
import useRefCallback from '@hzdg/use-ref-callback';
/**
 * `useAppendChild` will append the given element as a child
 * of the element referenced by the returned ref callback.
 *
 * @param {HTMLElement} el - An element to append as a child of the ref element.
 * @returns {Function} A callback ref that accepts a div element.
 *          The provided `el` will be appended as a child
 *          of the div received by the callback.
 */
export default function useAppendChild(
  el: HTMLElement | null,
): (node: HTMLDivElement | null) => void {
  const [ref, setRef] = useRefCallback<HTMLDivElement>(null);
  const mounted = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (ref.current && mounted.current !== el) {
      mounted.current = el;
      if (el) ref.current.appendChild(el);
    }
  });
  useEffect(
    () => () => {
      if (ref.current && mounted.current) {
        ref.current.removeChild(mounted.current);
        mounted.current = null;
      }
    },
    [ref, el],
  );
  return setRef;
}

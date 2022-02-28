import React, {useEffect, useCallback, useRef} from 'react';
import useForceUpdate from './useForceUpdate';

/**
 * A simple wrapper for managing bindings
 * to a provided providedRef object's current value.
 */
interface RefStore<T> {
  /** Updates the wrapped providedRef's current value and notify listeners. */
  setRef: (node: T | null) => void;
  /** Add a listener for changes to the wrapped providedRef's current value.  */
  addListener: (listener: () => void) => void;
  /** Remove a listener for changes to the wrapped providedRef's current value. */
  removeListener: (listener: () => void) => void;
  /** Whether or not this providedRef store currently has any change listeners. */
  hasListeners: () => boolean;
}

/** A map of 'key' ref objects to ref stores. */
const refStoreMap = new Map();

/** A map of refs to 'key' ref objects */
const keyRefMap = new Map();

/**
 * Creates a new `RefStore` for a `providedRef`.
 */
function createProvidedRefStore<T>(providedRef?: React.Ref<T>): RefStore<T> {
  const listeners = new Set<() => void>();
  return {
    setRef(node) {
      if (providedRef) {
        if (typeof providedRef === 'function') {
          providedRef(node);
        } else if ('current' in providedRef) {
          (providedRef as React.MutableRefObject<T | null>).current = node;
        }
      }
      listeners.forEach(listener => listener());
    },
    addListener(listener) {
      if (!listeners.has(listener)) {
        listeners.add(listener);
      }
    },
    removeListener(listener) {
      if (listeners.has(listener)) {
        listeners.delete(listener);
      }
    },
    hasListeners() {
      return listeners.size > 0;
    },
  };
}

/**
 * `usePortalRef` will bind a component to changes
 * in the returned portal ref's current value.
 *
 * If the `providedRef` is a ref object, it will be used as the portal ref.
 *
 * Otherwise, if the `providedRef` is nullish, a new portal ref object
 * will be returned.
 *
 * Finally, if the `providedRef` is a function,
 * it will be syncrhonized with the latest value of the returned
 * portal ref object. Furthermore, the portal ref object will be
 * the same ref object for the same function.
 *
 * Returns a tuple containing a portal ref object and a callback
 * to update the portal ref's current value. When called, any users
 * of the same portal ref will be rerendered with the new current value.
 */
export default function usePortalRef<T extends HTMLElement>(
  providedRef?: React.Ref<T>,
): [React.RefObject<T>, ((node: T | null) => void)] {
  // Create a default 'key' ref for when `providedRef` is nullish.
  let ref = useRef<T | null>(null);

  // If `providedRef` is defined, use an existing `key` ref if possible.
  if (providedRef) {
    if (`current` in providedRef) {
      // Use the `providedRef` as our 'key' ref if it is a ref object.
      ref = providedRef;
    } else {
      const keyRef = keyRefMap.get(providedRef);
      if (keyRef) {
        // If an existing 'key' ref exists for the `providedRef`,
        // use it as our 'key' ref instead.
        ref = keyRef;
      } else {
        // Map the `providedRef` to our default 'key' ref so
        // additional calls with the same `providedRef`
        // will get the same 'key' ref back.
        keyRefMap.set(providedRef, ref);
      }
    }
  }

  // Get or a create the `RefStore` for our 'key' ref.
  let refStore: RefStore<T> = refStoreMap.get(ref);
  if (!refStore) {
    refStore = createProvidedRefStore(providedRef);
    refStoreMap.set(ref, refStore);
  }

  // Create a `forceUpdate` listener so that the user
  // of this `providedRef` can be rerendered when the
  // `providedRef` value is set.
  const listener = useForceUpdate();
  refStore.addListener(listener);

  // Cleanup the `RefStore` when
  // the`ref` changes, and on unmount.
  const cleanup = useCallback(() => {
    refStore.removeListener(listener);
    if (!refStore.hasListeners()) {
      refStoreMap.delete(ref);
    }
  }, [ref, refStore, listener]);

  useEffect(() => cleanup, [cleanup]);

  // Create a setter that will sync the `providedRef`
  // and 'key' ref values and notify listeners when called.
  const setRef = useCallback(
    function setRef(node: T | null) {
      ref.current = node;
      refStore.setRef(node);
    },
    [ref, refStore],
  );

  return [ref, setRef];
}

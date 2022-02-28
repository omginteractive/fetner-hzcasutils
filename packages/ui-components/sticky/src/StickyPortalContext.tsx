import React, {createContext, useContext, useMemo} from 'react';
import {useStickyPortalStore, StickyPortalStore} from './StickyPortalStore';
import usePortalRef from './usePortalRef';

type StickyPortalContextProviderProps = React.PropsWithChildren<{
  portalRef: React.RefObject<HTMLElement>;
}>;

export interface StickyPortalContextValue {
  portalRef: React.RefObject<HTMLElement>;
  store?: StickyPortalStore;
}

const StickyPortalContext = createContext<StickyPortalContextValue | undefined>(
  undefined,
);

const portalContextMap = new Map<
  React.Ref<HTMLElement>,
  StickyPortalContextValue
>();

export function useStickyPortalContext(
  providedRef?: React.Ref<HTMLElement>,
): StickyPortalContextValue {
  // Use the nearest sticky portal context by default.
  const nearestContext = useContext(StickyPortalContext);
  // Use a portal ref for the `providedRef` if defined,
  // or from the nearest context, if it exists,
  // or create a new one.
  const [portalRef] = usePortalRef(
    providedRef || (nearestContext && nearestContext.portalRef),
  );
  // Get or create a context for the `providedRef` if defined,
  // or use the nearest context, if it exists,
  // or create a new context.
  if (providedRef || !nearestContext) {
    // Try to get the existing context for the `portalRef`.
    return portalContextMap.get(portalRef) || {portalRef};
  } else {
    return nearestContext;
  }
}

export function StickyPortalContextProvider({
  portalRef,
  children,
}: StickyPortalContextProviderProps): JSX.Element {
  // Get or create the state store for this sticky portal ref.
  const store = useStickyPortalStore(portalRef);
  // Create the context value for this portal.
  const stickyContextValue = useMemo((): StickyPortalContextValue => {
    const context = {portalRef, store};
    portalContextMap.set(portalRef, context);
    return context;
  }, [portalRef, store]);
  return (
    <StickyPortalContext.Provider value={stickyContextValue}>
      {children}
    </StickyPortalContext.Provider>
  );
}

import React from 'react';
import ReactDOM from 'react-dom';
import {StickyContextProvider} from './StickyContext';
import {useStickyPortalContext} from './StickyPortalContext';

export interface FixedProps {
  /**
   * Optional portal ref to use.
   * Useful when there are multiple sticky portals present.
   */
  portalRef?: React.Ref<HTMLDivElement>;
  /**
   * Whether or not `Fixed` content is focusable.
   * If `false`, the content won't receive pointer events or focus.
   */
  focusable?: boolean;
  children?: React.ReactNode;
}

interface FixedContentContainerProps extends React.HTMLProps<HTMLDivElement> {
  focusable?: boolean;
}

function FixedContentContainer({
  focusable,
  children,
  style,
  ...rest
}: FixedContentContainerProps): JSX.Element {
  return (
    <div
      {...rest}
      style={{
        pointerEvents: focusable ? 'auto' : 'none',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 *
 * `Fixed` is a component that will transport its children
 * into the corresponding `StickyPortal`.
 */
export default function Fixed({
  children,
  focusable = true,
  portalRef: providedRef,
  ...rest
}: FixedProps): JSX.Element {
  /**
   * Use the portal context for the provided portal ref,
   * falling back to the nearest provided portal context.
   */
  const {portalRef} = useStickyPortalContext(providedRef);
  return (
    <StickyContextProvider value={true}>
      {portalRef.current
        ? ReactDOM.createPortal(
            <FixedContentContainer focusable={focusable} {...rest}>
              {children}
            </FixedContentContainer>,
            portalRef.current,
          )
        : null}
    </StickyContextProvider>
  );
}

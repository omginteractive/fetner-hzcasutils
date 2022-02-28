import React, {forwardRef} from 'react';
import {StickyPortalContextProvider} from './StickyPortalContext';
import usePortalRef from './usePortalRef';

export interface StickyPortalProps extends React.HTMLProps<HTMLDivElement> {
  /**
   * An optional ref for this portal.
   * Useful when there are multiple sticky portals present.
   */
  ref?: React.RefObject<HTMLDivElement>;
  /**
   * Optional children to render 'beneath' the portal content.
   */
  children?: React.ReactNode;
}

type StickyPortalLayoutProps = React.HTMLProps<HTMLDivElement>;

const StickyPortalLayout = forwardRef<HTMLDivElement, StickyPortalLayoutProps>(
  ({style, children, ...rest}: StickyPortalLayoutProps, forwardedRef) => (
    <div
      {...rest}
      ref={forwardedRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        pointerEvents: 'none',
        ...style,
      }}
    >
      {children}
    </div>
  ),
);
StickyPortalLayout.displayName = 'StickyPortalLayout';

/**
 * `StickyPortal` will render a Portal with a 'fixed' position
 * and a flex layout for managing multiple sticky or fixed elements.
 *
 * It is used with corresponding `Sticky` and `Fixed` components to
 * emulate 'sticky' and 'fixed' position behavior.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/position
 * @see https://caniuse.com/#search=sticky
 */
const StickyPortal = React.forwardRef(function StickyPortal(
  {children, ...rest}: StickyPortalProps,
  providedRef?: React.Ref<HTMLDivElement>,
): JSX.Element {
  const [portalRef, setPortalRef] = usePortalRef(providedRef);
  return (
    <StickyPortalContextProvider portalRef={portalRef}>
      {children}
      <StickyPortalLayout ref={setPortalRef} {...rest} />
    </StickyPortalContextProvider>
  );
});
StickyPortal.displayName = 'StickyPortal';

export default StickyPortal;

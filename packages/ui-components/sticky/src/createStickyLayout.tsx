import React from 'react';
import Fixed, {FixedProps} from './Fixed';
import Sticky, {StickyProps} from './Sticky';
import StickyPortal, {StickyPortalProps} from './StickyPortal';

export interface StickyLayoutContext {
  Portal: React.FC<StickyPortalProps>;
  Sticky: React.FC<StickyProps>;
  Fixed: React.FC<FixedProps>;
}

export default function createStickyLayout(
  label = 'StickyLayout',
): StickyLayoutContext {
  const stickyLayoutRef = React.createRef<HTMLDivElement>();
  if (!label) label = 'StickyLayout';

  function BoundFixed(props: Omit<FixedProps, 'portalRef'>): JSX.Element {
    return <Fixed {...props} portalRef={stickyLayoutRef} />;
  }
  BoundFixed.displayName = `${label}.Fixed`;

  function BoundPortal(props: Omit<StickyPortalProps, 'ref'>): JSX.Element {
    return <StickyPortal {...props} ref={stickyLayoutRef} />;
  }
  BoundPortal.displayName = `${label}.Portal`;

  function BoundSticky(props: Omit<StickyProps, 'portalRef'>): JSX.Element {
    return <Sticky {...props} portalRef={stickyLayoutRef} />;
  }
  BoundSticky.displayName = `${label}.Sticky`;

  return {
    /**
     *
     */
    Fixed: BoundFixed,
    Portal: BoundPortal,
    Sticky: BoundSticky,
  };
}

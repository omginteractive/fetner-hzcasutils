import React, {forwardRef, useCallback, useRef, useEffect} from 'react';
import ReactDOM from 'react-dom';
import useSize, {Size} from '@hzdg/use-size';
import useRefCallback from '@hzdg/use-ref-callback';
import {useScrollPosition} from '@hzdg/scroll-monitor';
import {StickyContextProvider} from './StickyContext';
import {useStickyPortalContext} from './StickyPortalContext';
import {INVALIDATE, VALIDATE} from './StickyPortalStore';
import {
  useStickyStore,
  UPDATE_CONTENT_NODE,
  UPDATE_INTERSECTION_NODE,
  UPDATE_SCROLL_NODE,
  UPDATE_CONTAINING_NODE,
  StickyActionType,
} from './StickyStore';
import useAppendChild from './useAppendChild';
import useContainingElementRef from './useContainingElementRef';
import useNearestScrollNodeRef from './useNearestScrollNodeRef';
import usePortableElement from './usePortableElement';

export interface StickyProps extends React.HTMLProps<HTMLDivElement> {
  /**
   * Optional portal ref to use.
   * Useful when there are multiple sticky portals present.
   */
  portalRef?: React.Ref<HTMLDivElement>;
  /**
   * Whether or not `Sticky` content is focusable.
   * If `false`, the content won't receive pointer events or focus.
   */
  focusable?: boolean;
  /**
   * Whether or not `Sticky` content is currently stuck.
   * If not a `boolean`, intersection with the containing block
   * will be used to toggle stickiness automatically.
   */
  stuck?: boolean | null;
  /**
   * Whether or not the `Sticky` children might ever unstick.
   * If `true`, then space will be 'saved' in the containing element
   * to avoid content shifting when transitioning between stuck and unstuck.
   *
   * If `stuck` is not a boolean, `willUnstick` has no effect
   * (space will automatically be 'saved' when stickiness is
   * also automatic).
   */
  willUnstick?: boolean;
  children?: React.ReactNode;
}

interface StickyContentContainerProps extends React.HTMLProps<HTMLDivElement> {
  bottomRelative?: boolean;
  focusable?: boolean;
}

/**
 * `StickyContentContainer` will render its children in a `div`
 * container that may or may not be `bottomRelative` and also
 * may or may not be `focusable`.
 *
 * When it is `bottomRelative`, it will be positioned absolutely
 * at the bottom left of it's containing element.
 *
 * When it is _not_ `focusable`, pointer events will be disabled
 * for its children.
 */
const StickyContentContainer = forwardRef<
  HTMLDivElement,
  StickyContentContainerProps
>(
  (
    {
      bottomRelative,
      focusable,
      children,
      style,
      ...rest
    }: StickyContentContainerProps,
    forwardedRef,
  ): JSX.Element => (
    <div
      {...rest}
      ref={forwardedRef}
      style={{
        pointerEvents: focusable ? 'auto' : 'none',
        position: bottomRelative ? 'absolute' : 'static',
        bottom: bottomRelative ? '0px' : 'auto',
        left: bottomRelative ? '0px' : 'auto',
        ...style,
      }}
    >
      {children}
    </div>
  ),
);
StickyContentContainer.displayName = 'StickyContentContainer';

/**
 * `IntersectionDetector` will render an empty `div` that is hidden
 * from display.
 *
 * It is used as a marker for intersection between it,
 * and an associated `StickyPortal` element.
 */
const IntersectionDetector = forwardRef<HTMLDivElement>(
  (_, forwardedRef): JSX.Element => (
    <div
      ref={forwardedRef}
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        visibility: 'hidden',
      }}
    />
  ),
);
IntersectionDetector.displayName = 'IntersectionDetector';

/**
 * `SpaceSaver` will render a `div` that takes on the provided `size`.
 *
 * It is used to 'preserve' space in a containing element when
 * the content that would normally be in that space has been
 * rendered to an associated `StickyPortal`.
 */
function SpaceSaver({size}: {size: Size | null}): JSX.Element {
  return (
    <div
      aria-hidden="true"
      style={{
        pointerEvents: 'none',
        visibility: 'hidden',
        width: size ? `${size.width}px` : 'auto',
        height: size ? `${size.height}px` : 'auto',
      }}
    />
  );
}

/**
 * `Unstuck` will render a `div` and append
 * the provided `el` element as a child of it.
 */
function Unstuck({el}: {el: HTMLElement | null}): JSX.Element {
  const ref = useAppendChild(el);
  return <div ref={ref} />;
}

/**
 * `Stuck` will append the provided `el` element as a child
 * of the element referenced by the given `portalRef`.
 */
function Stuck({
  el,
  portalRef,
}: {
  el: HTMLElement | null;
  portalRef: React.RefObject<HTMLElement>;
}): JSX.Element | null {
  const ref = useAppendChild(el);
  if (!portalRef.current) return null;
  return ReactDOM.createPortal(<div ref={ref} />, portalRef.current);
}

/**
 * `useSizeChange` will call the given `dispatch` function whenever
 * the size of the given `ref` element changes.
 *
 * The `dispatch` function should accept the `ref`
 * and the `actionType` as its only arguments
 *
 * Returns a ref that contains the current size.
 */
function useSizeChange<
  R extends React.RefObject<HTMLElement>,
  A extends string
>(
  ref: R,
  actionType: A,
  dispatch: (ref: R, actionType: A) => void,
): React.RefObject<Size> {
  const size = useRef<Size | null>(null);
  useSize(
    ref,
    useCallback(
      value => {
        size.current = value;
        dispatch(ref, actionType);
      },
      [ref, dispatch, actionType, size],
    ),
  );
  return size;
}

/**
 * `Sticky` is a component that will transport its children
 * into the corresponding `StickyPortal`. If the `stuck` prop is not
 * a `boolean`, changes in intersection with the containing block
 * for `Sticky` will be used to toggle stickiness automatically.
 */
export default function Sticky({
  children,
  stuck,
  willUnstick,
  focusable = true,
  portalRef: providedRef,
  ...rest
}: StickyProps): JSX.Element {
  /**
   * Use the portal context for the provided portal ref,
   * falling back to the nearest provided portal context.
   */
  const {portalRef} = useStickyPortalContext(providedRef);
  /**
   * An element to portal sticky content into.
   * We use a portal so that we can 'reparent'
   * the sticky content without losing its local state.
   */
  const el = usePortableElement(portalRef);
  /**
   * A ref to the element embedded in the Sticky content
   * that is used to detect intersection with the scrolling element.
   */
  const [intersectionRef, setIntersectionRef] = useRefCallback<HTMLDivElement>(
    null,
  );
  /** A ref to the content being rendered in Sticky. */
  const [contentRef, setContentRef] = useRefCallback<HTMLDivElement>(null);
  /** Use the state store for this intersection ref and portal ref. */
  const [state, dispatch] = useStickyStore(intersectionRef, portalRef, stuck);
  /**
   * Whether or not sticky behavior should be disabled.
   * It should be disabled if the sticky state
   * is controlled via the `stuck` prop.
   */
  const controlled = useRef<boolean>(typeof stuck === 'boolean');
  controlled.current = typeof stuck === 'boolean';
  /**
   * Whether or not the element should be rendered as stuck.
   * The `stuck` prop takes precedence over the current behavior state.
   */
  const shouldStick = controlled.current ? Boolean(stuck) : state.shouldStick;
  useEffect(() => {
    if (controlled.current && state.shouldStick !== stuck) {
      dispatch({type: INVALIDATE});
    }
  });
  /**
   * Whether or not a spot should be saved for the content
   * in its containing element whenever it becomes stuck.
   * We only want to save a spot if sticky state is _not_ controlled
   * by the `stuck` prop, _or_ if the `willUnstick` prop is truthy.
   */
  const shouldSaveSpot = willUnstick || !controlled.current;
  /** A ref to the nearest scrolling ancestor node. */
  const scrollNodeRef = useNearestScrollNodeRef(intersectionRef);
  /** A ref to the nearest positioned ancestor node. */
  const containingNodeRef = useContainingElementRef(
    intersectionRef,
    scrollNodeRef,
  );

  /**
   * `dispatchStickyAction` will dispatch an action of the given `actionType`
   * with the current value of the given `ref` as the element payload.
   */
  const dispatchStickyAction = useCallback(
    (ref: React.RefObject<HTMLElement>, actionType: StickyActionType) => {
      if (ref.current) {
        dispatch({
          type: actionType,
          element: ref.current,
          key: intersectionRef,
        });
      }
    },
    [dispatch, intersectionRef],
  );

  /** Use changes in size to dispatch updates to the intersection node */
  useSizeChange(
    intersectionRef,
    UPDATE_INTERSECTION_NODE,
    dispatchStickyAction,
  );
  /** Use changes in size to dispatch updates to the scroll node */
  useSizeChange(scrollNodeRef, UPDATE_SCROLL_NODE, dispatchStickyAction);
  /** Use changes in size to dispatch updates to the containing node */
  useSizeChange(
    containingNodeRef,
    UPDATE_CONTAINING_NODE,
    dispatchStickyAction,
  );
  /**
   * Keep track of the latest size of the content and use changes in size
   * to dispatch updates to the content node.
   */
  const contentRect = useSizeChange(
    contentRef,
    UPDATE_CONTENT_NODE,
    dispatchStickyAction,
  );

  /** Invalidate store state when scroll position changes. */
  const dispatchPositionChange = useCallback(() => {
    if (!controlled.current) {
      dispatch({type: VALIDATE});
    }
  }, [dispatch, controlled]);
  useScrollPosition(intersectionRef, dispatchPositionChange);

  const content = (
    <StickyContentContainer
      {...rest}
      bottomRelative={shouldStick === 'bottom'}
      focusable={focusable}
      ref={setContentRef}
    >
      {children}
    </StickyContentContainer>
  );

  /**
   * We render a `StickyContextProvider` that provides the
   * `shouldStick` state to any consumers (`useStickyState`).
   *
   * Within that provider, we render:
   * - An `IntersectionDetector`
   * - A `SpaceSaver`, if necessary.
   * - A `Stuck` or `Unstuck` wrapper for the sticky `el`.
   * - A `StickyContentContainer` (through a portal into the `el`).
   */
  return (
    <StickyContextProvider value={shouldStick}>
      <IntersectionDetector ref={setIntersectionRef} />
      {shouldSaveSpot && (
        <SpaceSaver size={shouldStick ? contentRect.current : null} />
      )}
      {shouldStick === true ? (
        <Stuck el={el} portalRef={portalRef} />
      ) : (
        <Unstuck el={el} />
      )}
      {el ? ReactDOM.createPortal(content, el) : shouldStick ? null : content}
    </StickyContextProvider>
  );
}

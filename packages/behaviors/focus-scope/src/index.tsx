import React, {
  useEffect,
  useRef,
  useCallback,
  createContext,
  useState,
  useContext,
  useLayoutEffect,
  useMemo,
} from 'react';
import warning from 'tiny-warning';
import useKeyPress, {KeyPressState} from '@hzdg/use-key-press';
import {getDocument} from '@hzdg/dom-utils';
import useRefCallback from '@hzdg/use-ref-callback';
import FocusTreeNode, {isTabbable} from './FocusTreeNode';
import FocusManager from './FocusManager';

export {default as FocusManager} from './FocusManager';

type PropsOf<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  E extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>
> = JSX.LibraryManagedAttributes<E, React.ComponentPropsWithRef<E>>;

interface FocusScopeConfig<T extends React.ElementType = React.ElementType> {
  /**
   * An optional string to identify the `FocusManager` for this `FocusScope`.
   *
   * Note that ids must be unique per focus tree.
   */
  id?: string | null;
  /**
   * The React element type to render. Defaults to `'span'`.
   * If the provided value is not a react-dom component,
   * it should forward the provided ref to an underlying
   * component.
   * See https://reactjs.org/docs/forwarding-refs.html
   */
  as?: T;
  /**
   * Whether or not to 'trap' focus within this `FocusScope`.
   *
   * If `true`, then once focus is within this scope, it will be retained,
   * even when a blur occurs. Additionally, changing focus (i.e.,
   * via tab key press) will cycle through the focusable elements
   * within this scope.
   *
   * Defaults to `false`.
   */
  trap?: boolean;
  /**
   * Whether or not to focus on the first focusable element
   * in this scope when this `FocusScope` mounts.
   *
   * If this is toggled to `true` after mount, it will have no effect.
   *
   * Defaults to `false`.
   */
  autoFocus?: boolean;
  /**
   * Whether or not to restore focus to the previously focused element
   * when this `FocusScope` unmounts.
   *
   * Defaults to `false`.
   */
  restoreFocus?: boolean;
  /**
   * Optional handler for when focus enters this scope.
   *
   * Receives the `FocusEvent` and the associated `FocusManager`.
   */
  onFocus?: (
    event: FocusEvent,
    /**
     * A `FocusManager` instance for the enclosing `FocusScope`.
     * Useful for manually updating state in response to the event.
     */
    focusManager: FocusManager,
  ) => void;
  /**
   * Optional handler for when focus leaves this scope.
   *
   * Receives the `FocusEvent` and the associated `FocusManager`.
   */
  onBlur?: (
    event: FocusEvent,
    /**
     * A `FocusManager` instance for the enclosing `FocusScope`.
     * Useful for manually updating state in response to the event.
     */
    focusManager: FocusManager,
  ) => void;
  /**
   * Optional handler for when _any_ keypress occurs within scope.
   *
   * Receives the `KeyboardEvent` and the associated `FocusManager`.
   */
  onKeyPress?: (
    event: KeyboardEvent,
    /**
     * A `FocusManager` instance for the enclosing `FocusScope`.
     * Useful for manually updating state in response to the event.
     */
    focusManager: FocusManager,
  ) => void;
}

type FocusScopeRenderProp<T extends Element = Element> = (params: {
  ref: (node: T) => void;
  focusManager: FocusManager;
}) => JSX.Element;

export type FocusScopeContainerProps<
  T extends React.ElementType
> = React.PropsWithChildren<
  FocusScopeConfig<T> & Omit<PropsOf<T>, keyof FocusScopeConfig<T>>
>;

export interface FocusScopeHeadlessProps<C extends FocusScopeRenderProp>
  extends Pick<FocusScopeConfig, 'id' | 'restoreFocus' | 'autoFocus'> {
  children: C;
}

export type FocusScopeProps<
  T extends React.ElementType = 'span',
  C extends FocusScopeRenderProp | React.ReactNode | undefined = undefined
> = C extends FocusScopeRenderProp
  ? FocusScopeHeadlessProps<C>
  : FocusScopeContainerProps<T>;

interface UseFocusScopeBehaviorConfig
  extends Pick<FocusScopeConfig, 'trap' | 'onFocus' | 'onBlur'> {
  /**
   * The `FocusTreeNode` instance to use when updating focus state
   * or reacting to focus changes.
   */
  focusTreeNode: FocusTreeNode;
}

interface UseTabKeyDownHandlerConfig extends Pick<FocusScopeConfig, 'trap'> {
  /** The `FocusTreeNode` instance to use when updating focus state. */
  focusTreeNode: FocusTreeNode;
}

/** Whether or not the given `children` value is a `FocusScopeRendeProp` */
const isRenderProp = (children: unknown): children is FocusScopeRenderProp =>
  typeof children === 'function';

/** The context via which a `FocusTreeNode` tree is constructed. */
const FocusTreeContext = createContext<FocusTreeNode | null>(null);

/** Run the given callback on mount. */
function useInitialLayoutEffect(callback: () => void): void {
  useLayoutEffect(callback, []);
}

/** Run the given callback on unmount. */
function useUnmountEffect(callback: () => void): void {
  const unmountHandler = useRef(callback);
  unmountHandler.current = callback;
  useLayoutEffect(
    () => () => {
      if (typeof unmountHandler.current === 'function') {
        unmountHandler.current();
      }
    },
    [],
  );
}

/**
 * `useFocusScopeBehavior` will handle changes to focus state that occur
 * within the scope of the given `FocusTreeNode` instance.
 *
 * It may also update focus state within scope. For example, when `trap`
 * is `true`, it may refocus elements in scope when they blur.
 */
function useFocusScopeBehavior({
  focusTreeNode,
  trap,
  onFocus,
  onBlur,
}: UseFocusScopeBehaviorConfig): React.MutableRefObject<Element | null> {
  const focusedElementInScope = useRef<Element | null>(null);
  const handleFocus = useRef(onFocus);
  const handleBlur = useRef(onBlur);
  handleFocus.current = onFocus;
  handleBlur.current = onBlur;
  const handler = useCallback(
    function handleFocusEvent(event: FocusEvent) {
      const target = event.target as HTMLElement;
      const inScope = focusTreeNode.containsFocusableElement(target);
      const inScopeDeep =
        inScope || focusTreeNode.containsFocusableElement(target, true);
      const focusHandler = handleFocus.current;
      const blurHandler = handleBlur.current;
      // Call onFocus or onBlur handlers if necessary.
      if (
        typeof focusHandler === 'function' &&
        focusedElementInScope.current === null &&
        inScope
      ) {
        focusHandler(event, new FocusManager(focusTreeNode));
      } else if (
        typeof blurHandler === 'function' &&
        focusedElementInScope.current !== null &&
        !inScope &&
        !trap
      ) {
        blurHandler(event, new FocusManager(focusTreeNode));
      }

      // If the default behavior of the event has been prevented, do nothing.
      if (event.defaultPrevented) return;

      // Handle global focus containment
      if (trap) {
        if (inScopeDeep) {
          // If the target is in scope, do nothing.
          focusedElementInScope.current = inScope ? target : null;
          return;
        } else if (focusedElementInScope.current !== null) {
          // If we previously had a focused element in scope, refocus it.
          focusTreeNode.focus(focusedElementInScope.current);
        } else {
          // Otherwise, trap focus on the first element in scope.
          focusTreeNode.focusFirst();
        }
      } else {
        focusedElementInScope.current = inScope ? target : null;
      }
    },
    [focusTreeNode, focusedElementInScope, trap, handleFocus, handleBlur],
  );

  useEffect(() => {
    const subscription = focusTreeNode.subscribe(handler);
    return () => {
      subscription.unsubscribe();
    };
  }, [focusTreeNode, handler]);

  return focusedElementInScope;
}

/**
 * `useTabKeyDownHandler` will handle Tab `'keydown'` events
 * when they might effect focus state within scope of the `FocusTreeNode`.
 *
 * If `trap` is `true`, it will cycle focus through the focusable elements
 * within the given `FocusTreeNode` scope, effectively preventing focus
 * from leaving this scope.
 */
function useTabKeyHandler({
  focusTreeNode,
  trap,
}: UseTabKeyDownHandlerConfig): (state: KeyPressState) => void {
  return useCallback(
    function handleTabKey({altKey, ctrlKey, metaKey, shiftKey, event}) {
      // Skip if the default event behavior has been prevented.
      if (event?.defaultPrevented) return;
      // Skip if any of these keys are being pressed
      if (altKey || ctrlKey || metaKey) return;

      const focusedElement = focusTreeNode.getFocusedElement();

      // Don't handle if focus isn't currently in this scope.
      if (!focusedElement) {
        return;
      }

      let nextElement: Element | FocusTreeNode | null = null;

      // If the shift key is being held, focus moves in reverse order.
      if (shiftKey) {
        // First, try to focus on the previous tabbable element.
        nextElement = focusTreeNode.focusPrevious(isTabbable);
        if (trap && !nextElement) {
          // If that didn't work cuz there is no previous element,
          // but this FocusScope traps focus,
          // try to wrap around to the last tabbable element.
          nextElement = focusTreeNode.focusLast(isTabbable);
        }
      } else {
        // First, try to focus on the next tabbable element.
        nextElement = focusTreeNode.focusNext(isTabbable);
        if (trap && !nextElement) {
          // If that didn't work cuz there is no next element,
          // but this FocusScope traps focus,
          // try to wrap around to the first tabbable element.
          nextElement = focusTreeNode.focusFirst(isTabbable);
        }
      }

      if (
        nextElement &&
        focusTreeNode.containsFocusableElement(nextElement, true)
      ) {
        // If the newly focused element is in scope,
        // prevent default tab behavior.
        event?.preventDefault();
      }
    },
    [focusTreeNode, trap],
  );
}

/**
 * Create a new `FocusTreeNode` and try and parent it right away.
 * If it fails, we may be 'reparenting' an existing node,
 * so create an orphan node initially. We will need to try to parent
 * the orphan as a layout effect.
 */
const createFocusTreeNode = (
  domTarget: Element | null,
  id?: string | null,
  parent?: FocusTreeNode | null,
  shouldThrow = false,
): FocusTreeNode => {
  try {
    return new FocusTreeNode(domTarget, id, parent);
  } catch (e) {
    if (shouldThrow) throw e;
    return new FocusTreeNode(domTarget, id);
  }
};

const rootNodes = new WeakMap<Element, FocusTreeNode>();

const getOrCreateRootNode = (domTarget: Element | null): FocusTreeNode => {
  if (!domTarget) return createFocusTreeNode(null);
  const rootElement = getDocument(domTarget)?.documentElement;
  if (!rootElement) throw new Error('Detached domTarget detected!');
  let rootNode = rootNodes.get(rootElement);
  if (!rootNode) {
    rootNode = createFocusTreeNode(rootElement);
    rootNodes.set(rootElement, rootNode);
  }
  return rootNode;
};

/**
 * `FocusScope` wraps its children in an element (a `span` by default),
 * and manages focus for them, both by changing focus on certain types
 * of input, and by reacting to focus changes that occur.
 */
export const FocusScope = React.forwardRef(function FocusScope(
  {
    id,
    as: Wrapper = 'span',
    onKeyPress,
    onFocus,
    onBlur,
    trap = false,
    autoFocus = false,
    restoreFocus = false,
    children,
    ...props
  }: FocusScopeConfig & {children?: React.ReactNode | FocusScopeRenderProp},
  forwardedRef: React.Ref<Element>,
): JSX.Element {
  if (__DEV__) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const forwardsRef = (v: any): boolean => {
      if (typeof v === 'string') return true;
      return v?.$$typeof === Symbol.for('react.forward_ref');
    };
    warning(
      forwardsRef(Wrapper),
      `FocusScope can only be rendered as a ReactDOM element ` +
        `or ref-forwarding component. The value for the "as" prop ` +
        `does not appear to forward its ref:\n"${Wrapper}"`,
    );

    if (isRenderProp(children)) {
      warning(
        !trap,
        `FocusScope will not trap focus when children is a function!`,
      );
      warning(
        !onFocus,
        `FocusScope doesn't support an onFocus handler when children is a function!`,
      );
      warning(
        !onBlur,
        `FocusScope doesn't support an onBlur handler when children is a function!`,
      );
      warning(
        !onKeyPress,
        `FocusScope doesn't support an onKeyPress handler when children is a function!`,
      );
    }
  }

  /** The DOM element that is rendered by this `FocusScope`. */
  const [domTarget, setDomTarget] = useRefCallback(null, forwardedRef);

  /** Check the `FocusTreeContext` for a parent. */
  const parentContext = useContext(FocusTreeContext);

  /** The `FocusTreeNode` for this scope. */
  const [focusTreeNode, setFocusTreeNode] = useState(() =>
    createFocusTreeNode(
      domTarget.current,
      id,
      parentContext ?? getOrCreateRootNode(domTarget.current),
    ),
  );

  /** The element to restore focus to on unmount. */
  const elementToRestore = useRef<Element | null>(null);

  /** The currently focused element in scope. */
  const focusedElementInScope = useFocusScopeBehavior({
    focusTreeNode,
    trap,
    onFocus,
    onBlur,
  });

  const tabKeyHandler = useTabKeyHandler({focusTreeNode, trap});

  /** A handler for key presses within this scope. */
  const handleKey = useCallback(
    (state: KeyPressState) => {
      if (!state.down) return;
      const nativeEvent =
        state.event && 'nativeEvent' in state.event
          ? state.event.nativeEvent
          : state.event;
      if (nativeEvent) {
        if (typeof onKeyPress === 'function') {
          onKeyPress(nativeEvent, new FocusManager(focusTreeNode));
        }
        if (state.key === 'Tab' && !nativeEvent.defaultPrevented) {
          tabKeyHandler(state);
        }
      }
    },
    [onKeyPress, tabKeyHandler, focusTreeNode],
  );

  /** Binds handlers to `keydown` events that occur within this scope. */
  const bindKeyPress = useKeyPress({onKey: handleKey});

  /**
   * Checks if the current `focusTreeNode` accurately reflects
   * the state of this `FocusScope`. If it doesn't,
   * update (or recreate) it with the new details.
   */
  const updateFocusTreeNode = useCallback<
    (
      /**
       * Whether or not to throw errors when reparenting a node.
       * By default, we let reparenting fail silently, as we expect
       * errors when the DOM hasn't been updated to reflect the state
       * of the tree yet.
       */
      shouldThrowOnReparentingFailure?: boolean,
    ) => FocusTreeNode
  >(
    function updateFocusTreeNode(shouldThrowOnReparentingFailure = false) {
      let nextNode = focusTreeNode;
      const parent = parentContext ?? getOrCreateRootNode(domTarget.current);

      // If the `domTarget`, `parent`, or `id` have changed for this node,
      // destroy it and create a new one.
      if (nextNode.domTarget !== domTarget.current || nextNode.id !== id) {
        nextNode = createFocusTreeNode(
          domTarget.current,
          id,
          parent,
          shouldThrowOnReparentingFailure,
        );
      }

      // If the parent context has changed, reparent this `focusTreeNode`.
      // If this fails, it probably means this node is being reparented.
      // We will let if fail silently and assume the tree will be cleaned up
      // in a later effect.
      if (nextNode.parent !== parent) {
        nextNode.remove();
        try {
          parent?.appendChildNode(nextNode);
        } catch (e) {
          if (shouldThrowOnReparentingFailure) throw e;
        }
      }

      if (nextNode !== focusTreeNode) setFocusTreeNode(nextNode);
      return nextNode;
    },
    [parentContext, domTarget, id, focusTreeNode],
  );

  useMemo(updateFocusTreeNode, [updateFocusTreeNode]);

  useInitialLayoutEffect(function() {
    // Update the `focusTreeNode`, and error if reparenting fails.
    // Note that we want to error now because initial layout has just finished,
    // and we want to catch any duplicate node ids or other anomalies
    // in the tree.
    const currentFocusTreeNode = updateFocusTreeNode(true);
    // Apply autofocus on initial layout (mount).
    elementToRestore.current = currentFocusTreeNode.getFocusedElementGlobal();
    if (autoFocus) {
      currentFocusTreeNode.focusFirst();
      focusedElementInScope.current = currentFocusTreeNode.getFocusedElement();
    }
  });

  useUnmountEffect(function onUnmount() {
    // Apply restoreFocus on unmount,
    // and remove the focusTreeNode from the tree.
    if (restoreFocus && elementToRestore.current !== null) {
      focusTreeNode.focus(elementToRestore.current);
    }
    focusTreeNode.remove();
  });

  return (
    <FocusTreeContext.Provider value={focusTreeNode}>
      {isRenderProp(children) ? (
        children({
          ref: setDomTarget,
          focusManager: new FocusManager(focusTreeNode),
        })
      ) : (
        <Wrapper ref={setDomTarget} {...props} {...bindKeyPress()}>
          {children}
        </Wrapper>
      )}
    </FocusTreeContext.Provider>
  );
}) as <
  T extends React.ElementType = 'span',
  C extends FocusScopeRenderProp | React.ReactNode | undefined = undefined
>(
  props: FocusScopeProps<T, C>,
) => JSX.Element;

export default FocusScope;

import {useCallback, useEffect, useMemo, useRef} from 'react';
import useForceUpdate from './useForceUpdate';
import {ShouldStickState} from './StickyContext';
import {useStickyPortalContext} from './StickyPortalContext';
import {StickyPortalAction, INVALIDATE} from './StickyPortalStore';

/* sticky actions */
export const UPDATE_CONTENT_NODE = 'UPDATE_CONTENT_NODE';
export const UPDATE_INTERSECTION_NODE = 'UPDATE_INTERSECTION_NODE';
export const UPDATE_CONTAINING_NODE = 'UPDATE_CONTAINING_NODE';
export const UPDATE_SCROLL_NODE = 'UPDATE_SCROLL_NODE';

export type StickyActionType =
  | typeof UPDATE_CONTENT_NODE
  | typeof UPDATE_INTERSECTION_NODE
  | typeof UPDATE_CONTAINING_NODE
  | typeof UPDATE_SCROLL_NODE;

export interface StickyAction {
  type: StickyActionType;
  key: React.RefObject<Element>;
  element?: Element | null;
}

export interface StickyState {
  containingNode: Element | null;
  contentNode: Element | null;
  intersectionNode: Element | null;
  scrollNode: Element | null;
  shouldStick: ShouldStickState;
}

interface ClientSnapshots {
  /** Snapshot of the containing element's client rect bottom. */
  readonly containingBottom: number | null;
  /** Snapshot of the content element's height. */
  readonly contentHeight: number | null;
  /** Snapshot of the intersection element's client rect top. */
  readonly intersectionTop: number | null;
  /** Snapshot of the scrolling element's scroll top. */
  readonly scrollTop: number | null;
  /** invalidate snapshot measurements. */
  invalidate: () => void;
}

export interface StickyStore {
  /** When defined, takes precedence over the Sticky state. */
  stuck?: boolean | null;
  /** The current state. */
  state: StickyState;
  /** Snapshots of key client measurements. */
  readonly snapshots: ClientSnapshots;
  /** call any listeners, letting them know of a state change. */
  dispatch: () => void;
  /** Add a listener for changes to state.  */
  addListener: (listener: (shouldStick: ShouldStickState) => void) => void;
  /** Remove a listener for changes to the state. */
  removeListener: (listener: (shouldStick: ShouldStickState) => void) => void;
  /** Whether or no this state has listeners for state changes. */
  hasListeners: () => boolean;
}

function createSnapshotStore(
  initialState: StickyState,
): (state: StickyState) => ClientSnapshots {
  let state = initialState;
  let contentHeight: number | null = null;
  let intersectionTop: number | null = null;
  let containingBottom: number | null = null;
  let scrollTop: number | null = null;
  const snapshots = {
    get contentHeight() {
      if (contentHeight == null) {
        const {contentNode} = state;
        if (contentNode) {
          contentHeight = contentNode.getBoundingClientRect().height;
        }
      }
      return contentHeight;
    },
    get intersectionTop() {
      if (intersectionTop == null) {
        const {intersectionNode} = state;
        if (intersectionNode) {
          intersectionTop = intersectionNode.getBoundingClientRect().top;
        }
      }
      return intersectionTop;
    },
    get containingBottom() {
      if (containingBottom == null) {
        const {containingNode} = state;
        if (containingNode) {
          containingBottom = containingNode.getBoundingClientRect().bottom;
        }
      }
      return containingBottom;
    },
    get scrollTop() {
      if (scrollTop == null) {
        const {scrollNode} = state;
        if (scrollNode) {
          scrollTop = scrollNode.scrollTop;
        }
      }
      return scrollTop;
    },
    invalidate() {
      contentHeight = null;
      intersectionTop = null;
      containingBottom = null;
      scrollTop = null;
    },
  };
  return (nextState: StickyState) => {
    state = nextState;
    return snapshots;
  };
}

function createStickyStore(): StickyStore {
  const listeners: Set<(state: ShouldStickState) => void> = new Set();
  let dirty: StickyState | false = false;
  let stuck: boolean | null | undefined;
  let state: StickyState = {
    shouldStick: false,
    contentNode: null,
    intersectionNode: null,
    containingNode: null,
    scrollNode: null,
  };
  const snapshotsOf = createSnapshotStore(state);
  return {
    get stuck() {
      return stuck;
    },
    set stuck(value: boolean | null | undefined) {
      stuck = value;
    },
    get state() {
      return dirty || state;
    },
    set state(nextState: StickyState) {
      if (nextState !== state) {
        dirty = nextState;
      }
    },
    get snapshots() {
      return snapshotsOf(dirty || state);
    },
    dispatch() {
      if (dirty) {
        // Only dispatch if `shouldStick` state has changed.
        const shouldDispatch = dirty.shouldStick !== state.shouldStick;
        state = dirty;
        dirty = false;
        if (shouldDispatch) {
          listeners.forEach(listener => listener(state.shouldStick));
        }
      }
    },
    addListener(listener: (shouldStick: ShouldStickState) => void) {
      listeners.add(listener);
    },
    removeListener(listener: (shouldStick: ShouldStickState) => void) {
      listeners.delete(listener);
    },
    hasListeners() {
      return listeners.size > 0;
    },
  };
}

export function reduceStickyState(
  state: StickyState,
  action: StickyAction,
): StickyState {
  let nextState = state;
  const {element} = action;
  if (element) {
    nextState = {...nextState};
    switch (action.type) {
      case UPDATE_INTERSECTION_NODE: {
        nextState.intersectionNode = element;
        break;
      }
      case UPDATE_CONTENT_NODE: {
        nextState.contentNode = element;
        break;
      }
      case UPDATE_CONTAINING_NODE: {
        nextState.containingNode = element;
        break;
      }
      case UPDATE_SCROLL_NODE: {
        nextState.scrollNode = element;
        break;
      }
    }
  }
  return nextState;
}

export function useStickyStore(
  stickyRef: React.RefObject<HTMLElement>,
  portalRef: React.RefObject<HTMLElement>,
  stuck?: boolean | null,
): [StickyState, React.Dispatch<StickyAction | StickyPortalAction>] {
  // Use the sticky portal context for this portal ref.
  const portalContext = useStickyPortalContext(portalRef);

  const portalDispatch = useRef<React.Dispatch<StickyPortalAction> | null>(
    null,
  );
  portalDispatch.current = portalContext.store
    ? portalContext.store.dispatch
    : null;

  const stickyStates = useMemo(() => {
    if (portalContext.store) {
      return portalContext.store.state.stickyStates;
    }
    return null;
  }, [portalContext]);

  // Create a `stickyStore` and add it to the sticky portal store.
  const stickyStore = useMemo(createStickyStore, []);

  const dispatch = useCallback(
    (action: StickyAction | StickyPortalAction) => {
      switch (action.type) {
        case UPDATE_INTERSECTION_NODE:
        case UPDATE_CONTENT_NODE:
        case UPDATE_CONTAINING_NODE:
        case UPDATE_SCROLL_NODE: {
          const stickyState = stickyStore.state;
          const nextStickyState = reduceStickyState(stickyState, action);
          if (nextStickyState !== stickyState) {
            stickyStore.state = nextStickyState;
            action = {type: INVALIDATE};
          } else {
            break;
          }
        }
        default: /* eslint-disable-line no-fallthrough */ {
          if (portalDispatch.current) {
            portalDispatch.current(action);
          }
        }
      }
    },
    [stickyStore, portalDispatch],
  );

  // Create a `forceUpdate` listener so that the user
  // of this sticky store can be rerendered when the
  // stored state changes.
  const listener = useForceUpdate();

  useEffect(() => {
    if (stickyStates) stickyStates.set(stickyRef, stickyStore);
    stickyStore.addListener(listener);
    return () => {
      if (stickyStore) stickyStore.removeListener(listener);
      if (stickyStates) stickyStates.delete(stickyRef);
    };
  }, [stickyStates, stickyRef, stickyStore, listener]);

  // Update the `stuck` value on the state store.
  stickyStore.stuck = stuck;

  return [stickyStore.state, dispatch];
}

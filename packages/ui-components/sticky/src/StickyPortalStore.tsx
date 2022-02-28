import React, {useReducer, useMemo, useRef} from 'react';
import {StickyStore} from './StickyStore';

/* sticky portal actions */
export const VALIDATE = 'VALIDATE';
export const INVALIDATE = 'INVALIDATE';

export type StickyPortalActionType = typeof VALIDATE | typeof INVALIDATE;

export interface StickyPortalAction {
  type: StickyPortalActionType;
}

export interface StickyPortalState {
  invalid: boolean;
  validationPending: React.MutableRefObject<boolean | null>;
  portalRect: React.MutableRefObject<ClientRect | null>;
  portalRef: React.RefObject<Element>;
  stickyStates: StickyStateMap;
}

export interface StickyPortalStore {
  readonly state: StickyPortalState;
  dispatch: React.Dispatch<StickyPortalAction>;
}

export interface StickyPortalContextValue {
  portalRef: React.RefObject<HTMLDivElement>;
}

type StickyStateMap = Map<React.RefObject<Element>, StickyStore>;

function updateStickyStates(stickyStates: StickyStateMap): void {
  for (const stickyState of stickyStates.values()) {
    stickyState.dispatch();
  }
}

function createStickyPortalState(
  portalRef: React.RefObject<Element>,
): StickyPortalState {
  return {
    invalid: true,
    validationPending: React.createRef<boolean>(),
    portalRect: React.createRef<ClientRect>(),
    portalRef,
    stickyStates: new Map(),
  };
}

function checkBounds(state: StickyPortalState): StickyPortalState {
  let nextState = state;
  const {portalRef, portalRect, stickyStates} = state;
  // Can't do any bounds checking without a portal node!
  if (!portalRef.current) return nextState;
  const remeasure = state.invalid || portalRect.current == null;
  if (remeasure || portalRect.current == null) {
    portalRect.current = portalRef.current.getBoundingClientRect();
  }
  let portalBottom = portalRect.current.bottom;
  // For each sticky element in this context, calculate if the sticky content
  // should be stuck in the portal or to the bottom of it's containing element.
  for (const stickyStateStore of stickyStates.values()) {
    const {state, stuck, snapshots} = stickyStateStore;
    // If we need to remeasure, invalidate the snapshot client measurements.
    if (remeasure) snapshots.invalidate();
    // Get the last snapshot client measurements.
    const {
      intersectionTop,
      contentHeight,
      scrollTop,
      containingBottom,
    } = snapshots;

    // Calculate the next `shouldStick` state for this store, if necessary.
    if (contentHeight != null && typeof stuck === 'boolean') {
      if (stuck !== state.shouldStick) {
        portalBottom += stuck === true ? contentHeight : -contentHeight;
        stickyStateStore.state = {...state, shouldStick: stuck};
        nextState = {...nextState};
      }
    } else if (
      state.scrollNode &&
      intersectionTop != null &&
      contentHeight != null &&
      scrollTop != null
    ) {
      let {shouldStick} = state;
      // scrollTop differential since the last measurements were taken.
      const scrollDelta = state.scrollNode.scrollTop - scrollTop;
      const adjustedBottom =
        shouldStick === true ? portalBottom - contentHeight : portalBottom;
      const topBound = intersectionTop - scrollDelta;
      // We should stick if the intersection element's top
      // is above the portal element's bottom.
      shouldStick = topBound <= adjustedBottom;

      // If we _are_ out of bounds on top, stick to the bottom
      // of the containing rect if it is also out of bounds.
      if (shouldStick && containingBottom != null) {
        const bottomBound = containingBottom - contentHeight - scrollDelta;
        // We should stick to the bottom of the containing element
        // if the containing element's bottom
        // is above the portal element's bottom.
        shouldStick = bottomBound <= adjustedBottom ? 'bottom' : true;
      }

      // If the value of `shouldStick` has changed, update the next state.
      if (shouldStick !== state.shouldStick) {
        portalBottom += shouldStick === true ? contentHeight : -contentHeight;
        stickyStateStore.state = {...state, shouldStick};
        nextState = {...nextState};
      }
    }
  }
  // If the portal height is changing, clear the stored portal rect.
  if (portalRect.current && portalBottom !== portalRect.current.bottom) {
    portalRect.current = null;
  }
  return nextState;
}

function reduceStickyPortalState(
  state: StickyPortalState,
  action: StickyPortalAction,
): StickyPortalState {
  let nextState = state;
  switch (action.type) {
    case INVALIDATE: {
      nextState.portalRect.current = null;
      if (!state.invalid) nextState = {...nextState, invalid: true};
      break;
    }
    case VALIDATE: {
      nextState = checkBounds(nextState);
      if (state.invalid) {
        nextState = {...nextState, invalid: false};
      }
      state.validationPending.current = false;
      break;
    }
  }

  return nextState;
}

export function useStickyPortalStore(
  portalRef: React.RefObject<HTMLElement>,
): StickyPortalStore {
  const [state, dispatch] = useReducer(reduceStickyPortalState, null, () =>
    createStickyPortalState(portalRef),
  );
  const lastState = useRef(state);
  lastState.current = state;

  const store = useMemo(
    () => ({
      get state() {
        return lastState.current;
      },
      dispatch,
    }),
    [lastState, dispatch],
  );

  if (!state.invalid) {
    // Make sure sticky states in this portal store are up-to-date.
    updateStickyStates(state.stickyStates);
  } else if (state.invalid && !state.validationPending.current) {
    // Schedule a validation pass if necessary.
    state.validationPending.current = true;
    dispatch({type: VALIDATE});
  }

  return store;
}

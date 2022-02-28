import {useState, useCallback, useRef, useEffect, useMemo} from 'react';
import warning from 'tiny-warning';
import {
  KeyPressHandler as _KeyPressHandler,
  KeyPressState as _KeyPressState,
  KeyPressPhase,
  pickHandlers,
  getPhase,
  getTimeStamp,
  isKeyboardEvent,
  assertUnreachable,
} from './handler';
import {
  WhitespaceKeyPressUserHandlers,
  applyWhitespaceHandlers,
} from './whitespace';
import {UIKeyPressUserHandlers, applyUIHandlers} from './ui';
import {
  NavigationKeyPressUserHandlers,
  applyNavigationHandlers,
} from './navigation';
import useValueObject from '@hzdg/use-value-object';

// Reexport types in a babel-friendly way.
export type KeyPressState = _KeyPressState;
export type KeyPressHandler = _KeyPressHandler;

type AtLeastOneOf<T, U = {[K in keyof T]: Pick<T, K>}> = Partial<T> &
  U[keyof U];

type DomTarget = EventTarget | React.RefObject<EventTarget>;

interface EventOptions {
  /** If `true`, keyboard events will be captured.*/
  capture?: boolean;
  /**
   * If `true`, the listener should not call `preventDefault()`.
   *
   * Note that this will have no effect if binding to a React element,
   * as ReactDOM events do not support passive listeners.
   * See https://github.com/facebook/react/issues/6436
   */
  passive?: boolean;
}

export interface UseKeyPressConfig {
  /**
   * Whether or not key presses are enabled. Useful for toggling
   * keyboard behavior on or off.
   *
   * Default is `true`.
   */
  enabled?: boolean;
  /**
   * Optional config for the key event listener.
   * These options reflect the same DOM `addEventListener` options.
   */
  eventOptions?: Partial<EventOptions>;
  /**
   * An optional target element or React ref. If defined,
   * the `bind()` function should be run as an effect,
   * not spread as props on a React component.
   */
  domTarget?: DomTarget;
}

type UseKeyPressWithDomTargetConfig = UseKeyPressConfig & {
  domTarget: DomTarget;
};

interface GenericKeyPressUserHandlers {
  onKeyPress?: KeyPressHandler;
  onKeyRelease?: KeyPressHandler;
  onKey?: KeyPressHandler;
}

type KeyPressUserHandlers = GenericKeyPressUserHandlers &
  WhitespaceKeyPressUserHandlers &
  UIKeyPressUserHandlers &
  NavigationKeyPressUserHandlers;

interface ReactEventHandlers {
  onKeyDownCapture?: React.KeyboardEventHandler;
  onKeyUpCapture?: React.KeyboardEventHandler;
  onKeyDown?: React.KeyboardEventHandler;
  onKeyUp?: React.KeyboardEventHandler;
}

type Bind<
  T extends UseKeyPressConfig
> = T extends UseKeyPressWithDomTargetConfig
  ? () => void
  : () => ReactEventHandlers;

type Subscription =
  | {
      target: EventTarget;
      unsubscribe: () => void;
    }
  | {target: null};

function applyGenericHandlers(
  state: KeyPressState,
  phase: KeyPressPhase,
  handlers: GenericKeyPressUserHandlers,
): void {
  pickHandlers(handlers, 'onKeyPress', 'onKey', 'onKeyRelease')(phase)?.(state);
}

function getDomTarget(
  domTarget: UseKeyPressConfig['domTarget'],
): EventTarget | null {
  return domTarget
    ? 'current' in domTarget
      ? domTarget.current
      : domTarget
    : null;
}

type KeyPressStateInternal = KeyPressState & {activeKeys: Set<string>};

type KeyPressAction = React.KeyboardEvent | KeyboardEvent;

function updateState(
  state: KeyPressStateInternal,
  action: KeyPressAction,
): void {
  const phase = getPhase(action);
  const timeStamp = getTimeStamp(action);
  if (action.key === 'Unidentified') {
    throw new Error(action.key);
  }
  state.event = action;
  state.key = action.key;
  state.shiftKey = action.shiftKey;
  state.ctrlKey = action.ctrlKey;
  state.altKey = action.altKey;
  state.metaKey = action.metaKey;
  state.first = phase === KeyPressPhase.Press;
  state.last = phase === KeyPressPhase.Release;
  state.down = phase === KeyPressPhase.Press || phase === KeyPressPhase.Repeat;
  state.active = state.down;
  state.repeat = phase === KeyPressPhase.Repeat ? state.repeat + 1 : 0;
  state.startTime = state.first ? timeStamp : state.startTime;
  state.elapsedTime = timeStamp - state.startTime;
  state.timeStamp = timeStamp;

  if (state.active && !state.activeKeys.has(state.key)) {
    state.activeKeys.add(state.key);
  } else if (state.activeKeys.has(state.key)) {
    state.activeKeys.delete(state.key);
  }
}

function snapshotChord(state: KeyPressStateInternal): string[] {
  const chord = [];
  for (const key of state.activeKeys) {
    if (key === state.key) continue;
    chord.push(key);
  }
  return chord;
}

function snapshotState(state: KeyPressStateInternal): KeyPressState {
  return {
    event: state.event,
    key: state.key,
    shiftKey: state.shiftKey,
    ctrlKey: state.ctrlKey,
    altKey: state.altKey,
    metaKey: state.metaKey,
    first: state.first,
    last: state.last,
    down: state.down,
    active: state.active,
    repeat: state.repeat,
    startTime: state.startTime,
    elapsedTime: state.elapsedTime,
    timeStamp: state.timeStamp,
    chord: snapshotChord(state),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Callback = (...args: any[]) => any;

/**
 * `useBind` will return a _referentially transparent_ version of
 * a given 'bind' callback. In dev builds, this hook will warn
 * when it looks like the returned `bind` is being spread as props
 * without being called.
 */
function useBind<T extends Callback>(callback: T): T {
  const cb = useRef<T>(callback);
  cb.current = callback;
  const bind = useCallback((...args: Parameters<T>): ReturnType<T> => {
    return cb.current(...args);
  }, []) as T;
  return useMemo((): T => {
    if (__DEV__) {
      const msg =
        'bind appears to be spread as props without having been called! Did you mean `{...bind()}`?' +
        '\n\nThis is most likely a bug in a component using the `useKeyPress` hook.';
      return new Proxy(bind, {
        ownKeys(target) {
          warning(false, msg);
          return Reflect.ownKeys(target);
        },
        get(target, prop, receiver) {
          warning(prop !== 'key', msg);
          return Reflect.get(target, prop, receiver);
        },
      });
    }
    return bind;
  }, [bind]) as T;
}

export type UseKeyPressHandler = KeyPressHandler;
export type UseKeyPressHandlers = AtLeastOneOf<KeyPressUserHandlers>;

function useKeyPress(
  handlers: UseKeyPressHandler | UseKeyPressHandlers,
  config: UseKeyPressWithDomTargetConfig,
): Bind<UseKeyPressWithDomTargetConfig>;
function useKeyPress(
  handlers: UseKeyPressHandler | UseKeyPressHandlers,
  config?: UseKeyPressConfig,
): Bind<UseKeyPressConfig>;
function useKeyPress<Config extends UseKeyPressConfig>(
  handlersProp: UseKeyPressHandler | UseKeyPressHandlers,
  configProp?: Config,
): Bind<Config> {
  const handlers = useRef(handlersProp);
  handlers.current = handlersProp;

  const enabled = configProp?.enabled ?? true;
  const domTarget = configProp?.domTarget;
  const eventOptions = useValueObject(configProp?.eventOptions);

  const [state] = useState<KeyPressStateInternal>(() => ({
    event: null,
    key: null,
    down: false,
    repeat: 0,
    shiftKey: false,
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    startTime: 0,
    elapsedTime: 0,
    timeStamp: 0,
    first: true,
    last: false,
    active: false,
    chord: [],
    activeKeys: new Set(),
  }));

  const dispatch = useCallback(
    (nextState: KeyPressState, phase: KeyPressPhase) => {
      if (typeof handlers.current === 'function') {
        return handlers.current(nextState);
      }
      applyUIHandlers(nextState, phase, handlers.current);
      applyNavigationHandlers(nextState, phase, handlers.current);
      applyWhitespaceHandlers(nextState, phase, handlers.current);
      applyGenericHandlers(nextState, phase, handlers.current);
    },
    [],
  );

  const dispatchRepeat = useCallback(
    (nextState: KeyPressState) => dispatch(nextState, KeyPressPhase.Repeat),
    [dispatch],
  );

  const dispatchPress = useCallback(
    (nextState: KeyPressState) => dispatch(nextState, KeyPressPhase.Press),
    [dispatch],
  );

  const dispatchRelease = useCallback(
    (nextState: KeyPressState) => {
      return dispatch(nextState, KeyPressPhase.Release);
    },
    [dispatch],
  );

  const eventHandler = useCallback(
    (event: React.KeyboardEvent | KeyboardEvent | Event) => {
      if (!isKeyboardEvent(event)) return;
      const phase = getPhase(event);
      updateState(state, event);
      switch (phase) {
        case KeyPressPhase.Press: {
          return dispatchPress(snapshotState(state));
        }
        case KeyPressPhase.Repeat: {
          return dispatchRepeat(snapshotState(state));
        }
        case KeyPressPhase.Release: {
          return dispatchRelease(snapshotState(state));
        }
        default: {
          assertUnreachable(phase, false);
        }
      }
    },
    [state, dispatchPress, dispatchRepeat, dispatchRelease],
  );

  const [subscription] = useState<Subscription>(() => ({target: null}));

  const subscribeIfNecessary = useCallback(() => {
    if (enabled === false) {
      if (subscription.target) {
        subscription.unsubscribe();
        Object.assign(subscription, {target: null, unsubscribe: null});
      }
      return;
    }

    const target = getDomTarget(domTarget);
    if (target) {
      if (subscription.target && subscription.target !== target) {
        subscription.unsubscribe();
        Object.assign(subscription, {target: null, unsubscribe: null});
      }
      if (target && subscription.target !== target) {
        target.addEventListener('keydown', eventHandler, eventOptions);
        target.addEventListener('keyup', eventHandler, eventOptions);
        const unsubscribe = (): void => {
          target.removeEventListener('keydown', eventHandler, eventOptions);
          target.removeEventListener('keyup', eventHandler, eventOptions);
        };
        Object.assign(subscription, {target, unsubscribe});
      }
    }
  }, [subscription, eventHandler, eventOptions, enabled, domTarget]);

  useEffect(
    () => () => {
      if (subscription.target) {
        subscription.unsubscribe();
        Object.assign(subscription, {target: null, unsubscribe: null});
      }
    },
    [eventOptions, domTarget, enabled, subscription],
  );

  return useBind(() => {
    if (getDomTarget(domTarget)) {
      return subscribeIfNecessary();
    } else {
      const capture = Boolean(eventOptions?.capture);
      return {
        onKeyDownCapture: enabled && capture ? eventHandler : null,
        onKeyUpCapture: enabled && capture ? eventHandler : null,
        onKeyDown: enabled && !capture ? eventHandler : null,
        onKeyUp: enabled && !capture ? eventHandler : null,
      };
    }
  }) as Bind<Config>;
}

export default useKeyPress;

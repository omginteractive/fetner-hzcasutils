export interface KeyPressState {
  /** The event associated with the key press */
  event: React.KeyboardEvent | KeyboardEvent | null;
  /** A string representation of the key.  */
  key: string | null;
  /** Whether the key is pressed. */
  down: boolean;
  /** How many times the last event has repeated. */
  repeat: number;
  /** Whether the `Shift key is active. */
  shiftKey: boolean;
  /** Whether the `Ctrl` key is active */
  ctrlKey: boolean;
  /** Whether the `Alt` (`Option` or `⌥` on OS X) key is active */
  altKey: boolean;
  /** Whether the `Meta` (`Command` or `⌘` on OS X; */
  metaKey: boolean;
  /** Key press start time. */
  startTime: number;
  /** Key press elapsed time. */
  elapsedTime: number;
  /** Timestamp of the event. */
  timeStamp: number;
  /** Whether this is the first event. */
  first: boolean;
  /** Whether this is the last event. */
  last: boolean;
  /** Whether the key press is active. */
  active: boolean;
  /** Other active keys. */
  chord: string[];
}

export type KeyPressHandler = (state: KeyPressState) => void;

export enum KeyPressPhase {
  Press = 'Press',
  Repeat = 'Repeat',
  Release = 'Release',
}

type HandlerNames<T> = {
  [K in keyof T]: T[K] extends KeyPressHandler | null | undefined ? K : never;
}[keyof T];

function getHandler<T, K extends HandlerNames<T>>(
  handlers: T,
  handlerName: K,
): KeyPressHandler | null | undefined {
  return handlers[handlerName];
}

export function isKeyboardEvent(event: {
  type?: string;
}): event is React.KeyboardEvent | KeyboardEvent {
  return (event.type === 'keydown' || event.type === 'keyup') && 'key' in event;
}

export function getPhase(
  event: React.KeyboardEvent | KeyboardEvent,
): KeyPressPhase {
  return event.type == 'keyup'
    ? KeyPressPhase.Release
    : 'repeat' in event && event.repeat
    ? KeyPressPhase.Repeat
    : KeyPressPhase.Press;
}

export function getTimeStamp(
  event: React.KeyboardEvent | KeyboardEvent,
): number {
  return event.timeStamp ?? Date.now();
}

export function assertUnreachable(_: never, shouldThrow?: false): false {
  if (shouldThrow === false) return false;
  throw new Error("Didn't expect to get here");
}

export function pickHandlers<T, K extends HandlerNames<T> = HandlerNames<T>>(
  handlers: T,
  pressHandlerName: K,
  repeatHandlerName: K,
  releaseHandlerName: K,
) {
  return (phase: KeyPressPhase) => {
    switch (phase) {
      case KeyPressPhase.Press: {
        const pressHandler = getHandler(handlers, pressHandlerName);
        const repeatHandler = getHandler(handlers, repeatHandlerName);
        if (repeatHandler && pressHandler) {
          return (state: KeyPressState) => {
            pressHandler(state);
            repeatHandler(state);
          };
        }
        return pressHandler || repeatHandler;
      }
      case KeyPressPhase.Repeat: {
        return getHandler(handlers, repeatHandlerName);
      }
      case KeyPressPhase.Release: {
        const releaseHandler = getHandler(handlers, releaseHandlerName);
        const repeatHandler = getHandler(handlers, repeatHandlerName);
        if (repeatHandler && releaseHandler) {
          return (state: KeyPressState) => {
            repeatHandler(state);
            releaseHandler(state);
          };
        }
        return releaseHandler || repeatHandler;
      }
      default: {
        assertUnreachable(phase, false);
      }
    }
  };
}

import {
  KeyPressHandler,
  KeyPressState,
  KeyPressPhase,
  pickHandlers,
  assertUnreachable,
} from './handler';

export enum UI {
  Escape = 'Escape',
  Esc = 'Esc',
}

export interface UIKeyPressUserHandlers {
  onEscape?: KeyPressHandler;
  onEscapePress?: KeyPressHandler;
  onEscapeRelease?: KeyPressHandler;
}

export function applyUIHandlers(
  state: KeyPressState,
  phase: KeyPressPhase,
  handlers: UIKeyPressUserHandlers,
): void {
  const key = state.key as UI;
  switch (key) {
    case UI.Esc:
    case UI.Escape: {
      return pickHandlers(
        handlers,
        'onEscapePress',
        'onEscape',
        'onEscapeRelease',
      )(phase)?.(state);
    }
    default: {
      assertUnreachable(key, false);
    }
  }
}

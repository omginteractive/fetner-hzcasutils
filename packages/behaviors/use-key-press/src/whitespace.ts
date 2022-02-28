import {
  KeyPressHandler,
  KeyPressState,
  KeyPressPhase,
  pickHandlers,
  assertUnreachable,
} from './handler';

export enum Whitespace {
  Enter = 'Enter',
  Tab = 'Tab',
  Space = 'Space',
  SpaceChar = ' ',
}

export interface WhitespaceKeyPressUserHandlers {
  onEnter?: KeyPressHandler;
  onEnterPress?: KeyPressHandler;
  onEnterRelease?: KeyPressHandler;

  onTab?: KeyPressHandler;
  onTabPress?: KeyPressHandler;
  onTabRelease?: KeyPressHandler;

  onSpace?: KeyPressHandler;
  onSpacePress?: KeyPressHandler;
  onSpaceRelease?: KeyPressHandler;
}

export function applyWhitespaceHandlers(
  state: KeyPressState,
  phase: KeyPressPhase,
  handlers: WhitespaceKeyPressUserHandlers,
): void {
  const key = state.key as Whitespace;
  switch (key) {
    case Whitespace.Enter: {
      return pickHandlers(
        handlers,
        'onEnterPress',
        'onEnter',
        'onEnterRelease',
      )(phase)?.(state);
    }
    case Whitespace.Space:
    case Whitespace.SpaceChar: {
      return pickHandlers(
        handlers,
        'onSpacePress',
        'onSpace',
        'onSpaceRelease',
      )(phase)?.(state);
    }
    case Whitespace.Tab: {
      return pickHandlers(
        handlers,
        'onTabPress',
        'onTab',
        'onTabRelease',
      )(phase)?.(state);
    }
    default: {
      assertUnreachable(key, false);
    }
  }
}

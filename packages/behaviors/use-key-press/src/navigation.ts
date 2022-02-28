import {
  KeyPressHandler,
  KeyPressState,
  KeyPressPhase,
  pickHandlers,
  assertUnreachable,
} from './handler';

export enum Navigation {
  ArrowDown = 'ArrowDown',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  ArrowUp = 'ArrowUp',
  Down = 'Down',
  End = 'End',
  Home = 'Home',
  Left = 'Left',
  PageDown = 'PageDown',
  PageUp = 'PageUp',
  Right = 'Right',
  Up = 'Up',
}

export interface NavigationKeyPressUserHandlers {
  onArrowDown?: KeyPressHandler;
  onArrowDownPress?: KeyPressHandler;
  onArrowDownRelease?: KeyPressHandler;

  onArrowLeft?: KeyPressHandler;
  onArrowLeftPress?: KeyPressHandler;
  onArrowLeftRelease?: KeyPressHandler;

  onArrowRight?: KeyPressHandler;
  onArrowRightPress?: KeyPressHandler;
  onArrowRightRelease?: KeyPressHandler;

  onArrowUp?: KeyPressHandler;
  onArrowUpPress?: KeyPressHandler;
  onArrowUpRelease?: KeyPressHandler;

  onEnd?: KeyPressHandler;
  onEndPress?: KeyPressHandler;
  onEndRelease?: KeyPressHandler;

  onHome?: KeyPressHandler;
  onHomePress?: KeyPressHandler;
  onHomeRelease?: KeyPressHandler;

  onPageDown?: KeyPressHandler;
  onPageDownPress?: KeyPressHandler;
  onPageDownRelease?: KeyPressHandler;

  onPageUp?: KeyPressHandler;
  onPageUpPress?: KeyPressHandler;
  onPageUpRelease?: KeyPressHandler;
}

export function applyNavigationHandlers(
  state: KeyPressState,
  phase: KeyPressPhase,
  handlers: NavigationKeyPressUserHandlers,
): void {
  const key = state.key as Navigation;
  switch (key) {
    case Navigation.ArrowDown:
    case Navigation.Down: {
      return pickHandlers(
        handlers,
        'onArrowDownPress',
        'onArrowDown',
        'onArrowDownRelease',
      )(phase)?.(state);
    }
    case Navigation.ArrowUp:
    case Navigation.Up: {
      return pickHandlers(
        handlers,
        'onArrowUpPress',
        'onArrowUp',
        'onArrowUpRelease',
      )(phase)?.(state);
    }
    case Navigation.ArrowLeft:
    case Navigation.Left: {
      return pickHandlers(
        handlers,
        'onArrowLeftPress',
        'onArrowLeft',
        'onArrowLeftRelease',
      )(phase)?.(state);
    }
    case Navigation.ArrowRight:
    case Navigation.Right: {
      return pickHandlers(
        handlers,
        'onArrowRightPress',
        'onArrowRight',
        'onArrowRightRelease',
      )(phase)?.(state);
    }
    case Navigation.End: {
      return pickHandlers(
        handlers,
        'onEndPress',
        'onEnd',
        'onEndRelease',
      )(phase)?.(state);
    }
    case Navigation.Home: {
      return pickHandlers(
        handlers,
        'onHomePress',
        'onHome',
        'onHomeRelease',
      )(phase)?.(state);
    }
    case Navigation.PageDown: {
      return pickHandlers(
        handlers,
        'onPageDownPress',
        'onPageDown',
        'onPageDownRelease',
      )(phase)?.(state);
    }
    case Navigation.PageUp: {
      return pickHandlers(
        handlers,
        'onPageUpPress',
        'onPageUp',
        'onPageUpRelease',
      )(phase)?.(state);
    }
    default: {
      assertUnreachable(key, false);
    }
  }
}

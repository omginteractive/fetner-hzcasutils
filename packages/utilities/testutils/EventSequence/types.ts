export const WHEEL = 'wheel';
export const MOUSE_DOWN = 'mousedown';
export const MOUSE_MOVE = 'mousemove';
export const MOUSE_UP = 'mouseup';
export const TOUCH_START = 'touchstart';
export const TOUCH_MOVE = 'touchmove';
export const TOUCH_END = 'touchend';
export const KEY_DOWN = 'keydown';
export const KEY_UP = 'keyup';

export const DOM_DELTA_PIXEL = 0;
export const DOM_DELTA_LINE = 1;
export const DOM_DELTA_PAGE = 2;

// Whitespace
export const ENTER = 'Enter';
export const TAB = 'Tab';
export const SPACE = 'Space';

// Navigation
export const PAGE_UP = 'PageUp';
export const PAGE_DOWN = 'PageDown';
export const END = 'End';
export const HOME = 'Home';
export const ARROW_LEFT = 'ArrowLeft';
export const ARROW_UP = 'ArrowUp';
export const ARROW_RIGHT = 'ArrowRight';
export const ARROW_DOWN = 'ArrowDown';

// Editing
export const BACKSPACE = 'Backspace';

// UI
export const ESCAPE = 'Escape';

export const CODES = [
  ENTER,
  TAB,
  SPACE,
  PAGE_UP,
  PAGE_DOWN,
  END,
  HOME,
  ARROW_LEFT,
  ARROW_UP,
  ARROW_RIGHT,
  ARROW_DOWN,
  BACKSPACE,
  ESCAPE,
];

export const CODES_2_KEY_CODES: Record<string, number> = {
  [ENTER]: 13,
  [TAB]: 9,
  [SPACE]: 32,
  [PAGE_UP]: 33,
  [PAGE_DOWN]: 34,
  [END]: 35,
  [HOME]: 36,
  [ARROW_LEFT]: 37,
  [ARROW_UP]: 38,
  [ARROW_RIGHT]: 39,
  [ARROW_DOWN]: 40,
  [BACKSPACE]: 8,
  [ESCAPE]: 27,
};

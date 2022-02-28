import * as PageGesture from './PageGesture';
import * as page from './usePageGesture';

export type GestureKey = page.GestureKey;
export type Orientation = page.Orientation;
export type PaginationAction = page.PaginationAction;
export type PageGestureConfig = page.PageGestureConfig;
export type PaginationChangeHandler = page.PaginationChangeHandler;
export type KeyGestureLike = page.KeyGestureLike;
export type HorizontalGestureLike = page.HorizontalGestureLike;
export type VerticalGestureLike = page.VerticalGestureLike;
export type GestureLike = page.GestureLike;
export type FromInputState = page.FromInputState;

export type PageGestureProps = PageGesture.PageGestureProps;
export type PageGestureRenderProps = PageGesture.PageGestureRenderProps;

export const SPACE = page.SPACE;
export const PAGE_UP = page.PAGE_UP;
export const PAGE_DOWN = page.PAGE_DOWN;
export const END = page.END;
export const HOME = page.HOME;
export const ARROW_LEFT = page.ARROW_LEFT;
export const ARROW_UP = page.ARROW_UP;
export const ARROW_RIGHT = page.ARROW_RIGHT;
export const ARROW_DOWN = page.ARROW_DOWN;
export const HORIZONTAL = page.HORIZONTAL;
export const VERTICAL = page.VERTICAL;
export const NEXT = page.NEXT;
export const PREVIOUS = page.PREVIOUS;
export const FIRST = page.FIRST;
export const LAST = page.LAST;
export const CANCELED = page.CANCELED;
export const UNKNOWN = page.UNKNOWN;

export const usePageGesture = page.default;

export default PageGesture.default;

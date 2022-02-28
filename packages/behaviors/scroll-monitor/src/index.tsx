import * as ScrollMonitor from './ScrollMonitor';
import * as scrolling from './useScrolling';
import * as position from './useScrollPosition';
import * as direction from './useScrollDirection';
import * as intersection from './useScrollIntersection';
import * as utils from './utils';

export const useScrolling = scrolling.default;

export type ScrollPosition = position.ScrollPosition;
export const useScrollPosition = position.default;
export const getScrollPosition = position.getScrollPosition;

export type VerticalScrollDirection = direction.VerticalScrollDirection;
export type HorizontalScrollDirection = direction.HorizontalScrollDirection;
export type ScrollDirectionState = direction.ScrollDirectionState;
export const ScrollDirection = direction.ScrollDirection;
export const getScrollDirection = direction.getScrollDirection;
export const useScrollDirection = direction.default;

export type Bounds = intersection.Bounds;
export type TopBounds = intersection.TopBounds;
export type RightBounds = intersection.RightBounds;
export type BottomBounds = intersection.BottomBounds;
export type LeftBounds = intersection.LeftBounds;
export type BoundsRect = intersection.BoundsRect;
export type ScrollIntersectionConfig = intersection.ScrollIntersectionConfig;
export type Intersects = intersection.Intersects;
export const getIntersects = intersection.getIntersects;
export const useScrollIntersection = intersection.default;

export const useNearestScrollNodeRef = utils.useNearestScrollNodeRef;

export type ScrollMonitorRenderProps<
  T extends HTMLElement
> = ScrollMonitor.ScrollMonitorRenderProps<T>;
export type ScrollMonitorProps<
  T extends HTMLElement
> = ScrollMonitor.ScrollMonitorProps<T>;
export default ScrollMonitor.default;

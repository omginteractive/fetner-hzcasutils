import {Orientation} from './Orientation';

/**
 * Configuration for GestureObservable.
 */
export interface ObservableConfig {
  /**
   * Whether or not to prevent the default action
   * for events during a gesture.
   *
   * Defaults to `false`.
   */
  preventDefault: boolean;
  /**
   * Whether or not to listen to events passively.
   * If `true`, then `preventDefault` will have no effect.
   *
   * Defaults to `true` when `preventDefault` is `false`,
   * or `false` when `preventDefault` is `true`.
   */
  passive: boolean;
  /**
   * How 'far' a series of events must cumulatively move
   * in a consistent direction before a gesture is detected.
   *
   * Defaults to `0`.
   */
  threshold?: number;
  /**
   * For a gesture with an `orientation` (i.e., 'horizontal' or 'vertical'),
   * this is the threshold for gesture distance in the _opposing_ orientation
   * that will be tolerated before a gesture is 'canceled'. Once a gesture is
   * canceled, a gesture in the configured orientation will not be recognized
   * until the canceled gesture ends.
   *
   * When `orientation` is defined, this defaults to `3`.
   * If `orientation` is not defined, this threshold is not used.
   */
  cancelThreshold?: number;
  /**
   * The orientation in which a series of events
   * can move in order to be considered part of a gesture.
   * If not provided, then events in _any_ orientation
   * can be considered part of a gesture.
   */
  orientation?: Orientation;
}

const GESTURE_THRESHOLD = 0;
const CANCEL_THRESHOLD = 3;

export function parseConfig<T extends ObservableConfig>(
  config?: Partial<T> | null,
): T {
  const orientation = config?.orientation;
  const preventDefault = config?.preventDefault ?? false;
  const passive = config?.passive ?? !preventDefault;
  const threshold = (config?.threshold ?? GESTURE_THRESHOLD) || 0;
  const cancelThreshold =
    config?.cancelThreshold ?? (orientation ? CANCEL_THRESHOLD : undefined);
  return ({
    ...config,
    orientation,
    preventDefault,
    passive,
    threshold,
    cancelThreshold,
  } as unknown) as T;
}

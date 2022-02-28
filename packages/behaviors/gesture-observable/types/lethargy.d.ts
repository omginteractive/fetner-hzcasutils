declare module 'lethargy' {
  export type ScrollUp = 1;
  export type ScrollDown = -1;
  export type ScrollDirection = ScrollUp | ScrollDown;

  /**
   * Lethargy is a tiny JavaScript library to help
   * distinguish between scroll events initiated by the user,
   * and those by inertial scrolling.
   *
   * See https://github.com/d4nyll/lethargy for more.
   */
  export class Lethargy {
    constructor(
      /**
       * Specifies the length of the rolling average.
       * In effect, the larger the value, the smoother the curve will be.
       * This attempts to prevent anomalies from firing 'real' events.
       * Valid values are all positive integers, but in most cases,
       * you would need to stay between 5 and around 30.
       *
       * Default is `8`.
       */
      stability?: number,
      /**
       * Specifies the minimum value for wheelDelta for it to register
       * as a valid scroll event. Because the tail of the curve have
       * low wheelDelta values, this will stop them from registering
       * as valid scroll events. The unofficial standard wheelDelta
       * is 120, so valid values are positive integers below 120.
       *
       * Default is `100`.
       */
      sensitivity?: number,
      /**
       * Prevent small fluctuations from affecting results.
       * Valid values are decimals from 0, but should ideally be
       * between 0.05 and 0.3.
       *
       * Default is `0.1`.
       */
      tolerance?: number,
      /**
       * Threshold for the amount of time between mousewheel events
       * for them to be deemed separate.
       *
       * Default is `150`.
       */
      delay?: number,
    );
    check(e: Event): ScrollDirection | false;
    isInertia(direction: ScrollDirection): ScrollDirection | false;
    showLastDownDeltas(): number[];
    showLastUpDeltas(): number[];
  }
}

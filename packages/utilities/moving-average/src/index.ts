/** Optional options for creating a `MovingAverage`. */
export interface MovingAverageOptions {
  /**
   * How many previous values to include in the calculation of the average.
   * Once the number of values starts to exceed `size`, older values
   * are dropped from the calculation. This is what makes the average 'move'.
   *
   * Defaults to `10`.
   */
  size?: number;
  /**
   * How much weight to give to the latest value.
   * This weight regresses linearly over `size` number of values,
   * such that the latest value has the most weight, and the oldest
   * value the least.
   *
   * Use a negative value to give the oldest value the most weight instead.
   *
   * Use a falsy value to give all values equal weight.
   *
   * Defaults to `1`.
   */
  weight?: number;
  /**
   * Whether or not the moving average is rounded to the nearest integer.
   *
   * Defaults to `false`.
   */
  round?: boolean;
}

/**
 * Weigh the importance of the given `value` against
 * the `max` important value using the given `scale`.
 *
 * If `scale` is positive, values _further_ from `max` have more weight.
 *
 * If `scale` is negative, values  _closer_ to `max` have more weight.
 *
 * If `scale` is `0` (the default), all values have equal weight.
 */
function weigh(value: number, max: number, scale = 0): number {
  let weight = 1;
  if (!scale) return weight;
  if (scale > 0) {
    weight = ((max - value) / max) * scale;
  } else if (scale < 0) {
    weight = ((value + 1) / max) * Math.abs(scale);
  }
  return weight;
}

/**
 * `MovingAverage` is a simple utility for keeping an average
 * of the latest fixed number of values over time.
 */
export default class MovingAverage {
  protected _size: number;
  protected _scale: number;
  protected _round: boolean;
  protected _store: number[];
  protected _pointer: number;
  protected _delta: number;
  protected _count: number;
  protected _average: number | null;

  constructor(options?: MovingAverageOptions) {
    this._size = options?.size ?? 10;
    this._count = 0;
    this._scale = options?.weight ?? 1;
    this._round = options?.round ?? false;
    if (!this._size || !(this._size > 0)) {
      throw new Error('A positive size is required!');
    }
    this._store = new Array(this._size);
    this._pointer = 0;
    this._delta = 0;
    this._count = 0;
    this._average = null;
  }

  /**
   * Returns a portion of the stored values in this `MovingAverage`
   * as a new `MovingAverage`. The new `MovingAverage` will inherit the
   * configuration of this `MovingAverage`, with the exception of `size`.
   * The size of the new `MovingAverage` will be determined by `end - start`,
   * where `end` defaults to the size of the originating `MovingAverage`,
   * and `start` defaults to `0`.
   */
  slice(start?: number, end?: number): MovingAverage {
    start = start ?? 0;
    if (start > this._size) start = this._size;
    if (start < 0) start = Math.max(0, this._size + start);

    end = end ?? this._size;
    if (end > this._size) end = this._size;
    if (end < 0) end = Math.max(start, this._size + end);
    if (end < start) end = start;

    const size = end - start;
    if (!size) {
      return new MovingAverage({
        size: 1,
        weight: this._scale,
        round: this._round,
      });
    }

    const sliced = new MovingAverage({
      size,
      weight: this._scale,
      round: this._round,
    });
    const pCount = Math.min(this._count, this._size);
    const pStart = (this._pointer + 1 - pCount + pCount) % pCount;
    const count = Math.min(size, pCount);
    let i = 0;
    while (i < count) {
      const index = (pStart + start + i) % pCount;
      const value = this._store[index];
      sliced.push(value);
      i++;
    }
    return sliced;
  }

  /** Add a value to the moving average. */
  push(v: number): void {
    this._pointer = this._count
      ? (this._pointer + 1) % this._size
      : this._pointer;
    this._store[this._pointer] = v;
    this._average = null;
    this._delta += v;
    if (this._count < this._size) this._count += 1;
  }

  /** View the last added value. */
  peek(): number {
    let count = Math.min(this._count, this._size);
    return this._store[this._pointer] ?? NaN;
  }

  /**
   * Reset the moving average.
   * Use this when your value is tied to discrete start and end events,
   * like a gesture.
   */
  reset(): void {
    this._store = new Array(this._size);
    this._pointer = 0;
    this._delta = 0;
    this._count = 0;
    this._average = null;
  }

  /** The absolute deviation of the last value from the moving average. */
  get deviation(): number {
    return Math.abs(this.peek() - this.value);
  }

  /** The cumulative change (from 0) of the value since the last reset. */
  get delta(): number {
    return this._delta;
  }

  /**
   * Whether or not the average is rolling. The average starts rolling
   * once the number of items added to the average meets or exceeds the size.
   */
  get rolling(): boolean {
    return this._count >= this._size;
  }

  /**
   * The moving average of the value since the last reset.
   * This average is based on the last `size` number of values,
   * and may be optionally weighted and rounded.
   */
  get value(): number {
    if (this._average === null) {
      let sum = 0;
      let sumWeight = 0;
      let count = Math.min(this._count, this._size);
      let i = 0;

      while (i < count) {
        const index = (this._pointer - i + count) % count;
        const value = this._store[index];
        if (value != null) {
          const weight = weigh(i, count, this._scale);
          sumWeight += weight;
          sum += value * weight;
        }
        i += 1;
      }
      const average = sum / sumWeight;
      this._average = this._round ? Math.round(average) : average;
    }
    return this._average;
  }

  /**
   * The moving average of the value since the last reset.
   * This average is based on the last `size` number of values,
   * and may be optionally weighted and rounded.
   */
  valueOf(): number {
    return this.value;
  }
}

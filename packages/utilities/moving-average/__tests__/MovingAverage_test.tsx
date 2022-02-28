/* eslint-env jest, browser */
import MovingAverage from '../src';

describe('MovingAverage', () => {
  it('uses default options', () => {
    const avg = new MovingAverage();
    expect(avg).toBeInstanceOf(MovingAverage);
  });

  it('accepts a `size` option', () => {
    const avg = new MovingAverage({size: 2});
    avg.push(3);
    avg.push(2);
    expect(avg.value).not.toBe(2);
    avg.push(2);
    expect(avg.value).toBe(2);
  });

  it('accepts a `weight` option', () => {
    // Expect all values to get the same weight.
    let avg = new MovingAverage({weight: 0});
    avg.push(3);
    avg.push(2);
    avg.push(1);
    avg.push(0);
    expect(avg.value).toBe((3 + 2 + 1 + 0) / (1 + 1 + 1 + 1));

    // Expect oldest value to get most weight.
    avg = new MovingAverage({weight: -1});
    avg.push(3);
    avg.push(2);
    avg.push(1);
    avg.push(0);
    expect(avg.value).toBe(
      (3 * 1 + 2 * 0.75 + 1 * 0.5 + 0 * 0.25) / (1 + 0.75 + 0.5 + 0.25),
    );

    // Expect newest value gets most weight.
    avg = new MovingAverage({weight: 1});
    avg.push(3);
    avg.push(2);
    avg.push(1);
    avg.push(0);
    expect(avg.value).toBe(
      (3 * 0.25 + 2 * 0.5 + 1 * 0.75 + 0 * 1) / (0.25 + 0.5 + 0.75 + 1),
    );
  });

  it('accepts a `round` option', () => {
    const avg = new MovingAverage({round: true});
    avg.push(0.25);
    expect(avg.value).toBe(0);
    avg.push(1.25);
    expect(avg.value).toBe(1);
  });

  describe('slice()', () => {
    it('returns a new MovingAverage', () => {
      const avg = new MovingAverage({size: 2});
      avg.push(25);
      expect(avg.rolling).toBe(false);

      const sliced = avg.slice();
      expect(sliced).toBeInstanceOf(MovingAverage);
      expect(sliced).not.toBe(avg);

      sliced.push(125);
      expect(sliced.rolling).toBe(true);
      expect(sliced.peek()).not.toBe(avg.peek());
      expect(sliced.rolling).not.toBe(avg.rolling);
      expect(sliced.value).not.toBe(avg.value);
      expect(sliced.deviation).not.toBe(avg.deviation);
    });

    it('includes sliced data from the parent', () => {
      const avg = new MovingAverage({size: 2});
      avg.push(25);
      expect(avg.rolling).toBe(false);
      let sliced = avg.slice();
      expect(sliced.peek()).toBe(avg.peek());
      expect(sliced.rolling).toBe(avg.rolling);
      expect(sliced.value).toBe(avg.value);
      expect(sliced.deviation).toBe(avg.deviation);

      avg.push(125);
      expect(avg.rolling).toBe(true);
      sliced = avg.slice();
      expect(sliced.peek()).toBe(avg.peek());
      expect(sliced.rolling).toBe(avg.rolling);
      expect(sliced.value).toBe(avg.value);
      expect(sliced.deviation).toBe(avg.deviation);

      avg.push(25);
      sliced = avg.slice();
      expect(sliced.peek()).toBe(avg.peek());
      expect(sliced.rolling).toBe(avg.rolling);
      expect(sliced.value).toBe(avg.value);
      expect(sliced.deviation).toBe(avg.deviation);
    });

    it.each`
      start | end          | expectedPeek | expectedValue
      ${1}  | ${undefined} | ${125}       | ${125}
      ${2}  | ${undefined} | ${NaN}       | ${NaN}
      ${3}  | ${undefined} | ${NaN}       | ${NaN}
      ${-1} | ${undefined} | ${125}       | ${125}
      ${-2} | ${undefined} | ${125}       | ${(25 * 0.5 + 125) / (0.5 + 1)}
      ${-3} | ${undefined} | ${125}       | ${(25 * 0.5 + 125) / (0.5 + 1)}
      ${0}  | ${0}         | ${NaN}       | ${NaN}
      ${0}  | ${1}         | ${25}        | ${25}
      ${0}  | ${2}         | ${125}       | ${(25 * 0.5 + 125) / (0.5 + 1)}
      ${0}  | ${3}         | ${125}       | ${(25 * 0.5 + 125) / (0.5 + 1)}
      ${0}  | ${-1}        | ${25}        | ${25}
      ${0}  | ${-2}        | ${NaN}       | ${NaN}
      ${0}  | ${-3}        | ${NaN}       | ${NaN}
      ${1}  | ${0}         | ${NaN}       | ${NaN}
      ${1}  | ${1}         | ${NaN}       | ${NaN}
      ${1}  | ${2}         | ${125}       | ${125}
      ${1}  | ${3}         | ${125}       | ${125}
      ${1}  | ${-1}        | ${NaN}       | ${NaN}
      ${1}  | ${-2}        | ${NaN}       | ${NaN}
      ${1}  | ${-3}        | ${NaN}       | ${NaN}
      ${-1} | ${0}         | ${NaN}       | ${NaN}
      ${-1} | ${-3}        | ${NaN}       | ${NaN}
      ${-2} | ${-1}        | ${25}        | ${25}
    `(
      'handles `({size: 2}).slice($start, $end)`',
      ({start, end, expectedPeek, expectedValue}) => {
        const avg = new MovingAverage({size: 2});
        avg.push(25);
        avg.push(125);
        const slice = avg.slice(start, end);
        expect(slice.peek()).toBe(expectedPeek);
        expect(slice.value).toBe(expectedValue);
      },
    );
  });

  describe('peek()', () => {
    it('returns the last pushed value', () => {
      const avg = new MovingAverage();
      avg.push(25);
      expect(avg.peek()).toBe(25);
      avg.push(125);
      expect(avg.peek()).toBe(125);
    });

    it('resets on reset()', () => {
      const avg = new MovingAverage();
      avg.push(25);
      expect(avg.peek()).toBe(25);
      avg.push(125);
      expect(avg.peek()).toBe(125);
      avg.reset();
      expect(avg.peek()).toBe(NaN);
      avg.push(5);
      expect(avg.peek()).toBe(5);
    });
  });

  describe('deviation', () => {
    it('returns the absolute deviation of the last value from the average', () => {
      const avg = new MovingAverage();
      avg.push(1);
      avg.push(2);
      expect(avg.deviation).toBe(Math.abs((1 * 0.5 + 2 * 1) / (0.5 + 1) - 2));
    });

    it('resets on reset()', () => {
      const avg = new MovingAverage();
      avg.push(1);
      expect(avg.deviation).toBe(0);
      avg.reset();
      expect(avg.deviation).toBe(NaN);
      avg.push(1);
      expect(avg.deviation).toBe(0);
    });
  });

  describe('delta', () => {
    it('returns the cumulative delta of the value', () => {
      const avg = new MovingAverage();
      avg.push(1);
      expect(avg.delta).toBe(1);
      avg.push(2);
      avg.push(3);
      expect(avg.delta).toBe(1 + 2 + 3);
    });

    it('resets on reset()', () => {
      const avg = new MovingAverage();
      avg.push(1);
      expect(avg.delta).toBe(1);
      avg.reset();
      expect(avg.delta).toBe(0);
      avg.push(2);
      avg.push(3);
      expect(avg.delta).toBe(2 + 3);
    });
  });

  describe('rolling', () => {
    it('returns whether the average is rolling', () => {
      const avg = new MovingAverage({size: 2});
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(true);
      avg.push(1);
      expect(avg.rolling).toBe(true);
    });

    it('resets on reset()', () => {
      const avg = new MovingAverage({size: 2});
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(true);
      avg.reset();
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(false);
      avg.push(1);
      expect(avg.rolling).toBe(true);
    });
  });

  describe('value', () => {
    it('returns the average', () => {
      const avg = new MovingAverage();
      avg.push(4);
      avg.push(3);
      expect(avg.value).toBe((4 * 0.5 + 3 * 1) / (0.5 + 1));
    });

    it('resets on reset()', () => {
      const avg = new MovingAverage();
      avg.push(3);
      expect(avg.value).toBe(3);
      avg.reset();
      expect(avg.value).toBe(NaN);
      avg.push(4);
      expect(avg.value).toBe(4);
    });
  });
});

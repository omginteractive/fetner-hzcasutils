/* eslint-env jest */
import sleep from '../sleep';

beforeEach(() => {
  jest.useFakeTimers();
});

test.each`
  duration     | expected
  ${undefined} | ${undefined}
  ${null}      | ${undefined}
  ${0}         | ${1}
  ${13}        | ${13}
`(`sleep($duration)`, async ({duration, expected}) => {
  const callback = jest.fn();
  const task = sleep(duration).then(callback);
  expect(callback).not.toHaveBeenCalled();
  if (expected) {
    expect(setTimeout).toHaveBeenLastCalledWith(expect.any(Function), duration);
    jest.advanceTimersByTime(expected);
  }
  await task;
  expect(callback).toHaveBeenCalledTimes(1);
});

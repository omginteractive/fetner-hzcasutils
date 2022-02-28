/* eslint-env jest, browser */
import WheelSequence from '../WheelSequence';

beforeEach(() => {
  jest.useFakeTimers();
});

test('WheelSequence.wheel() reveals subsequence', async () => {
  const handler = jest.fn();
  const node = document.createElement('div');

  node.addEventListener('wheel', handler);

  let sequence = WheelSequence.create(node);
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('wheel', expect.any(Function));

  sequence = sequence.wheel();
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('wheel', expect.any(Function));

  sequence = sequence.repeat();
  expect(sequence).toHaveProperty('wheel', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));

  sequence = sequence.repeat(2);
  expect(sequence).toHaveProperty('wheel', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));

  await sequence.then(handler);

  node.removeEventListener('wheel', handler);

  expect(handler).toHaveBeenCalledTimes(5);

  const expectedOrder = [
    expect.objectContaining({type: 'wheel'}),
    expect.objectContaining({type: 'wheel'}),
    expect.objectContaining({type: 'wheel'}),
    expect.objectContaining({type: 'wheel'}),
  ];

  for (let i = 0; i < expectedOrder.length; i++) {
    expect(handler).toHaveBeenNthCalledWith(i + 1, expect.any(WheelEvent));
    expect(handler).toHaveBeenNthCalledWith(i + 1, expectedOrder[i]);
  }

  expect(handler).toHaveBeenLastCalledWith(expectedOrder);
});

test('WheelSequence.wheel().repeat() creates an event sequence', async () => {
  const result = await WheelSequence.create(document.createElement('div'))
    .wheel()
    .wheel({deltaX: -3, deltaY: -2})
    .repeat()
    .wheel();

  expect(result).toEqual([
    expect.objectContaining({type: 'wheel', deltaX: 0, deltaY: 1}),
    expect.objectContaining({type: 'wheel', deltaX: -3, deltaY: -2}),
    expect.objectContaining({type: 'wheel', deltaX: -3, deltaY: -2}),
    expect.objectContaining({type: 'wheel', deltaX: 0, deltaY: 1}),
  ]);
});

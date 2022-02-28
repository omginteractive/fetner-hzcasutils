/* eslint-env jest, browser */
import TouchSequence from '../TouchSequence';

beforeEach(() => {
  jest.useFakeTimers();
});

test('TouchSequence.start() reveals subsequence', async () => {
  const handler = jest.fn();
  const node = document.createElement('div');

  node.addEventListener('touchstart', handler);
  node.addEventListener('touchmove', handler);
  node.addEventListener('touchend', handler);

  let sequence = TouchSequence.create(node);

  expect(sequence).not.toHaveProperty('move', expect.any(Function));
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).not.toHaveProperty('end', expect.any(Function));

  sequence = sequence.start();
  expect(sequence).not.toHaveProperty('start', expect.any(Function));
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('move', expect.any(Function));
  expect(sequence).toHaveProperty('end', expect.any(Function));

  sequence = sequence.move();
  expect(sequence).not.toHaveProperty('start', expect.any(Function));
  expect(sequence).toHaveProperty('move', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('end', expect.any(Function));

  sequence = sequence.repeat();
  expect(sequence).not.toHaveProperty('start', expect.any(Function));
  expect(sequence).toHaveProperty('move', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('end', expect.any(Function));

  sequence = sequence.repeat(2);
  expect(sequence).not.toHaveProperty('start', expect.any(Function));
  expect(sequence).toHaveProperty('move', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('end', expect.any(Function));

  sequence = sequence.end();
  expect(sequence).toHaveProperty('start', expect.any(Function));
  expect(sequence).not.toHaveProperty('move', expect.any(Function));
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).not.toHaveProperty('end', expect.any(Function));

  await sequence.then(handler);

  node.removeEventListener('touchstart', handler);
  node.removeEventListener('touchmove', handler);
  node.removeEventListener('touchend', handler);

  expect(handler).toHaveBeenCalledTimes(7);

  const expectedOrder = [
    expect.objectContaining({type: 'touchstart'}),
    expect.objectContaining({type: 'touchmove'}),
    expect.objectContaining({type: 'touchmove'}),
    expect.objectContaining({type: 'touchmove'}),
    expect.objectContaining({type: 'touchmove'}),
    expect.objectContaining({type: 'touchend'}),
  ];

  for (let i = 0; i < expectedOrder.length; i++) {
    expect(handler).toHaveBeenNthCalledWith(i + 1, expect.any(TouchEvent));
    expect(handler).toHaveBeenNthCalledWith(i + 1, expectedOrder[i]);
  }

  expect(handler).toHaveBeenLastCalledWith(expectedOrder);
});

test('TouchSequence.move().repeat().end() builds on initialized start()', async () => {
  const result = await TouchSequence.create(document.createElement('div'))
    .start()
    .move({x: 5, y: 3})
    .repeat()
    .end();

  expect(result).toEqual([
    expect.objectContaining({
      type: 'touchstart',
      touches: [expect.objectContaining({clientX: 0, clientY: 0})],
    }),
    expect.objectContaining({
      type: 'touchmove',
      touches: [expect.objectContaining({clientX: 5, clientY: 3})],
    }),
    expect.objectContaining({
      type: 'touchmove',
      touches: [expect.objectContaining({clientX: 5, clientY: 3})],
    }),
    expect.objectContaining({
      type: 'touchend',
      touches: [expect.objectContaining({clientX: 5, clientY: 3})],
    }),
  ]);
});

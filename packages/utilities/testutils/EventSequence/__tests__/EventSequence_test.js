/* eslint-env jest, browser */
import EventSequence from '../EventSequence';

beforeEach(() => {
  jest.useFakeTimers();
});

test('EventSequence', async () => {
  const handler = jest.fn();
  const node = document.createElement('div');

  node.addEventListener('start', handler);
  node.addEventListener('end', handler);

  await EventSequence.create(node)
    .dispatch('start')
    .dispatch('end')
    .then(handler);

  node.removeEventListener('start', handler);
  node.removeEventListener('end', handler);

  expect(handler).toHaveBeenCalledTimes(3);
  expect(handler).toHaveBeenNthCalledWith(
    1,
    expect.objectContaining({type: 'start'}),
  );
  expect(handler).toHaveBeenNthCalledWith(
    2,
    expect.objectContaining({type: 'end'}),
  );
  expect(handler).toHaveBeenLastCalledWith([
    expect.objectContaining({type: 'start'}),
    expect.objectContaining({type: 'end'}),
  ]);
});

test('EventSequence empties queue on run', async () => {
  class TestSeq extends EventSequence {
    constructor(target, index) {
      super(target);
      this.index = index;
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    start() {
      return this.dispatch(`start${this.index}`).expose({
        end: () => this.dispatch(`end${this.index}`),
      });
    }
  }

  const handler = jest.fn();
  const node = document.createElement('div');
  node.addEventListener('start1', handler);
  node.addEventListener('start2', handler);
  node.addEventListener('end1', handler);
  node.addEventListener('end2', handler);

  const seq1 = new TestSeq(node, 1);
  const seq2 = new TestSeq(node, 2);
  const start1 = seq1.start();
  const start2 = seq2.start();

  await start1;
  await start2;
  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler.mock.calls).toMatchObject([
    [expect.objectContaining({type: 'start1'})],
    [expect.objectContaining({type: 'start2'})],
  ]);

  await start2.end();
  await start1.end();
  expect(handler).toHaveBeenCalledTimes(4);
  expect(handler.mock.calls).toMatchObject([
    [expect.objectContaining({type: 'start1'})],
    [expect.objectContaining({type: 'start2'})],
    [expect.objectContaining({type: 'end2'})],
    [expect.objectContaining({type: 'end1'})],
  ]);

  node.removeEventListener('start1', handler);
  node.removeEventListener('start2', handler);
  node.removeEventListener('end1', handler);
  node.removeEventListener('end2', handler);
});

test('EventSequence persists run queue between runs', async () => {
  class TestSeq extends EventSequence {
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    createNextEvent(type, init, lastEvent) {
      return new CustomEvent(type, {detail: init?.detail ?? lastEvent?.detail});
    }
    // eslint-disable-next-line @typescript-eslint/explicit-function-return-type
    start(opts) {
      return this.dispatch('start', opts).expose({
        end: () => this.dispatch('end'),
      });
    }
  }

  const handler = jest.fn();
  const node = document.createElement('div');
  node.addEventListener('start', handler);
  node.addEventListener('end', handler);

  const start = TestSeq.create(node).start({detail: 'test'});
  await start;
  expect(handler).toHaveBeenCalledTimes(1);
  expect(handler.mock.calls).toMatchObject([
    [
      expect.objectContaining({
        isTrusted: false,
        type: 'start',
        detail: 'test',
      }),
    ],
  ]);

  await start.end();
  expect(handler).toHaveBeenCalledTimes(2);
  expect(handler.mock.calls).toMatchObject([
    [expect.objectContaining({type: 'start', detail: 'test'})],
    [expect.objectContaining({type: 'end', detail: 'test'})],
  ]);

  node.removeEventListener('start', handler);
  node.removeEventListener('end', handler);
});

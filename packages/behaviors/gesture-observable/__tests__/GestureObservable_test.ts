/* eslint-env jest, browser */
import GestureObservable, {GestureState, GestureObservableConfig} from '../src';
import {
  GestureHistory,
  MouseSequence,
  TouchSequence,
  WheelSequence,
  KeyboardSequence,
} from 'testutils/EventSequence';

let subscription: ZenObservable.Subscription | null;
let node: HTMLDivElement;

beforeEach(() => {
  node = document.createElement('div');
  document.body.appendChild(node);
});

afterEach(() => {
  node.remove();
  if (subscription) {
    subscription.unsubscribe();
    subscription = null;
  }
});

test('GestureObservable observes mouse gestures', async () => {
  const history = new GestureHistory<GestureState>();
  const gesture = GestureObservable.create(node, {mouse: true});
  subscription = gesture.subscribe(history);

  await new MouseSequence(node)
    .down()
    .move({x: 5})
    .move({x: 3, y: 5})
    .up();
  expect(history.size).toBe(4);
  expect(Array.from(history)).toMatchObject([
    {
      gesturing: true,
      x: 0,
      xDelta: 0,
      xVelocity: 0,
      yDelta: 0,
      yVelocity: 0,
    },
    {
      gesturing: true,
      x: 5,
      xInitial: 0,
      xPrev: 0,
      xDelta: 5,
      xVelocity: 5,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      yDelta: 0,
      yVelocity: 0,
    },
    {
      gesturing: true,
      x: 3,
      xInitial: 0,
      xPrev: 5,
      xDelta: 3,
      xVelocity: -2,
      y: 5,
      yInitial: 0,
      yPrev: 0,
      yDelta: 5,
      yVelocity: 5,
    },
    {
      gesturing: false,
      x: 3,
      xInitial: 0,
      xPrev: 5,
      xDelta: 3,
      xVelocity: -2,
      y: 5,
      yInitial: 0,
      yPrev: 0,
      yDelta: 5,
      yVelocity: 5,
    },
  ]);
});

test('GestureObservable observes touch gestures', async () => {
  const history = new GestureHistory();
  const gesture = GestureObservable.create(node, {touch: true});
  subscription = gesture.subscribe(history);
  await new TouchSequence(node)
    .start()
    .move({x: 5})
    .move({x: 3, y: 5})
    .end();
  expect(history.size).toBe(4);
  expect(Array.from(history)).toMatchObject([
    {
      gesturing: true,
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xDelta: 0,
      xVelocity: 0,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      yDelta: 0,
      yVelocity: 0,
    },
    {
      gesturing: true,
      x: 5,
      xInitial: 0,
      xPrev: 0,
      xDelta: 5,
      xVelocity: 5,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      yDelta: 0,
      yVelocity: 0,
    },
    {
      gesturing: true,
      x: 3,
      xInitial: 0,
      xPrev: 5,
      xDelta: 3,
      xVelocity: -2,
      y: 5,
      yInitial: 0,
      yPrev: 0,
      yDelta: 5,
      yVelocity: 5,
    },
    {
      gesturing: false,
      x: 3,
      xInitial: 0,
      xPrev: 5,
      xDelta: 3,
      xVelocity: -2,
      y: 5,
      yInitial: 0,
      yPrev: 0,
      yDelta: 5,
      yVelocity: 5,
    },
  ]);
});

test('GestureObservable observes wheel gestures', async () => {
  jest.useFakeTimers();
  const history = new GestureHistory();
  const gesture = GestureObservable.create(node, {wheel: true, threshold: 0});
  subscription = gesture.subscribe(history);
  await new WheelSequence(node)
    .wheel()
    .wheel({deltaX: 5})
    .wheel({deltaX: 3, deltaY: 5});
  jest.runAllTimers();
  expect(history.size).toBe(4);
  expect(Array.from(history)).toMatchObject([
    {
      type: 'wheel',
      gesturing: true,
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xSpin: 0,
      xDelta: 0,
      xVelocity: 0,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      ySpin: 1,
      yDelta: -1,
      yVelocity: -1,
    },
    {
      type: 'wheel',
      gesturing: true,
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xSpin: 1,
      xDelta: -5,
      xVelocity: -5,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      ySpin: 1,
      yDelta: -1,
      yVelocity: 0,
    },
    {
      type: 'wheel',
      gesturing: true,
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xSpin: 2,
      xDelta: -8,
      xVelocity: -3,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      ySpin: 2,
      yDelta: -6,
      yVelocity: -5,
    },
    {
      type: 'gestureend',
      gesturing: false,
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xSpin: 2,
      xDelta: -8,
      xVelocity: -3,
      y: 0,
      yInitial: 0,
      yPrev: 0,
      ySpin: 2,
      yDelta: -6,
      yVelocity: -5,
    },
  ]);
});

test('GestureObservable observes keyboard gestures', async () => {
  const history = new GestureHistory();
  const gesture = GestureObservable.create(node, {keyboard: true});
  subscription = gesture.subscribe(history);
  await new KeyboardSequence(node)
    .space()
    .repeat()
    .up();
  expect(history.size).toBe(3);
  expect(Array.from(history)).toMatchObject([
    {
      gesturing: true,
      key: 'Space',
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xDelta: 0,
      xVelocity: 0,
      y: 0,
      yDelta: 0,
      yVelocity: 0,
      yInitial: 0,
      yPrev: 0,
    },
    {
      gesturing: true,
      key: 'Space',
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xDelta: 0,
      xVelocity: 0,
      y: 0,
      yDelta: 0,
      yVelocity: 0,
      yInitial: 0,
      yPrev: 0,
    },
    {
      gesturing: false,
      key: 'Space',
      x: 0,
      xInitial: 0,
      xPrev: 0,
      xDelta: 0,
      xVelocity: 0,
      y: 0,
      yDelta: 0,
      yVelocity: 0,
      yInitial: 0,
      yPrev: 0,
    },
  ]);
});

test('GestureObservable observes all inputs by default', async () => {
  jest.useFakeTimers();
  const history = new GestureHistory();
  const gesture = GestureObservable.create(node, {threshold: 0});
  subscription = gesture.subscribe(history);
  await new MouseSequence(node)
    .down()
    .move()
    .up();
  await new TouchSequence(node)
    .start()
    .move()
    .end();
  await new WheelSequence(node).wheel();
  await new KeyboardSequence(node).space().up();
  jest.runAllTimers();
  expect(history.size).toBe(10);
});

test.each([['mouse', 3], ['touch', 3], ['wheel', 2], ['keyboard', 2]])(
  'GestureObservable observes only %s inputs when specified',
  async (inputType, expectedUpdates) => {
    jest.useFakeTimers();
    const history = new GestureHistory();
    const gesture = GestureObservable.create(node, ({
      [inputType]: true,
      threshold: 0,
    } as unknown) as GestureObservableConfig);
    subscription = gesture.subscribe(history);
    await new MouseSequence(node)
      .down()
      .move()
      .up();
    await new TouchSequence(node)
      .start()
      .move()
      .end();
    await new WheelSequence(node).wheel();
    await new KeyboardSequence(node).space().up();
    jest.runAllTimers();
    expect(history.size).toBe(expectedUpdates);
  },
);

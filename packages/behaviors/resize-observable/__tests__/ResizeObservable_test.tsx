/* eslint-env jest, browser */
/* eslint-disable @typescript-eslint/no-var-requires */
import 'testutils/MockMutationObserver';

describe('ResizeObservable > ResizeObserver', () => {
  jest.resetModules();
  jest.doMock('@juggle/resize-observer');

  const {ResizeObserver} = require('@juggle/resize-observer');
  const Observable = require('zen-observable');
  const ResizeObservable = require('../src');

  const ResizeObserverMock = ResizeObserver as jest.Mock<typeof ResizeObserver>;

  const NOOP = (): void => {};

  let resizeObserverInstance: typeof ResizeObserver;

  beforeAll(() => {
    // Note: all the other tests in this suite are written
    // as though the following assertions have already run,
    // because they test the underlying singleton management,
    // While the other tests assume the singleton already exists.
    // We can't put these assertions in their own test because
    // Jest can parallelize tests (or run them in any order).
    // So, we put them `beforeAll` to guarantee that they have run
    // before any of the tests in the suite run.

    // Create an observable and check that the singleton
    // ResizeObserver has not yet been created.
    const observable = ResizeObservable.create(document.body);
    expect(observable).toBeInstanceOf(Observable);
    expect(ResizeObserverMock).not.toHaveBeenCalled();

    // Subscribe to the observable and check that the singleton
    // ResizeObserver has been created.
    const subscription = observable.subscribe(NOOP);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(1);
    resizeObserverInstance = ResizeObserverMock.mock.instances[0];
    expect(resizeObserverInstance).toBeInstanceOf(ResizeObserver);
    subscription.unsubscribe();
  });

  beforeEach(() => {
    ResizeObserverMock.mockReset();
    (resizeObserverInstance.observe as jest.Mock).mockReset();
    (resizeObserverInstance.unobserve as jest.Mock).mockReset();
  });

  it('manages a singleton ResizeObserver', () => {
    // NOTE: This test expects no new instances of ResizeObserver
    // to ever be created. This is because the singleton instance
    // should have already been created in `beforeAll`.
    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);

    // Create a ResizeObservable.
    const bodyObservable = ResizeObservable.create(document.body);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);

    // Subscribe once.
    const bodySubscription1 = bodyObservable.subscribe(NOOP);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);

    const child = document.createElement('div');
    document.body.appendChild(child);

    // Create another ResizeObservable.
    const childObservable = ResizeObservable.create(child);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);

    // Subscribe to the second observable.
    const childSubscription1 = childObservable.subscribe(NOOP);
    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);

    // Clean up
    bodySubscription1.unsubscribe();
    childSubscription1.unsubscribe();
    document.body.removeChild(child);

    expect(ResizeObserverMock).toHaveBeenCalledTimes(0);
    expect(ResizeObserverMock.mock.instances).toHaveLength(0);
  });

  it('observes an element only once for any number of subscriptions', () => {
    // Create an observabe.
    const bodyObservable1 = ResizeObservable.create(document.body);
    expect(resizeObserverInstance.observe).not.toHaveBeenCalled();
    expect(resizeObserverInstance.unobserve).not.toHaveBeenCalled();

    // Subscribe once.
    const bodySubscription1 = bodyObservable1.subscribe(NOOP);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(1);
    expect(resizeObserverInstance.observe).toHaveBeenLastCalledWith(
      document.body,
    );

    // Subscribe twice.
    const bodySubscription2 = bodyObservable1.subscribe(NOOP);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(1);

    // Unsubscribe from second subscription.
    bodySubscription2.unsubscribe();
    expect(resizeObserverInstance.unobserve).not.toHaveBeenCalled();

    // Usubscribe from first subsription.
    bodySubscription1.unsubscribe();
    expect(resizeObserverInstance.unobserve).toHaveBeenCalledTimes(1);
    expect(resizeObserverInstance.unobserve).toHaveBeenLastCalledWith(
      document.body,
    );

    // Subscribe thrice.
    const bodySubscription3 = bodyObservable1.subscribe(NOOP);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(2);
    expect(resizeObserverInstance.observe).toHaveBeenLastCalledWith(
      document.body,
    );

    // Create a second observable.
    const bodyObservable2 = ResizeObservable.create(document.body);

    // Subscribe a fourth time, using the new observable.
    const bodySubscription4 = bodyObservable2.subscribe(NOOP);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(2);

    // Unsubscribe from third subscription.
    bodySubscription3.unsubscribe();
    expect(resizeObserverInstance.unobserve).toHaveBeenCalledTimes(1);

    // Unsubscribe from forth subscription.
    bodySubscription4.unsubscribe();
    expect(resizeObserverInstance.unobserve).toHaveBeenCalledTimes(2);
    expect(resizeObserverInstance.unobserve).toHaveBeenLastCalledWith(
      document.body,
    );

    // Create another node.
    const child = document.createElement('div');
    document.body.appendChild(child);

    // Create an observable of the new node.
    const childObservable = ResizeObservable.create(child);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(2);
    expect(resizeObserverInstance.unobserve).toHaveBeenCalledTimes(2);

    // Subscribe to the child observable.
    const childSubscription1 = childObservable.subscribe(NOOP);
    expect(resizeObserverInstance.observe).toHaveBeenCalledTimes(3);
    expect(resizeObserverInstance.observe).toHaveBeenLastCalledWith(child);

    // Unsubscribe from the child observable.
    childSubscription1.unsubscribe();
    expect(resizeObserverInstance.unobserve).toHaveBeenCalledTimes(3);
    expect(resizeObserverInstance.unobserve).toHaveBeenLastCalledWith(child);

    document.body.removeChild(child);
  });
});

describe('ResizeObservable', () => {
  jest.resetModules();
  jest.dontMock('@juggle/resize-observer');
  const ResizeObservable = require('../src');

  it('requires an element', () => {
    // @ts-ignore
    expect(() => ResizeObservable.create()).toThrowErrorMatchingInlineSnapshot(
      `"An instance of Element is required, but received undefined"`,
    );
    // @ts-ignore
    expect(() =>
      ResizeObservable.create(null),
    ).toThrowErrorMatchingInlineSnapshot(
      `"An instance of Element is required, but received null"`,
    );
    // @ts-ignore
    expect(() =>
      ResizeObservable.create({}),
    ).toThrowErrorMatchingInlineSnapshot(
      `"An instance of Element is required, but received [object Object]"`,
    );
  });

  it('initializes a new subscriber with the latest value', async () => {
    jest.useFakeTimers();
    // Create an element to observe.
    const el = document.createElement('div');
    el.style.width = '100px';
    document.body.appendChild(el);
    // Create an observabe.
    const bodyObservable1 = ResizeObservable.create(el);
    // Create a subscriber.
    const subscriber1 = jest.fn();
    // Subscribe once.
    const bodySubscription1 = bodyObservable1.subscribe(subscriber1);

    // flush macrotasks and microtasks
    jest.runAllTimers();

    expect(subscriber1).toHaveBeenCalledTimes(1);
    expect(subscriber1.mock.calls[0][0]).toMatchInlineSnapshot(`
            Object {
              "borderBoxSize": Object {
                "blockSize": 0,
                "inlineSize": 100,
              },
              "bottom": 0,
              "contentBoxSize": Object {
                "blockSize": 0,
                "inlineSize": 100,
              },
              "height": 0,
              "left": 0,
              "right": 100,
              "top": 0,
              "width": 100,
              "x": 0,
              "y": 0,
            }
        `);

    // Cleanup
    bodySubscription1.unsubscribe();
    el.remove();
  });

  it('updates an existing observer with a new size', async () => {
    jest.useFakeTimers();
    // Create an element to observe.
    const el = document.createElement('div');
    el.style.width = '100px';
    document.body.appendChild(el);
    // Create an observabe.
    const bodyObservable1 = ResizeObservable.create(el);
    // Create a subscriber.
    const subscriber1 = jest.fn();
    // Subscribe once.
    const bodySubscription1 = bodyObservable1.subscribe(subscriber1);

    // flush macrotasks and microtasks
    jest.runAllTimers();

    // Change element
    el.style.height = '100px';
    // HACK: Trigger MutationObserver (see jest.setup.js)
    document.body.textContent = 'yes';

    // flush macrotasks and microtasks
    jest.runAllTimers();

    expect(subscriber1).toHaveBeenCalledTimes(2);
    expect(subscriber1.mock.calls).toMatchInlineSnapshot(`
      Array [
        Array [
          Object {
            "borderBoxSize": Object {
              "blockSize": 0,
              "inlineSize": 100,
            },
            "bottom": 0,
            "contentBoxSize": Object {
              "blockSize": 0,
              "inlineSize": 100,
            },
            "height": 0,
            "left": 0,
            "right": 100,
            "top": 0,
            "width": 100,
            "x": 0,
            "y": 0,
          },
        ],
        Array [
          Object {
            "borderBoxSize": Object {
              "blockSize": 100,
              "inlineSize": 100,
            },
            "bottom": 100,
            "contentBoxSize": Object {
              "blockSize": 100,
              "inlineSize": 100,
            },
            "height": 100,
            "left": 0,
            "right": 100,
            "top": 0,
            "width": 100,
            "x": 0,
            "y": 0,
          },
        ],
      ]
    `);

    // Cleanup
    bodySubscription1.unsubscribe();
    el.remove();
  });
});

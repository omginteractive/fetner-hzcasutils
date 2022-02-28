/* eslint-env jest, browser */
import getComputedValue from './getComputedValue';

// We have to mock these aspects of HTMLElement because
// the underlying ResizeObserver polyfill uses them,
// but they're all `0` by default, resulting in no resize broadcasts!
const elementSpies: jest.SpyInstance[] = [];
beforeEach(() => {
  /**
   * Globally mock MutationObserver so it can be advanced using jest's fake timers.
   * We mock this because it is used by the ResizeObserver polyfill
   * to schedule microtasks.
   * See any of these to find out how deep the rabbit hole goes.
   * https://github.com/facebook/jest/issues/2157
   * https://github.com/facebook/jest/issues/7151
   * https://github.com/sinonjs/lolex/issues/114
   * https://gist.github.com/quasicomputational/1651489425f7f3b3a918ab857021d68b
   */
  // @ts-ignore
  global.MutationObserver = class MutationObserver {
    // @ts-ignore
    static original = global.MutationObserver;
    callback: MutationCallback;
    constructor(callback: MutationCallback) {
      this.callback = callback;
    }
    observe(el: Node): void {
      Object.defineProperty(el, 'textContent', {
        set: () => {
          // @ts-ignore
          setTimeout(() => this.callback([], this), 0);
        },
        configurable: true,
      });
    }
    disconnect(): void {
      this.callback = () => {};
    }
  };
  elementSpies.push(
    jest
      .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
      .mockImplementation(getComputedValue('width', Number)),
    jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockImplementation(getComputedValue('width', Number)),
    jest
      .spyOn(HTMLElement.prototype, 'clientHeight', 'get')
      .mockImplementation(getComputedValue('height', Number)),
    jest
      .spyOn(HTMLElement.prototype, 'offsetHeight', 'get')
      .mockImplementation(getComputedValue('height', Number)),
  );
});

afterEach(() => {
  // @ts-ignore
  global.MutationObserver = global.MutationObserver.original;
  while (elementSpies.length) {
    const spy = elementSpies.pop();
    if (spy) spy.mockRestore();
  }
});

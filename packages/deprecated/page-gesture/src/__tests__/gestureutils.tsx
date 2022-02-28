import {
  FromInputState,
  GestureLike,
  VerticalGestureLike,
  HorizontalGestureLike,
  KeyGestureLike,
  ARROW_DOWN,
  ARROW_LEFT,
  ARROW_RIGHT,
  ARROW_UP,
  END,
  HOME,
  PAGE_DOWN,
  PAGE_UP,
  SPACE,
} from '../usePageGesture';

export class GestureLikeSequence {
  cb: FromInputState;
  inputQueue: GestureLike[] = [];
  lastInput: GestureLike | null = null;
  constructor(cb: FromInputState) {
    this.cb = cb;
  }
  static create(cb: FromInputState): GestureLikeSequence {
    return new (this.prototype.constructor as typeof GestureLikeSequence)(cb);
  }
  updateGesture(
    value:
      | Pick<VerticalGestureLike, 'yDelta'>
      | Pick<HorizontalGestureLike, 'xDelta'>
      | Pick<KeyGestureLike, 'key'>,
  ): GestureLikeSequence {
    const nextInput: GestureLike = {
      ...this.lastInput,
      ...value,
      gesturing: true,
    };
    if ('yDelta' in nextInput) {
      if (this.lastInput && 'yDelta' in this.lastInput) {
        nextInput.yDelta = nextInput.yDelta += this.lastInput.yDelta;
      }
    }
    if ('xDelta' in nextInput) {
      if (this.lastInput && 'xDelta' in this.lastInput) {
        nextInput.xDelta = nextInput.xDelta += this.lastInput.xDelta;
      }
    }
    this.lastInput = nextInput;
    this.inputQueue.push(nextInput);
    return this;
  }
  up(distance = 50): GestureLikeSequence {
    return this.updateGesture({yDelta: -Math.abs(distance)});
  }
  down(distance = 50): GestureLikeSequence {
    return this.updateGesture({yDelta: Math.abs(distance)});
  }
  right(distance = 50): GestureLikeSequence {
    return this.updateGesture({xDelta: Math.abs(distance)});
  }
  left(distance = 50): GestureLikeSequence {
    return this.updateGesture({xDelta: -Math.abs(distance)});
  }
  space(): GestureLikeSequence {
    return this.updateGesture({key: SPACE});
  }
  pageUp(): GestureLikeSequence {
    return this.updateGesture({key: PAGE_UP});
  }
  pageDown(): GestureLikeSequence {
    return this.updateGesture({key: PAGE_DOWN});
  }
  end(): GestureLikeSequence {
    return this.updateGesture({key: END});
  }
  home(): GestureLikeSequence {
    return this.updateGesture({key: HOME});
  }
  arrowLeft(): GestureLikeSequence {
    return this.updateGesture({key: ARROW_LEFT});
  }
  arrowUp(): GestureLikeSequence {
    return this.updateGesture({key: ARROW_UP});
  }
  arrowRight(): GestureLikeSequence {
    return this.updateGesture({key: ARROW_RIGHT});
  }
  arrowDown(): GestureLikeSequence {
    return this.updateGesture({key: ARROW_DOWN});
  }
  async dispatch(input: GestureLike): Promise<void> {
    this.cb(input);
  }
  async run(): Promise<void> {
    const queue = [...this.inputQueue];
    const lastInput = this.lastInput;
    this.inputQueue = [];
    this.lastInput = null;
    for (const input of queue) {
      await this.dispatch(input);
    }
    if (lastInput) {
      await this.dispatch({...lastInput, gesturing: false});
    }
  }

  async then<Result = void, Reason = never>(
    resolve: () => Result | PromiseLike<Result>,
    reject?: ((reason: unknown) => Reason | PromiseLike<Reason>) | null,
  ): Promise<Result | Reason> {
    try {
      await this.run();
      return resolve();
    } catch (error) {
      if (reject) return reject(error);
      throw error;
    }
  }
}

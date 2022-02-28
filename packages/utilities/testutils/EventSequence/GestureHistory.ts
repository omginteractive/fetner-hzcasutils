export default class GestureHistory<T>
  implements ZenObservable.Observer<T>, Iterable<T> {
  history: T[] = [];
  _error: Error | null = null;
  _complete = false;
  next = (value: T): void => {
    this.history.push(value);
  };
  error = (error: Error): void => {
    this._error = error;
  };
  complete = (): void => {
    this._complete = true;
  };
  nth(i: number): T | null {
    return this.history[i - 1];
  }
  get size(): number {
    return this.history.length;
  }
  get first(): T | null {
    return this.history[0];
  }
  get last(): T | null {
    return this.history[this.history.length - 1];
  }
  *[Symbol.iterator](): Iterator<T> {
    let i = 0;
    while (i < this.history.length) {
      yield this.history[i++];
    }
  }
}

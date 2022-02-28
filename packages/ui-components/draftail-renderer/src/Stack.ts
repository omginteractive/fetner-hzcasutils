import {Block, BlockWithEntityMap} from './types';

export default class Stack {
  count: number = 0;
  storage: {
    [key: number]: Block | BlockWithEntityMap | (Block | BlockWithEntityMap)[];
  } = {};
  /**
   * Append a value to the end of the stack.
   */
  push(
    value: Block | BlockWithEntityMap | (Block | BlockWithEntityMap)[],
  ): void {
    this.storage[this.count] = value;
    this.count++;
  }
  /**
   * Removes and returns the value at the end of the stack.
   */
  pop(): unknown {
    if (this.count === 0) {
      return undefined;
    }
    this.count--;
    const result = this.storage[this.count];
    delete this.storage[this.count];
    return result;
  }

  /**
   *  Returns the current site of the stack.
   */
  size(): number {
    return this.count;
  }
  /**
   * Returns the value at the end of the stack
   */
  peek(): unknown {
    return this.storage[this.count - 1];
  }
}

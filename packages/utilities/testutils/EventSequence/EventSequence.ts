/* eslint-env jest */

interface Extensions {
  [key: string]: Function | false | null;
}

/**
 * Pick only the members of base type `B`
 * that extend the predicate type `T`.
 */
type PickType<B, T> = Pick<
  B,
  {[K in keyof B]: B[K] extends T ? K : never}[keyof B]
>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Newable = new (...args: any[]) => any;

export default class EventSequence<
  EventType extends Event = Event,
  EventInitType extends EventInit = EventInit
> implements PromiseLike<EventType[]> {
  constructor(public node: HTMLElement | Document) {}

  static create<T extends Newable>(
    this: T,
    ...args: ConstructorParameters<T>
  ): InstanceType<T> {
    return new this(...args);
  }

  eventQueue: [string, EventInitType?][] = [];
  dispatched: EventType[] = [];

  createNextEvent(
    type: string,
    init?: EventInitType,
    lastEvent?: EventType, // eslint-disable-line @typescript-eslint/no-unused-vars
  ): EventType {
    return new Event(type, init) as EventType;
  }

  normalizeEventInit(
    type: string,
    init?: EventInitType,
  ): EventInitType | undefined {
    return init;
  }

  dispatch<T extends EventSequence<EventType, EventInitType>>(
    this: T,
    type: string,
    init?: EventInitType,
  ): T {
    this.eventQueue.push([type, this.normalizeEventInit(type, init)]);
    return this;
  }

  expose<
    T extends EventSequence<EventType, EventInitType>,
    E extends Extensions
  >(
    this: T,
    extensions: E,
  ): Pick<T, Exclude<keyof T, keyof E>> & PickType<E, Function> {
    const extended = Object.assign(Object.create(this), extensions);
    for (const key in extensions) {
      if (key === 'dispatch' || key === 'expose' || key === 'run') continue;
      if (!Object.prototype.hasOwnProperty.call(extensions, key)) continue;
      if (!extensions[key]) extended[key] = undefined;
    }
    return extended;
  }

  run(): Promise<EventType[]> {
    return this.eventQueue.splice(0, this.eventQueue.length).reduce(
      (lastEvent, [eventType, eventInit]) =>
        lastEvent.then(async dispatched => {
          const nextEvent = this.createNextEvent(
            eventType,
            eventInit,
            dispatched[dispatched.length - 1],
          ) as EventType;
          this.node.dispatchEvent(nextEvent);
          dispatched.push(nextEvent);
          return dispatched;
        }),
      Promise.resolve(this.dispatched),
    );
  }

  async then<Result = EventType[], Reason = never>(
    resolve: (value: EventType[]) => Result | PromiseLike<Result>,
    reject?: ((reason: unknown) => Reason | PromiseLike<Reason>) | null,
  ): Promise<Result | Reason> {
    try {
      const result = await this.run();
      return resolve(result);
    } catch (error) {
      if (reject) return reject(error);
      throw error;
    }
  }
}

import Observable from 'zen-observable';
import {Source} from 'callbag';
import pipe from 'callbag-pipe';
import subscribe from 'callbag-subscribe';

type DebugObserver<E> = (e: E) => void;

export class DebugObservable<T, E> extends Observable<T> {
  constructor(
    subscriber: ZenObservable.Subscriber<T>,
    debugSubscriber: ZenObservable.Subscriber<E>,
  ) {
    super(subscriber);
    this._debugSubscriber = debugSubscriber;
  }

  _debugSubscriber: ZenObservable.Subscriber<E>;
  _debugObservable?: Observable<E>;

  __debug(
    debugObserver: DebugObserver<E>,
    ...observerArgs: Parameters<Observable<T>['subscribe']>
  ): ZenObservable.Subscription {
    if (!this._debugObservable) {
      this._debugObservable = new Observable(this._debugSubscriber);
    }
    const debugSubscription = this._debugObservable.subscribe(debugObserver);
    const subscription = this.subscribe(...observerArgs);
    return {
      get closed() {
        return subscription.closed && debugSubscription.closed;
      },
      unsubscribe(): void {
        subscription.unsubscribe();
        debugSubscription.unsubscribe();
      },
    };
  }
}

function asObservable<T>(source: Source<T>): Observable<T>;
function asObservable<T, E>(
  source: Source<T>,
  debugSource: Source<E>,
): DebugObservable<T, E>;
function asObservable<T, E>(
  source: Source<T>,
  debugSource?: Source<E>,
): Observable<T> | DebugObservable<T, E> {
  const subscriber: ZenObservable.Subscriber<T> = observer => {
    observer.next = observer.next.bind(observer);
    observer.error = observer.error.bind(observer);
    observer.complete = observer.complete.bind(observer);
    return pipe(source, subscribe(observer));
  };
  if (debugSource) {
    return new DebugObservable(subscriber, debugObserver => {
      debugObserver.next = debugObserver.next.bind(debugObserver);
      debugObserver.error = debugObserver.error.bind(debugObserver);
      debugObserver.complete = debugObserver.complete.bind(debugObserver);
      return pipe(debugSource, subscribe(debugObserver));
    });
  } else {
    return new Observable(subscriber);
  }
}

export default asObservable;

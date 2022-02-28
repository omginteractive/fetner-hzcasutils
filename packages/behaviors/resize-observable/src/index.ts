// NOTE: We _always_ use a ponyfill because the spec is still in flux,
// and if the spec (and thus, a native implementation) ends up straying
// far from where it was at the time this lib was last published, it
// may cause user code to fail in unexpected ways.
// Once the spec is stablized, we should switch to using the native
// version when available.
import {ResizeObserver, ResizeObserverEntry} from '@juggle/resize-observer';
import {ResizeObserverSize} from '@juggle/resize-observer/lib/ResizeObserverSize';
import Observable from 'zen-observable';
import {ensureDOMInstance} from '@hzdg/dom-utils';

export interface ResizeObservableSize extends DOMRectReadOnly {
  readonly contentBoxSize: ResizeObserverSize;
  readonly borderBoxSize: ResizeObserverSize;
}

type Observer = ZenObservable.SubscriptionObserver<ResizeObservableSize>;

const resizeObservers = new Map<Element, Set<Observer>>();
const latestSize = new Map<Element, ResizeObservableSize>();
let resizeObserver: ResizeObserver;

function createPayload(entry: ResizeObserverEntry): ResizeObservableSize {
  const {contentBoxSize, borderBoxSize, contentRect} = entry;
  const payload = Object.assign(
    {contentBoxSize: contentBoxSize[0], borderBoxSize: borderBoxSize[0]},
    contentRect,
  );
  const frozenPayload = Object.freeze(
    Object.assign(
      {
        toJSON() {
          return JSON.parse(
            JSON.stringify(this === frozenPayload ? payload : this),
          );
        },
      },
      payload,
    ),
  );
  return frozenPayload;
}

function createResizeObserver(): void {
  resizeObserver = new ResizeObserver(entries => {
    for (const entry of entries) {
      const {target: element} = entry;
      const observers = resizeObservers.get(element);
      if (observers) {
        const payload = createPayload(entry);
        latestSize.set(element, payload);
        observers.forEach(observer => observer.next(payload));
      }
    }
  });
}

export function create(element: Element): Observable<ResizeObservableSize> {
  ensureDOMInstance(element, Element);
  return new Observable((observer: Observer) => {
    if (!resizeObserver) createResizeObserver();
    let observers = resizeObservers.get(element);
    if (observers) {
      observers.add(observer);
      const size = latestSize.get(element);
      if (size) observer.next(size);
    } else {
      observers = new Set<Observer>([observer]);
      resizeObservers.set(element, observers);
      resizeObserver.observe(element);
    }
    return () => {
      if (observers) {
        observers.delete(observer);
        if (observers.size === 0) {
          latestSize.delete(element);
          resizeObservers.delete(element);
          resizeObserver.unobserve(element);
        }
      }
    };
  });
}

export default {create};

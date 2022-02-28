import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import useScrollIntersection from '../useScrollIntersection';

type Mutable<T> = {-readonly [K in keyof T]: T[K]};

const SCROLL_SIZE = 100;

function scrollTo(
  scrollLeft: number,
  scrollTop: number,
  dispatcher = document.body,
): void {
  fireEvent.scroll(dispatcher, {
    bubbles: true,
    target: {scrollLeft, scrollTop},
  });
}

describe('useScrollIntersection', () => {
  beforeAll(() => {
    // Monkeypatch `body.scrollWidth` and `body.scrollHeight`
    // to give our tests some scrollable area to play with.
    // We need to do this cuz jsdom doesn't actually do any layout,
    // so all sizes will always be reported as `0`.
    Object.defineProperties(document.body, {
      scrollWidth: {
        configurable: true,
        get() {
          return SCROLL_SIZE;
        },
      },
      scrollHeight: {
        configurable: true,
        get() {
          return SCROLL_SIZE;
        },
      },
    });
  });

  afterAll(() => {
    // Restore the original `body.scrollWidth` and `body.scrollHeight`.
    delete (document.body as Mutable<typeof document.body>).scrollWidth;
    delete (document.body as Mutable<typeof document.body>).scrollHeight;
  });

  it('updates intersection when it changes', () => {
    let intersecting;
    const ScrollIntersectionUser = (): JSX.Element => {
      const [intersection, ref] = useScrollIntersection({
        top: 2,
        right: 4,
        bottom: 4,
        left: 2,
      });
      intersecting = intersection;
      return <div ref={ref} />;
    };
    render(<ScrollIntersectionUser />);
    expect(intersecting).toBe(false);
    scrollTo(0, 1);
    expect(intersecting).toBe(false);
    scrollTo(0, 2);
    expect(intersecting).toBe(false);
    scrollTo(2, 2);
    expect(intersecting).toBe(true);
    scrollTo(2, 4);
    expect(intersecting).toBe(true);
    scrollTo(5, 4);
    expect(intersecting).toBe(false);
    scrollTo(3, 3);
    expect(intersecting).toBe(true);
    scrollTo(1, 1);
    expect(intersecting).toBe(false);
  });

  it('works on iframed elements', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument as Document;
    Object.defineProperties(doc.body, {
      scrollWidth: {
        configurable: true,
        get() {
          return SCROLL_SIZE;
        },
      },
      scrollHeight: {
        configurable: true,
        get() {
          return SCROLL_SIZE;
        },
      },
    });
    const node = doc.createElement('div');
    let intersecting;
    const ScrollIntersectionUser = (): JSX.Element => {
      const [intersection, ref] = useScrollIntersection({
        top: 2,
        right: 4,
        bottom: 4,
        left: 2,
      });
      intersecting = intersection;
      return <div ref={ref} data-testid="alien" />;
    };
    const {getByTestId} = render(<ScrollIntersectionUser />, {container: node});
    expect(getByTestId('alien')).toBeDefined();
    expect(getByTestId('alien')).not.toBeInstanceOf(HTMLDivElement);
    expect(intersecting).toBe(false);
    scrollTo(0, 1, doc.body);
    expect(intersecting).toBe(false);
    scrollTo(0, 2, doc.body);
    expect(intersecting).toBe(false);
    scrollTo(2, 2, doc.body);
    expect(intersecting).toBe(true);
    scrollTo(2, 4, doc.body);
    expect(intersecting).toBe(true);
    scrollTo(5, 4, doc.body);
    expect(intersecting).toBe(false);
    scrollTo(3, 3, doc.body);
    expect(intersecting).toBe(true);
    scrollTo(1, 1, doc.body);
    expect(intersecting).toBe(false);
  });
});

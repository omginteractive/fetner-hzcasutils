import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import useScrollPosition from '../useScrollPosition';

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

describe('useScrollPosition', () => {
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

  it('updates position when it changes', () => {
    const positions = new Set();
    const ScrollPositionUser = (): JSX.Element => {
      const ref = useScrollPosition(positions.add.bind(positions));
      return <div ref={ref} />;
    };
    render(<ScrollPositionUser />);
    scrollTo(0, 1);
    scrollTo(0, 2);
    scrollTo(0, 1);
    scrollTo(1, 1);
    scrollTo(2, 1);
    scrollTo(1, 1);
    expect(positions.size).toBe(6);
    expect(positions).toMatchInlineSnapshot(`
      Set {
        Object {
          "left": 0,
          "top": 1,
        },
        Object {
          "left": 0,
          "top": 2,
        },
        Object {
          "left": 0,
          "top": 1,
        },
        Object {
          "left": 1,
          "top": 1,
        },
        Object {
          "left": 2,
          "top": 1,
        },
        Object {
          "left": 1,
          "top": 1,
        },
      }
    `);
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
    const positions = new Set();
    const ScrollPositionUser = (): JSX.Element => {
      const ref = useScrollPosition(positions.add.bind(positions));
      return <div ref={ref} data-testid="alien" />;
    };
    const {getByTestId} = render(<ScrollPositionUser />, {container: node});
    expect(getByTestId('alien')).toBeDefined();
    expect(getByTestId('alien')).not.toBeInstanceOf(HTMLDivElement);
    scrollTo(0, 1, doc.body);
    scrollTo(0, 2, doc.body);
    scrollTo(0, 1, doc.body);
    scrollTo(1, 1, doc.body);
    scrollTo(2, 1, doc.body);
    scrollTo(1, 1, doc.body);
    expect(positions.size).toBe(6);
    expect(positions).toMatchInlineSnapshot(`
      Set {
        Object {
          "left": 0,
          "top": 1,
        },
        Object {
          "left": 0,
          "top": 2,
        },
        Object {
          "left": 0,
          "top": 1,
        },
        Object {
          "left": 1,
          "top": 1,
        },
        Object {
          "left": 2,
          "top": 1,
        },
        Object {
          "left": 1,
          "top": 1,
        },
      }
    `);
  });
});

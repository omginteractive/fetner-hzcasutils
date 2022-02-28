import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import useScrollDirection from '../useScrollDirection';

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

describe('useScrollDirection', () => {
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

  it('only updates direction when it changes', () => {
    const directions = new Set();
    const ScrollDirectionUser = (): JSX.Element => {
      const [direction, ref] = useScrollDirection();
      directions.add(direction);
      return <div ref={ref} />;
    };
    render(<ScrollDirectionUser />);
    expect(directions.size).toBe(1);
    scrollTo(0, 1);
    expect(directions.size).toBe(2);
    scrollTo(0, 2);
    expect(directions.size).toBe(2);
    scrollTo(0, 1);
    expect(directions.size).toBe(3);
    scrollTo(1, 1);
    expect(directions.size).toBe(4);
    scrollTo(2, 1);
    expect(directions.size).toBe(4);
    scrollTo(1, 1);
    expect(directions.size).toBe(5);
    expect(directions).toMatchInlineSnapshot(`
      Set {
        Object {
          "horizontal": null,
          "vertical": null,
        },
        Object {
          "horizontal": null,
          "vertical": "down",
        },
        Object {
          "horizontal": null,
          "vertical": "up",
        },
        Object {
          "horizontal": "right",
          "vertical": "up",
        },
        Object {
          "horizontal": "left",
          "vertical": "up",
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
    const directions = new Set();
    const ScrollDirectionUser = (): JSX.Element => {
      const [direction, ref] = useScrollDirection();
      directions.add(direction);
      return <div ref={ref} data-testid="alien" />;
    };
    const {getByTestId} = render(<ScrollDirectionUser />, {container: node});
    expect(getByTestId('alien')).toBeDefined();
    expect(getByTestId('alien')).not.toBeInstanceOf(HTMLDivElement);
    expect(directions.size).toBe(1);
    scrollTo(0, 1, doc.body);
    expect(directions.size).toBe(2);
    scrollTo(0, 2, doc.body);
    expect(directions.size).toBe(2);
    scrollTo(0, 1, doc.body);
    expect(directions.size).toBe(3);
    scrollTo(1, 1, doc.body);
    expect(directions.size).toBe(4);
    scrollTo(2, 1, doc.body);
    expect(directions.size).toBe(4);
    scrollTo(1, 1, doc.body);
    expect(directions.size).toBe(5);
    expect(directions).toMatchInlineSnapshot(`
      Set {
        Object {
          "horizontal": null,
          "vertical": null,
        },
        Object {
          "horizontal": null,
          "vertical": "down",
        },
        Object {
          "horizontal": null,
          "vertical": "up",
        },
        Object {
          "horizontal": "right",
          "vertical": "up",
        },
        Object {
          "horizontal": "left",
          "vertical": "up",
        },
      }
    `);
  });
});

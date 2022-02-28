/* eslint-env jest, browser */
import ensureDOMInstance from '../src/ensureDOMInstance';

test.each<unknown>([null, false, 0, 1, {}])(
  'ensureDOMInstance throws for invalid node `%s`',
  input => {
    expect(() =>
      (ensureDOMInstance as (...args: unknown[]) => null)(input),
    ).toThrow();
  },
);

test('ensureDOMInstance throws for node of different type', () => {
  const node = document.createElement('div');
  expect(() => ensureDOMInstance(node, HTMLAnchorElement)).toThrow();
});

test.each<Function>([Node, Element, HTMLElement, HTMLDivElement])(
  'ensureDOMInstance passes for div and type `%p`',
  type => {
    const node = document.createElement('div');
    expect(() => ensureDOMInstance(node, type)).not.toThrow();
  },
);

test('ensureDOMInstance passes for node in iframe', () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  const node = (iframe.contentDocument as Document).createElement('div');
  expect(node instanceof HTMLDivElement).toBe(false);
  expect(() => ensureDOMInstance(node, HTMLDivElement)).not.toThrow();
});

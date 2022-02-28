/* eslint-env jest, browser */
import getDocument from '../src/getDocument';

test('getDocument returns document by default', () => {
  let result = getDocument();
  expect(result).not.toBeFalsy();
  expect(result).toBe(document);

  result = getDocument(undefined);
  expect(result).not.toBeFalsy();
  expect(result).toBe(document);
});

test.each<unknown>([null, false, 0, 1, {}])(
  'getDocument returns null for invalid node `%s`',
  input => {
    const result = (getDocument as (...args: unknown[]) => null)(input);
    expect(result).toBeNull();
  },
);

test('getDocument returns document for valid node', () => {
  const node = document.createElement('div');
  expect(node).not.toBeFalsy();
  const result = getDocument(node);
  expect(result).not.toBeFalsy();
  expect(result).toBe(document);
});

test('getDocument returns iframe content document for valid node', () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  expect(iframe.contentDocument).not.toBeFalsy();
  const node = (iframe.contentDocument as Document).createElement('div');
  expect(node).not.toBeFalsy();
  expect(node instanceof Node).toBe(false);
  const result = getDocument(node);
  expect(result).not.toBeFalsy();
  expect(result).not.toBe(document);
  expect(result).toBe(iframe.contentDocument);
});

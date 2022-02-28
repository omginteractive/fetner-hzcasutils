/* eslint-env jest, browser */
import getWindow from '../src/getWindow';

test('getWindow returns window by default', () => {
  let result = getWindow();
  expect(result).not.toBeFalsy();
  expect(result).toBe(window);

  result = getWindow(undefined);
  expect(result).not.toBeFalsy();
  expect(result).toBe(window);
});

test.each<unknown>([null, false, 0, 1, {}])(
  'getWindow returns null for invalid node `%s`',
  input => {
    const result = (getWindow as (...args: unknown[]) => null)(input);
    expect(result).toBeNull();
  },
);

test('getWindow returns window for valid node', () => {
  const node = document.createElement('div');
  expect(node).not.toBeFalsy();
  const result = getWindow(node);
  expect(result).not.toBeFalsy();
  expect(result).toBe(window);
});

test('getWindow returns iframe content window for valid node', () => {
  const iframe = document.createElement('iframe');
  document.body.appendChild(iframe);
  expect(iframe.contentDocument).not.toBeFalsy();
  expect(iframe.contentWindow).not.toBeFalsy();
  const node = (iframe.contentDocument as Document).createElement('div');
  expect(node).not.toBeFalsy();
  expect(node instanceof Node).toBe(false);
  const result = getWindow(node);
  expect(result).not.toBeFalsy();
  expect(result).not.toBe(window);
  expect(result).toBe(iframe.contentWindow);
});

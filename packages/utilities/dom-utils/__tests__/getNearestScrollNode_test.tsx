/* eslint-env jest, browser */
import getNearestScrollNode from '../src/getNearestScrollNode';

describe('getNearestScrollnode', () => {
  it.each<unknown>([null, false, 0, 1, {}])(
    'returns `null` for invalid node `%s`',
    (input) => {
      expect(
        (getNearestScrollNode as (...args: unknown[]) => null)(input),
      ).toBeNull();
    },
  );

  it('returns document element by default', () => {
    const node = document.createElement('div');
    expect(getNearestScrollNode(node)).toBe(document.documentElement);
  });

  it('returns the element if it is scrollable', () => {
    const container = document.createElement('div');
    container.style.overflowX = 'scroll';
    document.body.appendChild(container);

    const node = document.createElement('div');
    container.appendChild(node);

    expect(getNearestScrollNode(container)).toBe(container);
  });

  it('returns the closest scrollable ancestor', () => {
    const container = document.createElement('div');
    container.style.overflowX = 'scroll';
    document.body.appendChild(container);

    const node = document.createElement('div');
    container.appendChild(node);

    expect(getNearestScrollNode(node)).toBe(container);

    const nestedContainer = document.createElement('div');
    nestedContainer.style.overflowY = 'scroll';
    node.appendChild(nestedContainer);

    const nestedNode = document.createElement('div');
    nestedContainer.appendChild(nestedNode);

    const deeplyNestedNode = document.createElement('div');
    nestedNode.appendChild(deeplyNestedNode);

    expect(getNearestScrollNode(nestedNode)).toBe(nestedContainer);
    expect(getNearestScrollNode(deeplyNestedNode)).toBe(nestedContainer);
  });

  it('returns iframe document element', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const node = (iframe.contentDocument as Document).createElement('div');
    const result = getNearestScrollNode(node);
    expect(result).not.toBeNull();
    expect(result).not.toBe(document.documentElement);
    expect(result).toBe(iframe.contentDocument?.documentElement);
  });
});

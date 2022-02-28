import isClient from './isClient';
import isDOMInstance from './isDOMInstance';
import findAncestor from './findAncestor';

/**
 * Whether or not the computed style has any of:
 *   - `transform` value other than `none`
 *   - `filter` value other than `none`
 *   - `will-change` value of `transform` or `perspective`
 *   - `contain` value of `paint`
 */
const hasContainedPaint = (style: CSSStyleDeclaration): boolean => {
  if (style.transform && style.transform !== 'none') return true;
  if (style.filter && style.filter !== 'none') return true;
  if (/transform/.test(style.willChange)) return true;
  if (/perspective/.test(style.willChange)) return true;
  if (/paint/.test(((style as unknown) as Record<string, string>).contain)) {
    return true;
  }
  return false;
};

/**
 * Whether or not the element establishes a block formatting context (BFC).
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/Guide/CSS/Block_formatting_context
 */
const hasBlockFormattingContext = (node: HTMLElement | null): boolean => {
  if (!node) return false;
  const style = getComputedStyle(node);

  // Floats create a BFC
  if (style.float && style.float !== 'none') return true;

  // Absolutely positioned elements create a BFC
  if (style.position === 'fixed') return true;
  if (style.position === 'absolute') return true;

  // Block containers create a BFC
  if (style.display.endsWith('block')) return true;

  // List items create a BFC.
  if (style.display === 'list-item') return true;

  // Table cells and captions create BFCs.
  if (style.display === 'table-cell') return true;
  if (style.display === 'table-caption') return true;

  // A new flow root creates a BFC.
  if (style.display === 'flow-root') return true;

  // Flex, grid, and table containers create formatting contexts,
  // but only if they are not flex or grid items (direct children
  // of another flex or grid container).
  if (
    style.display.endsWith('flex') ||
    style.display.endsWith('grid') ||
    style.display.endsWith('table')
  ) {
    if (!node.parentElement) return true;
    const {display} = getComputedStyle(node.parentElement);
    return !display.endsWith('flex') && !display.endsWith('grid');
  }

  return false;
};

/**
 * The containing element is the ancestor element that determines
 * the size and position of the element.
 *
 * Note that this somewhat distinct from the containing block,
 * which __may__ be the content box of the containing element,
 * or maybe the padding box of the containing element,
 * or maybe the viewport, all depending on the element `position`.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_Block
 *
 * The containing element is identified by
 * the element's `position` in the following ways:
 *
 * when `static`, `relative`, or `sticky`:
 *   - An `inline-block`, `block` or `list-item` displaying element
 *   - A table container
 *   - A flex container
 *   - A grid container
 *
 * when `fixed`:
 *   - the document element (viewport)
 *   - element with `transform` value other than `none`
 *   - element with `will-change` value of `transform` or `perspective`
 *   - element with `filter` value other than `none`
 *   - element with `contain` value of `paint`
 *
 * when `absolute`:
 *   - element with `position` value other than `static`
 *   - element with `transform` value other than `none`
 *   - element with `will-change` value of `transform` or `perspective`
 *   - element with `filter` value other than `none`
 *   - element with `contain` value of `paint`
 */
export default function getContainingElement(
  node: Node | null,
): HTMLElement | null {
  if (!isClient) return null;
  if (!isDOMInstance<HTMLElement>(node, HTMLElement)) return null;
  let ancestor: HTMLElement | null = null;
  switch (getComputedStyle(node).position) {
    case 'static':
    case 'relative':
    case 'sticky': {
      ancestor = findAncestor(node.parentElement, (parent) => {
        return hasBlockFormattingContext(parent);
      });
      break;
    }
    case 'absolute': {
      ancestor = findAncestor(node.parentElement, (parent) => {
        const style = getComputedStyle(parent);
        if (style.position && style.position !== 'static') return true;
        if (hasContainedPaint(style)) return true;
        return false;
      });
      break;
    }
    case 'fixed': {
      ancestor = findAncestor(node.parentElement, (parent) => {
        return hasContainedPaint(getComputedStyle(parent));
      });
      break;
    }
  }

  return ancestor ?? node.ownerDocument?.documentElement ?? null;
}

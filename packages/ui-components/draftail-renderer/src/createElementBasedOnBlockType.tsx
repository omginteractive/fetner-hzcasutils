import {CSSProperties} from 'react';

import createElement from './createElement';
import {Block, BlockWithEntityMap, BlockType, EntityMap} from './types';

/**
 * currently supported block types.
 */
export const UNSTYLED = 'unstyled';
export const ORDERED_LIST_ITEM = 'ordered-list-item';
export const UNORDERED_LIST_ITEM = 'unordered-list-item';
export const LINK = 'LINK';

/**
 * currently supported styles.
 */
export const BOLD = 'BOLD';
export const ITALIC = 'ITALIC';

function setStyleBasedOnStyleRanges(
  block: Block | BlockWithEntityMap,
): CSSProperties | {} {
  const {inlineStyleRanges} = block;
  if (inlineStyleRanges.length < 1) return {};
  const defaultStyles = {};
  inlineStyleRanges.forEach(({style}) => {
    switch (style) {
      case ITALIC:
        return Object.assign(defaultStyles, {fontStyle: 'italic'});
      case BOLD:
        return Object.assign(defaultStyles, {fontWeight: 'bold'});
      default:
        return defaultStyles;
    }
  });
  return defaultStyles;
}

export default function createElementBasedOnBlockType(
  block: Block | Block & {entityMap: EntityMap},
): JSX.Element | null {
  if (!block || !block.type || typeof block.type !== 'string') return null;
  switch (block.type as BlockType) {
    case LINK:
      return createElement('a', {
        key: `${block.key}_${block.text}_${block.data.url}`,
        href: block.data.url,
        style: setStyleBasedOnStyleRanges(block),
        children: block.text,
      });
    case UNSTYLED:
      return createElement('p', {
        key: `${block.key}_${block.text}`,
        style: setStyleBasedOnStyleRanges(block),
        children: block.text,
      });
    case ORDERED_LIST_ITEM:
    case UNORDERED_LIST_ITEM:
      return createElement('li', {
        key: `${block.key}_${block.text}`,
        style: setStyleBasedOnStyleRanges(block),
        children: block.isLink
          ? createElement('a', {
              key: `${block.key}_${block.text}_${block.data.url}`,
              href: block.data.url,
              style: setStyleBasedOnStyleRanges(block),
              children: block.text,
            })
          : block.text,
      });
    default:
      return null;
  }
}

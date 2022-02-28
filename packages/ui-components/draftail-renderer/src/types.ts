import React from 'react';
import {Components} from './context';
import {
  UNSTYLED,
  ORDERED_LIST_ITEM,
  UNORDERED_LIST_ITEM,
  LINK,
  BOLD,
  ITALIC,
} from './createElementBasedOnBlockType';

import {Map} from 'immutable';

export type BlockType =
  | typeof UNSTYLED
  | typeof ORDERED_LIST_ITEM
  | typeof UNORDERED_LIST_ITEM
  | typeof LINK;

export interface InlineStyleRange {
  length: number;
  offset: number;
  style: typeof BOLD | typeof ITALIC;
}

export interface EntityRange {
  key: number;
  length: number;
  offset: number;
}

export interface EntityMap {
  [key: string]: {
    data: {
      url: string;
    };
    mutability: 'MUTABLE' | 'IMMUTABLE';
    type: typeof LINK;
  };
}

export interface Block {
  depth: number;
  entityRanges: EntityRange[];
  inlineStyleRanges: InlineStyleRange[];
  key: string;
  text: string;
  type: BlockType;
  isLink?: boolean;
}

export type BlockWithEntityMap = Block & {entityMap: keyof EntityMap};

export interface RichTextNode {
  blocks: Block[];
  entityMap: EntityMap;
}

export interface DraftailRendererProps {
  body: RichTextNode | {};
  components?: Components;
}

export interface DraftBlockRenderConfig {
  /**
   * Element tag to target
   */
  element?: string;

  /**
   * Component to wrap around targetted element
   */
  wrapper?: JSX.Element;

  /**
   * Other elements to target with the wrapper component
   */
  aliasedElements?: Array<string>;
}

export interface DraftailRenderProps {

  /**
   * Draftjs object
   */
  body: RichTextNode | {};

  /**
   * An Immutable Map containing custom component blocks
   * See: https://draftjs.org/docs/advanced-topics-custom-block-render-map/
   */
  componentBlockMap?: Map<string, DraftBlockRenderConfig>;

  /**
   * Component for link components with entity types 'LINK'
   */
  linkComponent: JSX.Element;

  /**
   *  Support for custom rich text
   *  See https://draftjs.org/docs/advanced-topics-decorators
   */
  customDecoratorStrategies: {
    strategy: (
      contentBlock: RichTextNode,
      callback: any,
      contentState: RichTextNode,
    ) => void;
    component: JSX.Element;
  }[];
}
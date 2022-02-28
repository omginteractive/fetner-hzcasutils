import React from 'react';

import DraftailProvider from './context';
import createElementBasedOnBlockType, {
  UNSTYLED,
} from './createElementBasedOnBlockType';
import parseInlinedLinks from './parseInlinedLinks';
import createElement from './createElement';
import sortNestedLists from './sortNestedLists';
import groupBlocksByType, {
  isOrderedListItem,
  isUnorderedListItem,
} from './groupBlocksByType';
import {
  Block,
  BlockWithEntityMap,
  DraftailRendererProps,
  DraftailRenderProps,
  RichTextNode,
  EntityMap,
} from './types';
import {
  CompositeDecorator,
  DefaultDraftBlockRenderMap,
  Editor,
  EditorState,
  convertFromRaw,
} from 'draft-js';

function renderLists(
  block: (Block | BlockWithEntityMap)[] | (Block | BlockWithEntityMap),
): JSX.Element | null {
  if (!Array.isArray(block)) {
    return createElementBasedOnBlockType(block);
  } else {
    return isOrderedListItem(block[0]) ? (
      <ol key={`ordered_${block[0].key}`}>{block.map(renderLists)}</ol>
    ) : isUnorderedListItem(block[0]) ? (
      <ul key={`unordered_${block[0].key}`}>{block.map(renderLists)}</ul>
    ) : null;
  }
}

function renderList(block: (Block | BlockWithEntityMap)[]): JSX.Element | null {
  const sortedNestedLists = sortNestedLists(block);
  if (sortedNestedLists) {
    return renderLists(sortedNestedLists);
  } else {
    return null;
  }
}

function renderInlinedLinks(block: BlockWithEntityMap): JSX.Element | null {
  return createElement('p', {
    key: `${block.key}`,
    children: parseInlinedLinks(block),
  });
}

function mapEntityToBlock(
  blocks: Block[],
  entityMap: EntityMap,
): (Block | BlockWithEntityMap)[] {
  return (
    blocks
      .map(block => {
        /**
         * if the block has an entityMap assosiated with it by `key`
         * we're mapping the data of that entityMap to the block and
         * merging those 2 objects together.
         */
        if (block.entityRanges && block.entityRanges.length > 0 && entityMap) {
          // console.log(entityMap, block);
          for (const key of Object.keys(entityMap as EntityMap)) {
            for (const value of Object.values(block.entityRanges)) {
              if (Number(value.key) === Number(key)) {
                let blockWithEntity;

                /**
                 * if the block(typeof UNSTYLED) doesn't have any styles applied to it,
                 * we can merge it with its entityMap. the type will become LINK.
                 */
                if (block.type === UNSTYLED) {
                  blockWithEntity = Object.assign({}, block, {
                    entityMap,
                    type: block.type,
                  });
                  return blockWithEntity;
                } else {
                  /**
                   * if there is a specific(not unstyled) type applied to a block,
                   * we need to preserve that type and add a flag to an object
                   * saying that it also should be a link. Solves an issue when a link
                   * is a part of un/ordered list.
                   */
                  blockWithEntity = Object.assign({}, block, entityMap[key], {
                    type: block.type,
                    isLink: true,
                  });
                  return blockWithEntity;
                }
              }
            }
          }
        }
        return block as Block;
      })
      /**
       * Filtering:
       * 1. Empty objects.
       * 2. Blocks without type. We're doing further filtering primarily based
       * on a type.
       */
      .filter(block => Boolean(Object.keys(block).length > 0 && block.type))
  );
}

function renderBlocksWithEntities(
  blocks: (Block | BlockWithEntityMap)[],
): JSX.Element | JSX.Element[] | (JSX.Element | null)[] | null {
  const groupedBlocks = groupBlocksByType(blocks);
  if (!groupedBlocks || groupedBlocks.length === 0) return null;
  return groupedBlocks
    .map(block => {
      if (Array.isArray(block)) {
        return renderList(block as (Block | BlockWithEntityMap)[]);
      } else if (block.entityRanges && block.entityRanges.length > 0) {
        return renderInlinedLinks(block as BlockWithEntityMap);
      } else {
        return createElementBasedOnBlockType(block);
      }
    })
    .filter(Boolean);
}

export default function DraftailRenderer({
  components = {},
  body = {},
}: DraftailRendererProps): JSX.Element | null {
  if (
    !body ||
    !(body as RichTextNode).blocks ||
    (body as RichTextNode).blocks.length === 0
  ) {
    return null;
  }
  const {blocks = [], entityMap = {}} = body as RichTextNode;
  const blocksWithEntities = mapEntityToBlock(blocks, entityMap);

  return (
    <DraftailProvider components={components}>
      {renderBlocksWithEntities(blocksWithEntities)}
    </DraftailProvider>
  );
}

/**
 * Scans through content to identity link entities
 *
 * See https://draftjs.org/docs/advanced-topics-decorators/#compositedecorator
 *
 * @param contentBlock
 * @param callback
 * @param contentState
 *
 */
function findLinkEntities(contentBlock, callback, contentState) {
  contentBlock.findEntityRanges(character => {
    const entityKey = character.getEntity();
    return (
      entityKey !== null &&
      contentState.getEntity(entityKey).getType() === 'LINK'
    );
  }, callback);
}

/**
 * DraftailRender (not to be confused with DraftailRenderer) leverages
 * DraftJs's existing features to render components from the returned
 * content state from the backend.
 *
 */
export function DraftailRender({
  body = {},
  componentBlockMap = null,
  linkComponent = null,
  customDecoratorStrategies = [],
}: DraftailRenderProps): JSX.Element {
  const contentState = convertFromRaw(body);
  const editorState = EditorState.createWithContent(contentState);
  const extendedBlockRenderMap = componentBlockMap
    ? DefaultDraftBlockRenderMap.merge(componentBlockMap)
    : DefaultDraftBlockRenderMap;
  const linkStrategy = {
    strategy: findLinkEntities,
    component: linkComponent,
  };
  const decorator = new CompositeDecorator([
    ...customDecoratorStrategies,
    linkStrategy,
  ]);
  return (
    <Editor
      editorState={EditorState.set(editorState, {decorator})}
      blockRenderMap={extendedBlockRenderMap}
      readOnly={true}
    />
  );
}

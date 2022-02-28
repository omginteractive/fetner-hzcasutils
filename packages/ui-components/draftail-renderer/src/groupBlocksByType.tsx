import {Block, BlockWithEntityMap} from './types';
import {
  ORDERED_LIST_ITEM,
  UNORDERED_LIST_ITEM,
} from './createElementBasedOnBlockType';

export function isOrderedListItem(block: Block | BlockWithEntityMap): boolean {
  return Boolean(block.type === ORDERED_LIST_ITEM);
}

export function isUnorderedListItem(
  block: Block | BlockWithEntityMap,
): boolean {
  return Boolean(block.type === UNORDERED_LIST_ITEM);
}

export function isListItem(block: Block | BlockWithEntityMap): boolean {
  if (!block) return false;
  return isOrderedListItem(block) || isUnorderedListItem(block);
}

export default function groupBlocksByType(
  blocksWithEntities: (Block | BlockWithEntityMap)[],
): (Block | BlockWithEntityMap)[] | null {
  if (!blocksWithEntities || blocksWithEntities.length === 0) return null;
  let pointer = 1;
  return blocksWithEntities.reduce(
    (
      blocks: (Block | BlockWithEntityMap)[],
      currBlock: Block | BlockWithEntityMap,
      currIndex,
    ) => {
      const nextBlock = blocksWithEntities[currIndex + 1];
      if (
        isListItem(currBlock) ||
        (nextBlock && isListItem(currBlock) && isListItem(nextBlock))
      ) {
        /**
         * check if the block's depth is not 0
         */
        if (blocks.length > 0 && Array.isArray(blocks[currIndex - pointer])) {
          blocks[currIndex - pointer].push(currBlock);
          pointer++;
        } else {
          let list: (Block | BlockWithEntityMap)[] = [];
          list.push(currBlock);
          blocks.push(list);
        }
      } else {
        blocks.push(currBlock);
      }
      return blocks;
    },
    [],
  );
}

import Stack from './Stack';
import {Block, BlockWithEntityMap} from './types';

export default function sortNestedLists(
  blocks: (Block | BlockWithEntityMap)[],
): (Block | BlockWithEntityMap)[] | null {
  const stack = new Stack();
  let currentDepth = 0;
  if (!blocks || blocks.length === 0) return null;
  blocks.forEach(block => {
    if (block.depth === currentDepth) {
      stack.push(block);
    } else if (block.depth < currentDepth) {
      currentDepth--;
      let stackPeek = stack.pop();
      if (stackPeek && Array.isArray(stackPeek)) {
        let currentPeek = stack.peek();
        if (Array.isArray(currentPeek)) {
          currentPeek.push(stackPeek);
          currentPeek.push(block);
        } else {
          stack.push(stackPeek);
          stack.push(block);
        }
      }
    } else if (block.depth > currentDepth) {
      currentDepth++;
      stack.push([block]);
    } else {
      // noop ? we should never get here.
    }
  });

  // TODO: type this somehow
  return Object.values(stack.storage);
}

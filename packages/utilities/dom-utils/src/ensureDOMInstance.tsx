import invariant from 'invariant';
import isDOMInstance from './isDOMInstance';

export default function ensureDOMInstance<T extends Node>(
  node: T,
  type: Function = Node,
): void {
  invariant(
    isDOMInstance(node, type),
    `An instance of ${type.name} is required, but received ${node}`,
  );
}

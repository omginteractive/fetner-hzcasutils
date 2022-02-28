export default function getDocument(node?: Node | null): Document | null {
  if (!node && typeof node !== 'undefined') return null;
  if (node) {
    if (node.ownerDocument) {
      return node.ownerDocument;
    } else if (typeof node.getRootNode === 'function') {
      const root = node.getRootNode();
      if (root && 'defaultView' in (root as object)) {
        return root as Document;
      }
    }
  } else if (typeof document !== 'undefined') {
    return document;
  }
  return null;
}

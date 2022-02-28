import getDocument from './getDocument';

export default function getWindow(node?: Node | null): Window | null {
  if (!node && typeof node !== 'undefined') return null;
  if (node) {
    const document = getDocument(node);
    if (document) {
      return document.defaultView;
    }
  } else if (typeof window !== 'undefined') {
    return window;
  } else if (typeof document !== 'undefined') {
    return document.defaultView;
  }
  return null;
}

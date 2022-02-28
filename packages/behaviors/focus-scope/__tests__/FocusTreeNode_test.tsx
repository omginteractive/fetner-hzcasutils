import React from 'react';
import FocusTreeNode, {isTabbable} from '../src/FocusTreeNode';

describe('FocusTreeNode', () => {
  const offsetParentDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElement.prototype,
    'offsetParent',
  );

  beforeAll(() => {
    // Polyfill `HTMLElement.offsetParent` because we expect it
    // to be defined for a focusable node, but JSDOM doesn't implement it.
    // See https://github.com/jsdom/jsdom/issues/1261
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        let element = this;
        while (
          element &&
          (!element.style ||
            !element.style.display ||
            element.style.display.toLowerCase() !== 'none')
        ) {
          element = element.parentNode;
        }

        if (element) {
          return null;
        }

        if (
          this.style &&
          this.style.position &&
          this.style.position.toLowerCase() === 'fixed'
        ) {
          return null;
        }

        if (
          this.tagName.toLowerCase() === 'html' ||
          this.tagName.toLowerCase() === 'body'
        ) {
          return null;
        }

        return this.parentNode;
      },
    });
  });

  afterAll(() => {
    // Restore original `HTMLElement.offsetParent`.
    if (offsetParentDescriptor) {
      Object.defineProperty(
        HTMLElement.prototype,
        'offsetParent',
        offsetParentDescriptor,
      );
    }
  });

  afterEach(() => {
    // Remove any nodes added to the document in tests.
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.childNodes[0]);
    }
  });

  it('accepts an element `domTarget`', () => {
    const element = document.createElement('div');
    const node = new FocusTreeNode(element);
    expect(node.domTarget).toBe(element);
  });

  it('errors for an invalid `domTarget`', () => {
    const ref = React.createRef() as React.RefObject<Element>;
    expect(() => new FocusTreeNode((ref as unknown) as Element)).toThrow();
  });

  it("appends the new node to a parent's child nodes", () => {
    const div = (): HTMLDivElement => document.createElement('div');
    const parent = new FocusTreeNode(div());
    const child = new FocusTreeNode(div(), null, parent);
    expect(parent.hasChildNodes()).toBe(true);
    expect(parent.getChildNodes()).toEqual([child]);
  });

  it('sets a parent on this node', () => {
    const div = (): HTMLDivElement => document.createElement('div');
    const parent = new FocusTreeNode(div());
    const child = new FocusTreeNode(div(), null, parent);
    expect(child.parent).toBe(parent);
  });

  it('errors for an existing child node for the same domTarget', () => {
    const parent = new FocusTreeNode(document.createElement('div'));
    const div = document.createElement('div');
    new FocusTreeNode(div, null, parent);
    expect(() => new FocusTreeNode(div, null, parent)).toThrow();
  });

  it('errors if parent is circular', () => {
    const div = (): HTMLDivElement => document.createElement('div');
    const node = new FocusTreeNode(div());
    const childNode = new FocusTreeNode(div(), null, node);
    expect(() => node.root).not.toThrow();
    expect(() => childNode.root).not.toThrow();

    ((node as unknown) as {
      _parent: typeof node;
    })._parent = childNode;
    expect(() => node.root).toThrow();
    expect(() => childNode.root).toThrow();
  });

  it('sets an id for the node', () => {
    const node = new FocusTreeNode(document.createElement('div'), 'test');
    expect(node.id).toBe('test');
  });

  it('errors for an existing id anywhere in the tree', () => {
    const div = (): HTMLDivElement => document.createElement('div');
    const parent = new FocusTreeNode(div(), 'test');
    const child = new FocusTreeNode(div(), null, parent);
    const grandchild = new FocusTreeNode(div(), 'test2', child);
    const sibling = new FocusTreeNode(div(), null, parent);

    expect(
      () => new FocusTreeNode(document.createElement('div'), 'test', parent),
    ).toThrow();
    expect(
      () =>
        new FocusTreeNode(document.createElement('div'), 'test', grandchild),
    ).toThrow();
    expect(
      () => new FocusTreeNode(document.createElement('div'), 'test2', sibling),
    ).toThrow();
  });

  describe('subscribe', () => {
    it('errors without a callback', () => {
      const el = document.createElement('div');
      const node = new FocusTreeNode(el);
      expect(() =>
        ((node as unknown) as {
          subscribe(): void;
        }).subscribe(),
      ).toThrow();
    });

    it('accepts a callback', () => {
      const el = document.createElement('div');
      const node = new FocusTreeNode(el);
      const cb = jest.fn();
      const subscription = node.subscribe(cb);
      expect(subscription).toBeDefined();
      expect(subscription.unsubscribe).toBeDefined();
      subscription.unsubscribe();
    });

    it('calls the subscribed callback on focus', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const node = new FocusTreeNode(input);
      const cb = jest.fn();
      const subscription = node.subscribe(cb);
      expect(cb).not.toHaveBeenCalled();
      input.focus();
      expect(cb).toHaveBeenCalledTimes(1);
      expect(cb).toHaveBeenLastCalledWith(expect.any(FocusEvent));
      subscription.unsubscribe();
    });

    it('does not call the callback after unsubscribe', () => {
      const input = document.createElement('input');
      document.body.appendChild(input);
      const node = new FocusTreeNode(input);
      const cb = jest.fn();
      const subscription = node.subscribe(cb);
      expect(cb).not.toHaveBeenCalled();
      subscription.unsubscribe();
      expect(cb).not.toHaveBeenCalled();
      input.focus();
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('removes the node from its parent', () => {
      const parent = new FocusTreeNode(document.createElement('div'));
      const child = new FocusTreeNode(
        document.createElement('input'),
        null,
        parent,
      );

      expect(child.parent).toBe(parent);
      expect(parent.hasChildNodes()).toBe(true);

      child.remove();
      expect(child.parent).toBeNull();
      expect(parent.hasChildNodes()).toBe(false);
    });

    it('unsubscribes any subscribers', () => {
      const div = document.createElement('div');
      div.tabIndex = 0;
      document.body.appendChild(div);
      const parent = new FocusTreeNode(div);

      const input = document.createElement('input');
      div.appendChild(input);
      const child = new FocusTreeNode(input, null, parent);
      const cb = jest.fn();
      child.subscribe(cb);

      div.focus();
      expect(cb).toHaveBeenCalledTimes(1);

      input.focus();
      expect(cb).toHaveBeenCalledTimes(2);

      child.remove();
      div.focus();
      expect(cb).toHaveBeenCalledTimes(2);
    });
  });

  describe('getChildNodes', () => {
    it('returns an empty array when there are no child nodes', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parent = new FocusTreeNode(div());
      expect(parent.getChildNodes()).toEqual([]);
      const child = new FocusTreeNode(div(), null, parent);
      new FocusTreeNode(div(), null, child);
      const sibling = new FocusTreeNode(div(), null, parent);
      expect(sibling.getChildNodes()).toEqual([]);
    });

    it('returns an array of child nodes', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parent = new FocusTreeNode(div());
      const child = new FocusTreeNode(div(), null, parent);
      const grandchild = new FocusTreeNode(div(), null, child);
      const sibling = new FocusTreeNode(div(), null, parent);
      expect(parent.getChildNodes()).toEqual([child, sibling]);
      expect(child.getChildNodes()).toEqual([grandchild]);
    });
  });

  describe('hasChildNodes', () => {
    it('returns false when there are no child nodes', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parent = new FocusTreeNode(div());
      expect(parent.hasChildNodes()).toBe(false);
      const child = new FocusTreeNode(div(), null, parent);
      new FocusTreeNode(div(), null, child);
      const sibling = new FocusTreeNode(div(), null, parent);
      expect(sibling.hasChildNodes()).toBe(false);
    });

    it('returns true when there are child nodes', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parent = new FocusTreeNode(div());
      const child = new FocusTreeNode(div(), null, parent);
      new FocusTreeNode(div(), null, child);
      new FocusTreeNode(div(), null, parent);
      expect(parent.hasChildNodes()).toBe(true);
      expect(child.hasChildNodes()).toBe(true);
    });
  });

  describe('findClosestNode', () => {
    it('finds this node when it is closest to the DOM node', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      const element = div(parentElement);
      const child = new FocusTreeNode(element, null, parent);
      expect(child.findClosestNode(element)).toBe(child);
    });

    it('finds the closest tree node to the DOM node', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, parent);
      const sibling = new FocusTreeNode(siblingElement, null, parent);

      expect(parent.findClosestNode(grandchildElement)).toBe(grandchild);
      expect(parent.findClosestNode(childElement)).toBe(parent);
      expect(parent.findClosestNode(parentElement)).toBe(parent);
      expect(parent.findClosestNode(siblingElement)).toBe(sibling);

      expect(grandchild.findClosestNode(grandchildElement)).toBe(grandchild);

      expect(sibling.findClosestNode(siblingElement)).toBe(sibling);
    });

    it('returns null when there is no tree node close to the DOM node', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, parent);
      const sibling = new FocusTreeNode(siblingElement, null, parent);
      const orphanElement = div();

      expect(parent.findClosestNode(orphanElement)).toBeNull();

      expect(grandchild.findClosestNode(orphanElement)).toBeNull();
      expect(grandchild.findClosestNode(childElement)).toBeNull();
      expect(grandchild.findClosestNode(parentElement)).toBeNull();
      expect(grandchild.findClosestNode(siblingElement)).toBeNull();

      expect(sibling.findClosestNode(orphanElement)).toBeNull();
      expect(sibling.findClosestNode(grandchildElement)).toBeNull();
      expect(sibling.findClosestNode(childElement)).toBeNull();
      expect(sibling.findClosestNode(parentElement)).toBeNull();
    });
  });

  describe('findNode', () => {
    it('finds a descendant node for the given element', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      const childElement = div();
      const child = new FocusTreeNode(childElement, null, parent);
      const grandchildElement = div();
      const grandchild = new FocusTreeNode(grandchildElement, null, child);

      expect(parent.findNode(parentElement)).toBe(parent);
      expect(parent.findNode(childElement)).toBe(child);
      expect(parent.findNode(grandchildElement)).toBe(grandchild);
      expect(child.findNode(childElement)).toBe(child);
      expect(child.findNode(grandchildElement)).toBe(grandchild);
      expect(grandchild.findNode(grandchildElement)).toBe(grandchild);
    });

    it('returns null when there is no descendantt node for the element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      const childElement = div(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      const grandchildElement = div(childElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);

      expect(parent.findNode(div(parentElement))).toBeNull();
      expect(child.findNode(div(childElement))).toBeNull();
      expect(child.findNode(parentElement)).toBeNull();
      expect(grandchild.findNode(div(grandchildElement))).toBeNull();
      expect(grandchild.findNode(childElement)).toBeNull();
      expect(grandchild.findNode(parentElement)).toBeNull();
    });
  });

  describe('findNodeById', () => {
    it('finds a node by id', () => {
      const div = (): HTMLDivElement => document.createElement('div');
      const parent = new FocusTreeNode(div(), 'parent');
      const child = new FocusTreeNode(div(), 'child', parent);
      const grandchild = new FocusTreeNode(div(), 'grandchild', child);
      const sibling = new FocusTreeNode(div(), 'sibling', parent);

      expect(parent.findNodeById('parent')).toBe(parent);
      expect(parent.findNodeById('child')).toBe(child);
      expect(parent.findNodeById('grandchild')).toBe(grandchild);
      expect(parent.findNodeById('sibling')).toBe(sibling);

      expect(child.findNodeById('parent')).toBe(parent);
      expect(child.findNodeById('child')).toBe(child);
      expect(child.findNodeById('grandchild')).toBe(grandchild);
      expect(child.findNodeById('sibling')).toBe(sibling);

      expect(grandchild.findNodeById('parent')).toBe(parent);
      expect(grandchild.findNodeById('child')).toBe(child);
      expect(grandchild.findNodeById('grandchild')).toBe(grandchild);
      expect(grandchild.findNodeById('sibling')).toBe(sibling);

      expect(sibling.findNodeById('parent')).toBe(parent);
      expect(sibling.findNodeById('child')).toBe(child);
      expect(sibling.findNodeById('grandchild')).toBe(grandchild);
      expect(sibling.findNodeById('sibling')).toBe(sibling);
    });

    it('returns null if no node by the given id exists', () => {
      const node = new FocusTreeNode(document.createElement('div'), 'node');
      expect(node.findNodeById('node')).toBe(node);
      expect(node.findNodeById('fake')).toBeNull();
    });
  });

  describe('getFocusedElementGlobal', () => {
    it('gets the currently focused element regardless of scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      const siblingElement = div(parentElement);
      siblingElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      const sibling = new FocusTreeNode(siblingElement);

      expect(child.getFocusedElementGlobal()).toBe(document.body);
      expect(grandchild.getFocusedElementGlobal()).toBe(document.body);
      expect(sibling.getFocusedElementGlobal()).toBe(document.body);

      childElement.focus();
      expect(child.getFocusedElementGlobal()).toBe(childElement);
      expect(grandchild.getFocusedElementGlobal()).toBe(childElement);
      expect(sibling.getFocusedElementGlobal()).toBe(childElement);

      grandchildElement.focus();
      expect(child.getFocusedElementGlobal()).toBe(grandchildElement);
      expect(grandchild.getFocusedElementGlobal()).toBe(grandchildElement);
      expect(sibling.getFocusedElementGlobal()).toBe(grandchildElement);

      siblingElement.focus();
      expect(child.getFocusedElementGlobal()).toBe(siblingElement);
      expect(grandchild.getFocusedElementGlobal()).toBe(siblingElement);
      expect(sibling.getFocusedElementGlobal()).toBe(siblingElement);

      parentElement.focus();
      expect(child.getFocusedElementGlobal()).toBe(parentElement);
      expect(grandchild.getFocusedElementGlobal()).toBe(parentElement);
      expect(sibling.getFocusedElementGlobal()).toBe(parentElement);
    });
  });

  describe('getFocusedElement', () => {
    it('gets the currently focused element when it is in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      const grandchildSiblingElement = div(childElement);
      grandchildSiblingElement.tabIndex = 0;
      const siblingElement = div(parentElement);
      siblingElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      const sibling = new FocusTreeNode(siblingElement);

      childElement.focus();
      expect(child.getFocusedElement()).toBe(childElement);

      grandchildElement.focus();
      expect(grandchild.getFocusedElement()).toBe(grandchildElement);

      grandchildSiblingElement.focus();
      expect(child.getFocusedElement()).toBe(grandchildSiblingElement);

      siblingElement.focus();
      expect(sibling.getFocusedElement()).toBe(siblingElement);
    });

    it('returns null when the currently focused element is not in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      const grandchildSiblingElement = div(childElement);
      grandchildSiblingElement.tabIndex = 0;
      const siblingElement = div(parentElement);
      siblingElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      const sibling = new FocusTreeNode(siblingElement);

      expect(child.getFocusedElement()).toBeNull();
      expect(grandchild.getFocusedElement()).toBeNull();
      expect(sibling.getFocusedElement()).toBeNull();

      parentElement.focus();
      expect(child.getFocusedElement()).toBeNull();
      expect(grandchild.getFocusedElement()).toBeNull();
      expect(sibling.getFocusedElement()).toBeNull();

      childElement.focus();
      expect(child.getFocusedElement()).not.toBeNull();
      expect(grandchild.getFocusedElement()).toBeNull();
      expect(sibling.getFocusedElement()).toBeNull();

      grandchildElement.focus();
      expect(child.getFocusedElement()).toBeNull();
      expect(grandchild.getFocusedElement()).not.toBeNull();
      expect(sibling.getFocusedElement()).toBeNull();

      grandchildSiblingElement.focus();
      expect(child.getFocusedElement()).not.toBeNull();
      expect(grandchild.getFocusedElement()).toBeNull();
      expect(sibling.getFocusedElement()).toBeNull();

      siblingElement.focus();
      expect(child.getFocusedElement()).toBeNull();
      expect(grandchild.getFocusedElement()).toBeNull();
      expect(sibling.getFocusedElement()).not.toBeNull();
    });
  });

  describe('containsFocusableElements', () => {
    it('returns true when any element is in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      expect(parent.containsFocusableElements()).toBe(true);

      const childElement = div(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(child.containsFocusableElements()).toBe(false);

      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      expect(child.containsFocusableElements()).toBe(true);
    });

    it('returns false when no focusable element is in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      expect(parent.containsFocusableElements()).toBe(false);

      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElements()).toBe(false);
      expect(child.containsFocusableElements()).toBe(true);

      const grandchildElement = div(childElement);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      expect(parent.containsFocusableElements()).toBe(false);
      expect(child.containsFocusableElements()).toBe(true);
      expect(grandchild.containsFocusableElements()).toBe(false);
    });

    it('returns false when an element is focusable, but predicate excludes it', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = -1;
      const parent = new FocusTreeNode(parentElement);
      expect(parent.containsFocusableElements()).toBe(true);
      expect(parent.containsFocusableElements(false, isTabbable)).toBe(false);
    });

    it('returns false when a focusable element is in nested in scope and `includeNested` is falsy', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElements()).toBe(false);
      expect(parent.containsFocusableElements(false)).toBe(false);
      expect(child.containsFocusableElements()).toBe(true);
      expect(child.containsFocusableElements(false)).toBe(true);
    });

    it('returns true when a focusable element is in nested scope and `includeNested` is true', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const parent = new FocusTreeNode(parentElement);
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElements()).toBe(false);
      expect(parent.containsFocusableElements(true)).toBe(true);
      expect(child.containsFocusableElements(true)).toBe(true);
    });
  });

  describe('containsFocusableElement', () => {
    it('returns true when the element is in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElement(parentElement)).toBe(true);
      expect(child.containsFocusableElement(childElement)).toBe(true);
    });

    it('returns false when the element is not focusable', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElement(parentElement)).toBe(true);
      expect(child.containsFocusableElement(childElement)).toBe(false);
    });

    it('returns false when the element is focusable, but predicate excludes it', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = -1;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(
        parent.containsFocusableElement(parentElement, false, isTabbable),
      ).toBe(true);
      expect(
        child.containsFocusableElement(childElement, false, isTabbable),
      ).toBe(false);
    });

    it('returns false when the element is not in scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElement(childElement)).toBe(false);
      expect(child.containsFocusableElement(parentElement)).toBe(false);
    });

    it('returns false when the element is in nested in scope and `includeNested` is falsy', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElement(childElement, false)).toBe(false);
      expect(child.containsFocusableElement(parentElement, false)).toBe(false);
    });

    it('returns true when the element is in nested in scope and `includeNested` is true', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(parent.containsFocusableElement(parentElement, true)).toBe(true);
      expect(parent.containsFocusableElement(childElement, true)).toBe(true);
      expect(child.containsFocusableElement(childElement, true)).toBe(true);
      expect(child.containsFocusableElement(parentElement, true)).toBe(false);
    });
  });

  describe('getFocusableElementsAndTreeNodes', () => {
    it('returns an array of elements and tree nodes', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      const grandchildSiblingElement = div(childElement);
      grandchildSiblingElement.tabIndex = 0;
      const siblingElement = div(parentElement);
      siblingElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      const sibling = new FocusTreeNode(siblingElement, null, parent);

      expect(parent.getFocusableElementsAndTreeNodes()).toEqual([
        parentElement,
        child,
        sibling,
      ]);
      expect(child.getFocusableElementsAndTreeNodes()).toEqual([
        childElement,
        grandchild,
        grandchildSiblingElement,
      ]);
      expect(grandchild.getFocusableElementsAndTreeNodes()).toEqual([
        grandchildElement,
      ]);
      expect(sibling.getFocusableElementsAndTreeNodes()).toEqual([
        siblingElement,
      ]);
    });

    it('excludes elements that do not pass the predicate', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = -1;
      const grandchildElement = div(childElement);
      grandchildElement.tabIndex = 0;
      const grandchildSiblingElement = div(childElement);
      grandchildSiblingElement.tabIndex = 0;
      const siblingElement = div(parentElement);
      siblingElement.tabIndex = -1;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      const grandchild = new FocusTreeNode(grandchildElement, null, child);
      const sibling = new FocusTreeNode(siblingElement, null, parent);

      expect(parent.getFocusableElementsAndTreeNodes(isTabbable)).toEqual([
        parentElement,
        child,
      ]);
      expect(child.getFocusableElementsAndTreeNodes(isTabbable)).toEqual([
        grandchild,
        grandchildSiblingElement,
      ]);
      expect(grandchild.getFocusableElementsAndTreeNodes(isTabbable)).toEqual([
        grandchildElement,
      ]);
      expect(sibling.getFocusableElementsAndTreeNodes(isTabbable)).toEqual([]);
    });
  });

  describe('focusFirst', () => {
    it('focuses the first focusable element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      expect(parent.focusFirst()).toBeNull();

      grandchildSiblingElement.tabIndex = -1;
      expect(child.focusFirst()).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();

      grandchildElement.tabIndex = 0;
      expect(parent.focusFirst()).toBe(grandchildElement);
      expect(grandchildElement).toHaveFocus();
    });

    it('focuses the first tabbable element that matches the predicate', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      expect(parent.focusFirst()).toBeNull();

      grandchildElement.tabIndex = -1;
      expect(child.focusFirst(isTabbable)).toBeNull();

      grandchildSiblingElement.tabIndex = 0;
      expect(parent.focusFirst(isTabbable)).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
    });
  });

  describe('focusLast', () => {
    it('focuses the last focusable element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      expect(parent.focusLast()).toBeNull();

      grandchildElement.tabIndex = 0;
      expect(child.focusLast()).toBe(grandchildElement);
      expect(grandchildElement).toHaveFocus();

      grandchildSiblingElement.tabIndex = -1;
      expect(parent.focusLast()).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
    });

    it('focuses the last element that matches the predicate', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      expect(parent.focusLast()).toBeNull();

      grandchildElement.tabIndex = -1;
      expect(child.focusLast(isTabbable)).toBeNull();

      grandchildElement.tabIndex = 0;
      grandchildSiblingElement.tabIndex = -1;
      expect(parent.focusLast(isTabbable)).toBe(grandchildElement);
      expect(grandchildElement).toHaveFocus();

      grandchildSiblingElement.tabIndex = 0;
      expect(parent.focusLast(isTabbable)).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
    });
  });

  describe('focus', () => {
    it('focuses on the given element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      expect(parentElement).not.toHaveFocus();
      parent.focus(parentElement);
      expect(parentElement).toHaveFocus();
    });

    it('focuses on an element outside of its scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      const child = new FocusTreeNode(childElement);
      expect(parentElement).not.toHaveFocus();
      child.focus(parentElement);
      expect(parentElement).toHaveFocus();
    });

    it('focuses on an element in a nested scope', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      parentElement.tabIndex = 0;
      const childElement = div(parentElement);
      childElement.tabIndex = 0;
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);
      expect(childElement).not.toHaveFocus();
      parent.focus(childElement);
      expect(childElement).toHaveFocus();
      child.focus(parentElement);
      expect(parentElement).toHaveFocus();
    });

    it('accepts focus options', () => {
      const focusSpy = jest.spyOn(HTMLElement.prototype, 'focus');
      const element = document.createElement('div');
      document.body.appendChild(element);
      const node = new FocusTreeNode(element);
      const options = {};
      node.focus(element, options);
      expect(focusSpy).toHaveBeenCalledTimes(1);
      expect(focusSpy).toHaveBeenLastCalledWith(options);
      focusSpy.mockRestore();
    });
  });

  describe('focusPrevious', () => {
    it('focuses the previous focusable element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const siblingElement = div(parentElement);
      const siblingChildElement = div(siblingElement);
      const siblingSecondChildElement = div(siblingElement);
      const parent = new FocusTreeNode(parentElement, 'parent');
      const child = new FocusTreeNode(childElement, 'child', parent);
      const sibling = new FocusTreeNode(siblingElement, 'sibling', parent);

      expect(parent.focusPrevious()).toBeNull();

      grandchildElement.tabIndex = 0;
      grandchildSiblingElement.tabIndex = 0;
      grandchildSiblingElement.focus();
      expect(grandchildSiblingElement).toHaveFocus();
      expect(parent.focusPrevious()).toBe(grandchildElement);
      expect(child.focusPrevious()).toBeNull();
      expect(grandchildElement).toHaveFocus();

      siblingSecondChildElement.tabIndex = 0;
      siblingSecondChildElement.focus();
      expect(siblingSecondChildElement).toHaveFocus();
      expect(sibling.focusPrevious()).toBeNull();
      expect(parent.focusPrevious()).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
      expect(sibling.focusPrevious()).toBeNull();
      expect(child.focusPrevious()).toBe(grandchildElement);

      siblingElement.tabIndex = 0;
      siblingChildElement.tabIndex = 0;
      siblingChildElement.focus();
      expect(child.focusPrevious()).toBeNull();
      expect(parent.focusPrevious()).toBe(siblingElement);
      expect(sibling.focusPrevious()).toBeNull();
      expect(siblingElement).toHaveFocus();
      expect(child.focusPrevious()).toBeNull();
      expect(parent.focusPrevious()).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
    });

    it('focuses the previous element that matches the predicate', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);

      parentElement.tabIndex = 0;
      childElement.tabIndex = -1;
      siblingElement.tabIndex = 0;
      siblingElement.focus();
      expect(siblingElement).toHaveFocus();
      expect(parent.focusPrevious(isTabbable)).toBe(parentElement);
      expect(parentElement).toHaveFocus();
    });

    it('returns null when the first element is already focused', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      parentElement.tabIndex = 0;
      parentElement.focus();
      childElement.tabIndex = 0;
      siblingElement.tabIndex = 0;
      expect(parentElement).toHaveFocus();
      expect(child.focusPrevious()).toBeNull();

      siblingElement.focus();
      expect(siblingElement).toHaveFocus();
      expect(parent.focusPrevious()).toBe(childElement);
      expect(childElement).toHaveFocus();
      expect(parent.focusPrevious()).toBe(parentElement);
      expect(child.focusPrevious()).toBeNull();
      expect(parentElement).toHaveFocus();
      expect(parent.focusPrevious()).toBeNull();
    });
  });

  describe('focusNext', () => {
    it('focuses the next focusable element', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const grandchildElement = div(childElement);
      const grandchildSiblingElement = div(childElement);
      const siblingElement = div(parentElement);
      const siblingChildElement = div(siblingElement);
      const siblingSecondChildElement = div(siblingElement);
      const parent = new FocusTreeNode(parentElement, 'parent');
      const child = new FocusTreeNode(childElement, 'child', parent);
      const sibling = new FocusTreeNode(siblingElement, 'sibling', parent);

      expect(parent.focusNext()).toBeNull();

      grandchildElement.tabIndex = 0;
      grandchildSiblingElement.tabIndex = 0;
      grandchildElement.focus();
      expect(grandchildElement).toHaveFocus();
      expect(parent.focusNext()).toBe(grandchildSiblingElement);
      expect(child.focusNext()).toBeNull();
      expect(grandchildSiblingElement).toHaveFocus();
      expect(parent.focusNext()).toBeNull();

      siblingChildElement.tabIndex = 0;
      expect(sibling.focusNext()).toBeNull();
      expect(parent.focusNext()).toBe(siblingChildElement);
      expect(siblingChildElement).toHaveFocus();
      expect(parent.focusNext()).toBeNull();

      parentElement.tabIndex = 0;
      siblingElement.tabIndex = 0;
      siblingSecondChildElement.tabIndex = 0;
      parentElement.focus();
      expect(parentElement).toHaveFocus();
      expect(child.focusNext()).toBeNull();
      expect(parent.focusNext()).toBe(grandchildElement);
      expect(grandchildElement).toHaveFocus();
      expect(child.focusNext()).toBe(grandchildSiblingElement);
      expect(grandchildSiblingElement).toHaveFocus();
      expect(child.focusNext()).toBeNull();
      expect(parent.focusNext()).toBe(siblingElement);
      expect(siblingElement).toHaveFocus();
      expect(parent.focusNext()).toBe(siblingChildElement);
      expect(siblingChildElement).toHaveFocus();
      expect(sibling.focusNext()).toBe(siblingSecondChildElement);
      expect(parent.focusNext()).toBeNull();
    });

    it('focuses the next element that matches the predicate', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);

      parentElement.tabIndex = 0;
      childElement.tabIndex = -1;
      siblingElement.tabIndex = 0;
      parentElement.focus();
      expect(parentElement).toHaveFocus();
      expect(parent.focusNext(isTabbable)).toBe(siblingElement);
      expect(siblingElement).toHaveFocus();
    });

    it('returns null when the last element is already focused', () => {
      const div = (parent = document.body): HTMLDivElement => {
        const el = document.createElement('div');
        parent.appendChild(el);
        return el;
      };
      const parentElement = div();
      const childElement = div(parentElement);
      const siblingElement = div(parentElement);
      const parent = new FocusTreeNode(parentElement);
      const child = new FocusTreeNode(childElement, null, parent);

      parentElement.tabIndex = 0;
      childElement.tabIndex = 0;
      siblingElement.tabIndex = 0;
      siblingElement.focus();
      expect(siblingElement).toHaveFocus();
      expect(child.focusNext()).toBeNull();

      parentElement.focus();
      expect(parentElement).toHaveFocus();
      expect(parent.focusNext()).toBe(childElement);
      expect(childElement).toHaveFocus();
      expect(parent.focusNext()).toBe(siblingElement);
      expect(siblingElement).toHaveFocus();
      expect(parent.focusNext()).toBeNull();
    });
  });
});

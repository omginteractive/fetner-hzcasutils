import {getDocument, ensureDOMInstance} from '@hzdg/dom-utils';
type ChildNodeMap = Map<Element, FocusTreeNode>;

/**
 * A selector string that attempts to select all natively 'focusable' elements.
 */
const FOCUSABLE_SELECTOR = [
  'input',
  'select',
  'textarea',
  'a[href]',
  'button',
  'iframe',
  '[tabindex]',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

/**
 * A selector string that attempts to select all natively 'tabbable' elements.
 */
const TABBABLE_SELECTOR = [
  'input',
  'select',
  'textarea',
  'a[href]',
  'button',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

/**
 * `matches` Returns true if matching selectors against
 * the context (`this`) Element's root yields the Element.
 *
 * Use it with an Element context, i.e.:
 *
 * @example
 *   matches.call(someElement, 'someSelector');
 */
const matches =
  typeof Element === 'undefined'
    ? () => false
    : Element.prototype.matches ||
      ((Element.prototype as unknown) as Record<string, unknown>)
        .msMatchesSelector ||
      Element.prototype.webkitMatchesSelector;

/** Whether or not the given element is an input element. */
function isInput(element: Element): element is HTMLInputElement {
  return element.tagName === 'INPUT';
}

/** Whether or not the given element is a hidden input. */
function isHiddenInput(element: Element): boolean {
  return isInput(element) && element.type === 'hidden';
}

/** Whether or not the given element is visually hidden. */
function isHidden(element: HTMLElement): boolean {
  // offsetParent is null when an element is invisible or inside an
  // invisible element, unless it doesn't have a fixed position.
  return (
    element.offsetParent === null ||
    getComputedStyle(element).visibility === 'hidden'
  );
}

/** Asserts that the given node is an HTMLElement. */
function assertIsHTMLElement(
  node: Node,
): asserts node is HTMLElement & {
  disabled?: boolean;
} {
  if (node && 'tagName' in node) return;
  throw new Error(`Invalid HTMLElement type ${node}!`);
}

/** Whether or not the given node can be reached via tab key navigation. */
export function isTabbable(node: Node): boolean {
  assertIsHTMLElement(node);
  if (matches.call(node, TABBABLE_SELECTOR) === false) return false;
  if (node.disabled || isHiddenInput(node) || isHidden(node)) {
    return false;
  }
  return true;
}

/** Whether or not the given node can be given focus. */
export function isFocusable(node: Node): boolean {
  assertIsHTMLElement(node);
  if (matches.call(node, FOCUSABLE_SELECTOR) === false) return false;
  if (node.disabled || isHiddenInput(node) || isHidden(node)) {
    return false;
  }
  return true;
}

/** gets the current element for the given `domTarget`. */
function getElement(domTarget: Element | null): Element | null {
  return domTarget || null;
}

/** gets the currently active (focused) element */
function getActiveElement(domTarget: Element | null): Element | null {
  const element = getElement(domTarget);
  if (element) {
    const doc = getDocument(element);
    if (doc) return doc.activeElement;
  }
  return null;
}

/** A map of elements to FocusTreeNodes subscribed to its focus events. */
const focusSubscribers = new Map<
  Element,
  {subscribedNodes: Set<FocusTreeNode>; handler(event: FocusEvent): void}
>();

/**
 * `FocusTreeNode` is a data structure for focus hierarchies.
 */
export default class FocusTreeNode {
  constructor(
    /**
     * The DOM target, i.e., the element for a `FocusScope` component.
     */
    readonly domTarget: Element | null = null,
    /** The id for the created node, or `null`. */
    readonly id?: string | null,
    /** An optional parent `FocusTreeNode`. */
    parent?: FocusTreeNode | null,
  ) {
    if (domTarget) ensureDOMInstance(domTarget, Element);
    if (parent) parent.appendChildNode(this);
  }

  protected _parent?: FocusTreeNode | null;

  /**
   * A map of `Element` objects to their `FocusTreeNode` objects.
   *
   * We use a Map (rather than a `Set<FocusTreeNode>`)
   * for quick lookup using the `Element` as the key.
   */
  protected readonly childNodes: ChildNodeMap = new Map();

  /**
   * A set of set of subscribers to changes
   * in focus within this `FocusTreeNode`.
   */
  protected readonly subscribers = new Set<(event: FocusEvent) => void>();

  /** The root node that this node is a descendant of. */
  get root(): FocusTreeNode {
    let rootNode: FocusTreeNode = this; // eslint-disable-line @typescript-eslint/no-this-alias
    if (rootNode.parent === rootNode) {
      throw new Error('Node references itself!');
    }
    let i = 1000;
    while (rootNode.parent) {
      rootNode = rootNode.parent;
      if (rootNode && i-- < 0) {
        throw new Error('Possible infinite loop detected.');
      }
    }
    return rootNode;
  }

  get parent(): FocusTreeNode | null {
    return this._parent ?? null;
  }

  private subscribeToFocusEventsIfNecessary(): void {
    const root = getElement(this.root.domTarget);
    if (root && 'addEventListener' in root) {
      const rootSubscription = focusSubscribers.get(root) ?? {
        subscribedNodes: new Set<FocusTreeNode>(),
        handler: (event: FocusEvent) => {
          for (const node of rootSubscription.subscribedNodes) {
            for (const subscriber of node.subscribers) {
              subscriber(event);
            }
          }
        },
      };
      rootSubscription.subscribedNodes.add(this);
      if (!focusSubscribers.has(root)) {
        focusSubscribers.set(root, rootSubscription);
        (root as HTMLElement).addEventListener(
          'focus',
          rootSubscription.handler,
          {capture: true},
        );
      }
    }
  }

  private unsubscribeFromFocusEventsIfPossible(): void {
    const root = getElement(this.root.domTarget);
    if (root) {
      const rootSubscription = focusSubscribers.get(root);
      if (rootSubscription) {
        rootSubscription.subscribedNodes.delete(this);
        if (!rootSubscription.subscribedNodes.size) {
          (root as HTMLElement).removeEventListener(
            'focus',
            rootSubscription.handler,
            {capture: true},
          );
          focusSubscribers.delete(root);
        }
      }
    }
  }

  /** Subscribe to focus events. */
  subscribe(
    subscriber: (event: FocusEvent) => void,
  ): {unsubscribe: () => void} {
    if (!subscriber) throw new Error('A subscriber function is required!');
    this.subscribers.add(subscriber);
    this.subscribeToFocusEventsIfNecessary();
    return {
      unsubscribe: () => {
        this.subscribers.delete(subscriber);
        this.unsubscribeFromFocusEventsIfPossible();
      },
    };
  }

  /** Remove this node from its parent in the tree. */
  remove(): void {
    if (this.subscribers.size) {
      this.subscribers.clear();
      this.unsubscribeFromFocusEventsIfPossible();
    }
    if (this.parent) {
      if (this.domTarget) this.parent.childNodes.delete(this.domTarget);
      this._parent = null;
    }
  }

  /** Append a `FocusTreeNode` to the list of child nodes of this node. */
  appendChildNode(node: FocusTreeNode): void {
    if (node.id != null) {
      // If we already have a node in the tree for this id,
      // throw an error.
      const otherNode = this.root.findNodeById(node.id);
      if (otherNode) {
        throw new Error(`A node already exists for the id ${node.id}!`);
      }
    }

    // If we already have a node for this `domTarget`, throw an error.
    const childNode = node.domTarget
      ? this.childNodes.get(node.domTarget)
      : null;
    if (childNode) {
      throw new Error(`A child node already exists for this domTarget!`);
    }
    node._parent = this;
    if (node.domTarget) this.childNodes.set(node.domTarget, node);
  }

  /** Get an array of child nodes. */
  getChildNodes(): FocusTreeNode[] {
    return Array.from(this.childNodes.values());
  }

  /** Whether this node has at least one child node. */
  hasChildNodes(): boolean {
    return this.childNodes.size > 0;
  }

  /**
   * Traverse _up_ the DOM tree, starting at the given element.
   * For each visited DOM element, traverse _this_ tree to find
   * a `FocusTreeNode` for the element.
   *
   * Returns the node in the tree for the element
   * _closest_ to the given element, or `null`.
   */
  findClosestNode(
    /**
     * An element that may be a descendant of this node's element,
     * or of this node's descendant elements.
     */
    element: Element,
  ): FocusTreeNode | null {
    if (!element) return null;
    let match = null;
    let domNode: Element | null = element;
    do {
      match = this.findNode(domNode);
      if (!match) {
        domNode = domNode.parentElement;
      }
    } while (match === null && domNode);
    return match;
  }

  /**
   * Traverse the tree, starting at this node,
   * to find a `FocusTreeNode` for the given `element`, or `null`.
   */
  findNode(
    /**
     * An element that might correspond to this node
     * or a descendant of this node.
     */
    element: Element,
  ): FocusTreeNode | null {
    if (!element) return null;
    if (getElement(this.domTarget) === element) return this;
    const queue = this.getChildNodes();
    while (queue.length) {
      const node = queue.pop();
      if (node) {
        if (getElement(node.domTarget) === element) return node;
        if (node.hasChildNodes()) {
          queue.push(...node.getChildNodes());
        }
      }
    }
    return null;
  }

  /**
   * Traverse the tree, starting at this node,
   * to find a node for the given `id`.
   *
   * If no node is found, then traverse the tree from the root.
   *
   * If no node is found after traversing the root node, `null` is returned.
   */
  findNodeById(
    /**
     * An id that might correspond to this node
     * or a descendant of this node.
     */
    id: string,
  ): FocusTreeNode | null {
    if (!id) return null;
    if (this.id === id) return this;
    const queue = this.getChildNodes();
    while (queue.length) {
      const node = queue.pop();
      if (node) {
        if (node.id === id) return node;
        if (node.hasChildNodes()) {
          queue.push(...node.getChildNodes());
        }
      }
    }
    if (this.root !== this) {
      queue.push(this.root);
      while (queue.length) {
        const node = queue.pop();
        if (node) {
          if (node.id === id) return node;
          if (node !== this && node.hasChildNodes()) {
            queue.push(...node.getChildNodes());
          }
        }
      }
    }
    return null;
  }

  /**
   * Get the currently focused element,
   * even if it is outside of the scope of this node.
   */
  getFocusedElementGlobal(): Element | null {
    return getActiveElement(this.domTarget);
  }

  /**
   * Get the focused element in the `FocusTreeNode` scope, or `null`.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusTreeNode` element
   *  - not a descendant of any nested `FocusTreeNode` element.
   */
  getFocusedElement(
    /**
     * If true, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
  ): Element | null {
    const focusedElement = getActiveElement(this.domTarget);
    if (
      focusedElement &&
      this.containsFocusableElement(focusedElement, includeNested)
    ) {
      return focusedElement;
    }
    return null;
  }

  /**
   * Check whether this `FocusTreeNode` has _any_ focusable elements
   * within its scope.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusTreeNode` element
   *  - not a descendant of any nested `FocusTreeNode` element
   */
  containsFocusableElements(
    /**
     * If true, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
  ): boolean {
    const element = getElement(this.domTarget);
    if (!element) return false;
    if (!predicate) return true;
    const elementsToCheck: (Element | FocusTreeNode)[] = [element];
    while (elementsToCheck.length) {
      const elementToCheck = elementsToCheck.pop();
      if (!elementToCheck) continue;
      // If this element is actually a node in our focus tree,
      // and `includeNested` is true, check if it has focusable elements.
      if (elementToCheck instanceof FocusTreeNode) {
        if (!includeNested) continue;
        if (
          elementToCheck.containsFocusableElements(includeNested, predicate)
        ) {
          return true;
        }
      } else if (elementToCheck) {
        if (predicate && predicate(elementToCheck)) {
          return true;
        }
        if (elementToCheck.childElementCount) {
          // We iterate in reverse so that we can pop the child elements
          // we need to check out in source order on the next pass.
          // TODO: support RTL focus flow?
          for (let i = elementToCheck.children.length - 1; i >= 0; i--) {
            const childElement = elementToCheck.children.item(i);
            if (childElement) {
              // If this element has its own focus scope,
              // and `includeNested` is true, check it and its descendants.
              const childNode = this.findNode(childElement);
              if (childNode) {
                if (includeNested) {
                  elementsToCheck.push(childNode);
                }
              } else {
                elementsToCheck.push(childElement);
              }
            }
          }
        }
      }
    }
    return false;
  }

  /**
   * Check whether this `FocusTreeNode` has the given element within its scope.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusTreeNode` element
   *  - not a descendant of any nested `FocusTreeNode` element
   *    _or_ `includeNested` is `true`
   */
  containsFocusableElement(
    /** An element that may be in this `FocusTreeNode` scope. */
    element: Element,
    /**
     * If true, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
  ): boolean {
    if (predicate && !predicate(element)) return false;
    const closestNode = this.findClosestNode(element);
    return closestNode === this || Boolean(includeNested && closestNode);
  }

  /**
   * Get an array of focusable elements or nested `FocusTreeNode` instances
   * in the `FocusTreeNode` scope that pass the `predicate`.
   *
   * An element or `FocusTreeNode` is in scope if it is:
   *  - a descendant of the `FocusTreeNode` element
   *  - not a descendant of any nested `FocusTreeNode` element.
   */
  getFocusableElementsAndTreeNodes(
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
  ): (Element | FocusTreeNode)[] {
    const element = getElement(this.domTarget);
    if (!element) return [];
    const focusableElements: (Element | FocusTreeNode)[] = [];
    const elementsToCheck: (Element | FocusTreeNode)[] = [element];
    while (elementsToCheck.length) {
      const elementToCheck = elementsToCheck.pop();
      if (!elementToCheck) continue;
      // If this element is actually a node in our focus tree,
      // include the node in our list of focusable elements,
      // but don't traverse its children. If focus is shifted to this node,
      // it should be handled through the corresponding `FocusTreeNode`.
      if (elementToCheck instanceof FocusTreeNode) {
        focusableElements.push(elementToCheck);
      } else if (elementToCheck) {
        if (predicate && predicate(elementToCheck)) {
          // TODO: Sort by tab index? Or just warn if tab index is > 0?
          focusableElements.push(elementToCheck);
        }
        if (elementToCheck.childElementCount) {
          // We iterate in reverse so that we can pop the child elements
          // we need to check out in source order on the next pass.
          // TODO: support RTL focus flow?
          for (let i = elementToCheck.children.length - 1; i >= 0; i--) {
            const childElement = elementToCheck.children.item(i);
            if (childElement) {
              // If this element has its own focus scope, don't bother
              // checking it or its descendants.
              const childNode = this.findNode(childElement);
              if (childNode) {
                if (childNode.containsFocusableElements(true, predicate)) {
                  elementsToCheck.push(childNode);
                }
              } else {
                elementsToCheck.push(childElement);
              }
            }
          }
        }
      }
    }
    return focusableElements;
  }

  /**
   * Focus the first element in the _deep_ `FocusTreeNode` scope
   * that matches the `predicate`.
   *
   * Optionally accepts a focus options object.
   * See `focus` for more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - a descendant of the `FocusTreeNode` element
   *  - a descendant of any nested `FocusTreeNode` element
   */
  focusFirst(
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
    /** Optional options for controlling aspects of the focusing process. */
    options?: FocusOptions,
  ): Element | null {
    const firstNode = this.getFocusableElementsAndTreeNodes(predicate)[0];
    if (firstNode) {
      if ('focusFirst' in firstNode) {
        return firstNode.focusFirst(predicate, options);
      }
      return this.focus(firstNode, options);
    }
    return null;
  }

  /*
   * Focus the last focusable element in the _deep_ `FocusTreeNode` scope
   * that matches the `predicate`.
   *
   * Optionally accepts a focus options object.
   * See `focus` for more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - a descendant of the `FocusTreeNode` element
   *  - a descendant of any nested `FocusTreeNode` element
   */
  focusLast(
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
    /** Optional options for controlling aspects of the focusing process. */
    options?: FocusOptions,
  ): Element | null {
    const focusableNodes = this.getFocusableElementsAndTreeNodes(predicate);
    const lastnode = focusableNodes[focusableNodes.length - 1];
    if (lastnode) {
      if ('focusLast' in lastnode) {
        return lastnode.focusLast(predicate, options);
      }
      return this.focus(lastnode, options);
    }
    return null;
  }

  /**
   * Focus the given element if it is focusable.
   *
   * Accepts an optional focus options object that matches the options
   * accepted by the DOM `HTMLElement.focus` method.
   *
   * See https://developer.mozilla.org/en-US/docs/Web/API/HTMLOrForeignElement/focus
   */
  focus(
    /** The element to focus. */
    target: Element,
    /** Optional options for controlling aspects of the focusing process. */
    options?: FocusOptions,
  ): Element | null {
    if (target != null) {
      try {
        (target as HTMLElement).focus(options);
        return target;
      } catch (err) {
        /* noop */
      }
      if (getActiveElement(this.domTarget) === target) {
        return target;
      }
    }
    return null;
  }

  /**
   * Focus the previous focusable element relative to
   * the currently focused element in the _deep_ `FocusTreeNode` scope
   * that matches the `predicate`.
   *
   * Optionally accepts a focus options object.
   * See `focus` for more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - a descendant of the `FocusTreeNode` element
   *  - a descendant of any nested `FocusTreeNode` element
   */
  focusPrevious(
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
    /** Optional options for controlling aspects of the focusing process. */
    options?: FocusOptions,
  ): Element | null {
    let focusedElement = this.getFocusedElement();
    // If the focused element is in this scope,
    // attempt to focus a previous node.
    if (focusedElement) {
      const focusableNodes = this.getFocusableElementsAndTreeNodes(predicate);
      const position = focusableNodes.indexOf(focusedElement);
      // If we're already at the first focusable node, bail.
      if (position <= 0) return null;
      const previousNode = focusableNodes[position - 1];
      if (previousNode) {
        if ('focusLast' in previousNode) {
          return previousNode.focusLast(predicate, options);
        }
        return this.focus(previousNode, options);
      }
    } else {
      focusedElement = this.getFocusedElement(true);
      // If we aren't focused on an element in this or a nested scope, bail.
      if (!focusedElement) return null;
      // If we're focused on an element in a nested scope, try to focus
      // on a previous node in that scope, walking up the focus tree when
      // the nested scope is at its first node.
      let nestedNode = this.findClosestNode(focusedElement);
      while (nestedNode && nestedNode !== this) {
        const previous = nestedNode.focusPrevious(predicate, options);
        if (previous) return previous;
        if (nestedNode.parent === this) {
          const focusableNodes = this.getFocusableElementsAndTreeNodes(
            predicate,
          );
          const position = focusableNodes.indexOf(nestedNode);
          // If we're already at the first focusable node, bail.
          if (position <= 0) return null;
          const previousNode = focusableNodes[position - 1];
          if (previousNode) {
            if ('focusLast' in previousNode) {
              return previousNode.focusLast(predicate, options);
            }
            return this.focus(previousNode, options);
          }
        }
        nestedNode = nestedNode.parent;
      }
    }

    return null;
  }

  /**
   * Focus the next focusable element relative to
   * the currently focused element in the _deep_ `FocusTreeNode` scope
   * that passes the `predicate`.
   *
   * Optionally accepts a focus options object.
   * See `focus` for more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - a descendant of the `FocusTreeNode` element
   *  - a descendant of any nested `FocusTreeNode` element.
   */
  focusNext(
    /**
     * Filter out nodes based on a criteria.
     * Defaults to `isFocusable`.
     */
    predicate: ((node: Node) => boolean) | null = isFocusable,
    /** Optional options for controlling aspects of the focusing process. */
    options?: FocusOptions,
  ): Element | null {
    let focusedElement = this.getFocusedElement();
    // If the focused element is in this scope,
    // attempt to focus a next node.
    if (focusedElement) {
      const focusableNodes = this.getFocusableElementsAndTreeNodes(predicate);
      const position = focusableNodes.indexOf(focusedElement);
      // If we're already at the last focusable node, bail.
      if (position < 0 || position >= focusableNodes.length - 1) return null;
      const nextNode = focusableNodes[position + 1];
      if (nextNode) {
        if ('focusFirst' in nextNode) {
          return nextNode.focusFirst(predicate, options);
        }
        return this.focus(nextNode, options);
      }
    } else {
      focusedElement = this.getFocusedElement(true);
      // If we aren't focused on an element in this or a nested scope, bail.
      if (!focusedElement) return null;
      // If we're focused on an element in a nested scope, try to focus
      // on a next node in that scope, walking up the focus tree when
      // the nested scope is at its first node.
      let nestedNode = this.findClosestNode(focusedElement);
      while (nestedNode && nestedNode !== this) {
        const next = nestedNode.focusNext(predicate, options);
        if (next) return next;
        if (nestedNode.parent === this) {
          const focusableNodes = this.getFocusableElementsAndTreeNodes(
            predicate,
          );
          const position = focusableNodes.indexOf(nestedNode);
          // If we're already at the first focusable node, bail.
          if (position < 0 || position >= focusableNodes.length - 1)
            return null;
          const nextNode = focusableNodes[position + 1];
          if (nextNode) {
            if ('focusFirst' in nextNode) {
              return nextNode.focusFirst(predicate, options);
            }
            return this.focus(nextNode, options);
          }
        }
        nestedNode = nestedNode.parent;
      }
    }

    return null;
  }
}

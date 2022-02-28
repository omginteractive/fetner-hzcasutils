import FocusTreeNode, {isTabbable, isFocusable} from './FocusTreeNode';

/**
 * A utility for managing focus within a `FocusScope`.
 *
 * `FocusManager` is a thin wrapper around a `FocusTreeNode`.
 */
export default class FocusManager {
  constructor(private _focusTreeNode: FocusTreeNode) {}

  /**
   * An optional string id for the `FocusManager`. This value
   * corresponds to the `id` prop passed to the matching `FocusScope`.
   *
   * Useful for being able to find this `FocusManager` via `findManagerById`.
   */
  get id(): string | null {
    return this._focusTreeNode.id ?? null;
  }

  /**
   * The root `FocusManager` that this `FocusManager` is a descendant of.
   *
   * Note that the root `FocusManager` will be for the document,
   * even though no `FocusScope` is explicitly created for the document.
   */
  get root(): FocusManager {
    const root = this._focusTreeNode.root;
    if (root === this._focusTreeNode) return this;
    return new FocusManager(root);
  }

  /** The parent `FocusManager` that this `FocusManager` is a child of. */
  get parent(): FocusManager | null {
    const parent = this._focusTreeNode.parent;
    if (parent) return new FocusManager(parent);
    return null;
  }

  /** Get an array of child `FocusManager` instances. */
  getChildManagers(): FocusManager[] {
    return this._focusTreeNode.getChildNodes().map(v => new FocusManager(v));
  }

  /** Whether this `FocusManager` has at least one child `FocusManager`. */
  hasChildManagers(): boolean {
    return this._focusTreeNode.hasChildNodes();
  }

  /**
   * Traverse _up_ the DOM tree, starting at the given element.
   * For each visited DOM element, traverse the `FocusManager` hierarchy
   * to find a `FocusManager` for the visited DOM element.
   *
   * Returns the `FocusManager` for the ancestor DOM element
   * _closest_ to the given element, or `null`.
   */
  findClosestManager(
    /**
     * An element that may be a descendant of this `FocusManager` element,
     * or of descendant `FocusManager` elements.
     */
    element: Element,
  ): FocusManager | null {
    const node = this._focusTreeNode.findClosestNode(element);
    if (node === this._focusTreeNode) return this;
    if (node) return new FocusManager(node);
    return null;
  }

  /**
   * Traverse the `FocusManager` hierarchy to find
   * a descendant `FocusManager` for the given `element`, or `null`.
   */
  findManager(
    /**
     * An element that might correspond to this `FocusManager`
     * or a descendant `FocusManager`.
     */
    element: Element,
  ): FocusManager | null {
    const node = this._focusTreeNode.findNode(element);
    if (node === this._focusTreeNode) return this;
    if (node) return new FocusManager(node);
    return null;
  }

  /**
   * Traverse the `FocusManager` hierarchy to find
   * a `FocusManager` for the given `id`.
   *
   * If no `FocusManager` is found, then traverse again from the root.
   *
   * If no `FocusManager` is found after traversing from the root,
   * `null` is returned.
   */
  findManagerById(
    /**
     * An id that might correspond to this `FocusManager`
     * or a descendant `FocusManager`.
     */
    id: string,
  ): FocusManager | null {
    const node = this._focusTreeNode.findNodeById(id);
    if (node === this._focusTreeNode) return this;
    if (node) return new FocusManager(node);
    return null;
  }

  /**
   * Get the currently focused element,
   * even if it is outside of the scope of this `FocusManager`.
   */
  getFocusedElementGlobal(): Element | null {
    return this._focusTreeNode.getFocusedElementGlobal();
  }

  /**
   * Get the focused element in the `FocusManager` scope, or `null`.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - not a descendant of any nested `FocusManager` element.
   */
  getFocusedElement(
    /**
     * If true, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
  ): Element | null {
    return this._focusTreeNode.getFocusedElement(includeNested);
  }

  /**
   * Check whether this `FocusManager` has _any_ focusable elements
   * within its scope.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - not a descendant of any nested `FocusManager` element
   */
  containsFocusableElements(
    /**
     * If true, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
    /** If `true`, check for _tabbable_ elements instead. */
    tabbable?: boolean,
  ): boolean {
    return this._focusTreeNode.containsFocusableElements(
      Boolean(includeNested),
      tabbable ? isTabbable : isFocusable,
    );
  }

  /**
   * Check whether this `FocusManager` has the given element within its scope.
   *
   * An element is in scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - not a descendant of any nested `FocusManager` element
   *    _or_ `includeNested` is `true`
   */
  containsFocusableElement(
    /** An element that may be in this `FocusManager` scope. */
    element: Element,
    /**
     * If `true`, then an element in a nested scope
     * will also be considered in this scope.
     */
    includeNested?: boolean,
    /** If `true`, check that the element is in scope _and tabbable_. */
    tabbable?: boolean,
  ): boolean {
    return this._focusTreeNode.containsFocusableElement(
      element,
      Boolean(includeNested),
      tabbable ? isTabbable : isFocusable,
    );
  }

  /**
   * Focus the first focusable element in the _deep_ `FocusManager` scope,
   * or if `tabbable` is `true`, the first tabbable element in the scope.
   *
   * Accepts either a `tabbable` boolean, or a focus options object
   * that may include a `tabbable` boolean field. See `focus` for
   * more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - a descendant of any nested `FocusManager` element.
   */
  focusFirst(
    /**
     * Either an optional boolean indicating whether to focus
     * the first _tabbable_ element instead, or an optional object
     * for controlling aspects of the focusing process.
     */
    tabbableOrOptions?: boolean | (FocusOptions & {tabbable?: boolean}),
  ): Element | null {
    const {tabbable, ...options} =
      typeof tabbableOrOptions === 'object'
        ? tabbableOrOptions
        : {tabbable: tabbableOrOptions};
    return this._focusTreeNode.focusFirst(
      tabbable ? isTabbable : isFocusable,
      options,
    );
  }

  /**
   * Focus the last focusable element in the _deep_ `FocusManager` scope,
   * or if `tabbable` is `true`, the last tabbable element in the scope.
   *
   * Accepts either a `tabbable` boolean, or a focus options object
   * that may include a `tabbable` boolean field. See `focus` for
   * more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - a descendant of any nested `FocusManager` element.
   */
  focusLast(
    /**
     * Either an optional boolean indicating whether to focus
     * the last _tabbable_ element instead, or an optional object
     * for controlling aspects of the focusing process.
     */
    tabbableOrOptions?: boolean | (FocusOptions & {tabbable?: boolean}),
  ): Element | null {
    const {tabbable, ...options} =
      typeof tabbableOrOptions === 'object'
        ? tabbableOrOptions
        : {tabbable: tabbableOrOptions};
    return this._focusTreeNode.focusLast(
      tabbable ? isTabbable : isFocusable,
      options,
    );
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
    return this._focusTreeNode.focus(target, options);
  }

  /**
   * Focus the previous focusable element relative to
   * the currently focused element in the _deep_ `FocusManager` scope,
   * or if `tabbable` is `true`, the previous tabbable element
   * relative to the currently focused element in scope.
   *
   * Accepts either a `tabbable` boolean, or a focus options object
   * that may include a `tabbable` boolean field. See `focus` for
   * more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - a descendant of any nested `FocusManager` element.
   */
  focusPrevious(
    /**
     * Either an optional boolean indicating whether to focus
     * the previous _tabbable_ element instead, or an optional object
     * for controlling aspects of the focusing process.
     */
    tabbableOrOptions?: boolean | (FocusOptions & {tabbable?: boolean}),
  ): Element | null {
    const {tabbable, ...options} =
      typeof tabbableOrOptions === 'object'
        ? tabbableOrOptions
        : {tabbable: tabbableOrOptions};
    return this._focusTreeNode.focusPrevious(
      tabbable ? isTabbable : isFocusable,
      options,
    );
  }

  /**
   * Focus the next focusable element relative to
   * the currently focused element in the _deep_ `FocusManager` scope,
   * or if `tabbable` is `true`, the next tabbable element
   * relative to the currently focused element in scope.
   *
   * Accepts either a `tabbable` boolean, or a focus options object
   * that may include a `tabbable` boolean field. See `focus` for
   * more on focus options.
   *
   * An element is in the _deep_ scope if it is:
   *  - focusable
   *  - a descendant of the `FocusManager` element
   *  - a descendant of any nested `FocusManager` element.
   */
  focusNext(
    /**
     * Either an optional boolean indicating whether to focus
     * the next _tabbable_ element instead, or an optional object
     * for controlling aspects of the focusing process.
     */
    tabbableOrOptions?: boolean | (FocusOptions & {tabbable?: boolean}),
  ): Element | null {
    const {tabbable, ...options} =
      typeof tabbableOrOptions === 'object'
        ? tabbableOrOptions
        : {tabbable: tabbableOrOptions};
    return this._focusTreeNode.focusNext(
      tabbable ? isTabbable : isFocusable,
      options,
    );
  }
}

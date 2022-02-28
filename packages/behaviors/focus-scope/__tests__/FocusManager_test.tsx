import FocusManager from '../src/FocusManager';
import FocusTreeNode, {isTabbable, isFocusable} from '../src/FocusTreeNode';

const div = (parent = document.body): HTMLDivElement => {
  const el = document.createElement('div');
  parent.appendChild(el);
  return el;
};

describe('FocusManager', () => {
  afterEach(() => {
    // Remove any nodes added to the document in tests.
    while (document.body.childNodes.length) {
      document.body.removeChild(document.body.childNodes[0]);
    }
  });

  describe('root', () => {
    it('returns the root FocusManager', () => {
      const el = div();
      const node = new FocusTreeNode(el);
      const childNode = new FocusTreeNode(div(el), null, node);
      const manager = new FocusManager(childNode);
      expect(manager.root).toBeInstanceOf(FocusManager);
      expect(
        ((manager.root as unknown) as {_focusTreeNode: FocusTreeNode})
          ._focusTreeNode.domTarget,
      ).toBe(el);
    });

    it('returns this FocusManager when it is the root', () => {
      const node = new FocusTreeNode(document.createElement('div'));
      const manager = new FocusManager(node);
      expect(manager.root).toBe(manager);
    });
  });

  describe('parent', () => {
    it('returns the parent FocusManager', () => {
      const el = div();
      const node = new FocusTreeNode(el);
      const childNode = new FocusTreeNode(div(el), null, node);
      const manager = new FocusManager(childNode);
      expect(manager.parent).toBeInstanceOf(FocusManager);
      expect(
        ((manager.parent as unknown) as {_focusTreeNode: FocusTreeNode})
          ._focusTreeNode.domTarget,
      ).toBe(el);
    });

    it('returns null when there is no parent FocusManager', () => {
      const node = new FocusTreeNode(document.createElement('div'));
      const manager = new FocusManager(node);
      expect(manager.parent).toBeNull();
    });
  });

  describe('getChildManagers', () => {
    it('returns an array of child managers', () => {
      const el = div();
      const childEl = div(el);
      const siblingEl = div(el);
      const node = new FocusTreeNode(el);
      new FocusTreeNode(childEl, null, node);
      new FocusTreeNode(siblingEl, null, node);
      const manager = new FocusManager(node);
      const [childManager, siblingManager] = manager.getChildManagers();
      expect(childManager).toBeInstanceOf(FocusManager);
      expect(
        ((childManager as unknown) as {_focusTreeNode: FocusTreeNode})
          ._focusTreeNode.domTarget,
      ).toBe(childEl);
      expect(siblingManager).toBeInstanceOf(FocusManager);
      expect(
        ((siblingManager as unknown) as {_focusTreeNode: FocusTreeNode})
          ._focusTreeNode.domTarget,
      ).toBe(siblingEl);
    });
  });

  type MethodName = 'focusFirst' | 'focusLast' | 'focusNext' | 'focusPrevious';

  describe.each([
    'focusFirst',
    'focusLast',
    'focusNext',
    'focusPrevious',
  ] as MethodName[])('%s', (methodName: MethodName) => {
    it('supports a tabbable boolean', () => {
      const methodSpy = jest.spyOn(FocusTreeNode.prototype, methodName);
      const manager = new FocusManager(new FocusTreeNode(div()));
      manager[methodName]();
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isFocusable,
        expect.any(Object),
      );
      methodSpy.mockClear();
      manager[methodName](false);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isFocusable,
        expect.any(Object),
      );
      methodSpy.mockClear();
      manager[methodName](true);
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isTabbable,
        expect.any(Object),
      );
      methodSpy.mockRestore();
    });

    it('supports focus options', () => {
      const methodSpy = jest.spyOn(FocusTreeNode.prototype, methodName);
      const manager = new FocusManager(new FocusTreeNode(div()));
      manager[methodName]({preventScroll: true});
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isFocusable,
        expect.objectContaining({preventScroll: true}),
      );
      methodSpy.mockClear();
      manager[methodName]({tabbable: false, preventScroll: true});
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isFocusable,
        expect.objectContaining({preventScroll: true}),
      );
      methodSpy.mockClear();
      manager[methodName]({tabbable: true, preventScroll: true});
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isTabbable,
        expect.objectContaining({preventScroll: true}),
      );
      methodSpy.mockClear();
      manager[methodName]({tabbable: true, preventScroll: false});
      expect(methodSpy).toHaveBeenCalledTimes(1);
      expect(methodSpy).toHaveBeenLastCalledWith(
        isTabbable,
        expect.objectContaining({preventScroll: false}),
      );
      expect(methodSpy).toHaveBeenLastCalledWith(
        isTabbable,
        expect.not.objectContaining({tabbable: true}),
      );
      methodSpy.mockRestore();
    });
  });
});

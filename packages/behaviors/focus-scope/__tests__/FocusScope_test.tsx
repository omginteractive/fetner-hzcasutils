/* eslint-env jest, browser */
import React, {Fragment} from 'react';
import {render, createEvent, fireEvent} from '@testing-library/react';
import {print, wrap} from 'jest-snapshot-serializer-raw';
import {FocusScope} from '../src';
import FocusManager from '../src/FocusManager';
import FocusTreeNode from '../src/FocusTreeNode';

const NOOP = (): void => {
  /* boop! */
};

const indent = (value: string, depth: number): string => {
  const indentation = new Array(depth).fill('  ').join('');
  return value
    .split('\n')
    .map(line => `${indentation}${line}`)
    .join('\n');
};

const serializeFocusTreeNode = (node: FocusTreeNode, depth = 0): string =>
  indent(
    `<FocusTreeNode id="${node.id ??
      (!node.parent ? '<root>' : 'undefined')}"` +
      (node.hasChildNodes()
        ? '>\n' +
          node
            .getChildNodes()
            .map(child => serializeFocusTreeNode(child, depth + 1)) +
          '\n</FocusTreeNode>'
        : ' />'),
    node.hasChildNodes() ? depth : Math.max(0, depth - 1),
  );

expect.addSnapshotSerializer({
  serialize: (node: FocusTreeNode) => print(wrap(serializeFocusTreeNode(node))),
  test: node => node && node instanceof FocusTreeNode,
});

const polyfillHTMLElement = (HTMLElementClass = HTMLElement): (() => void) => {
  const offsetParentDescriptor = Object.getOwnPropertyDescriptor(
    HTMLElementClass.prototype,
    'offsetParent',
  );
  // Polyfill `HTMLElement.offsetParent` because we expect it
  // to be defined for a focusable node, but JSDOM doesn't implement it.
  // See https://github.com/jsdom/jsdom/issues/1261
  Object.defineProperty(HTMLElementClass.prototype, 'offsetParent', {
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
  return () => {
    // Restore original `HTMLElement.offsetParent`.
    if (offsetParentDescriptor) {
      Object.defineProperty(
        HTMLElementClass.prototype,
        'offsetParent',
        offsetParentDescriptor,
      );
    }
  };
};

describe('FocusScope', () => {
  let cleanupPolyfill: () => void;

  beforeAll(() => {
    cleanupPolyfill = polyfillHTMLElement();
  });

  afterAll(() => {
    cleanupPolyfill && cleanupPolyfill();
  });

  it('renders a span by default', () => {
    const {getByTestId} = render(<FocusScope data-testid="test" />);
    const result = getByTestId('test');
    expect(result).toBeInTheDocument();
    expect(result).toBeInstanceOf(HTMLSpanElement);
  });

  it('supports `as` option with intrinsic elements', () => {
    const {getByTestId} = render(<FocusScope as="div" data-testid="test" />);
    const result = getByTestId('test');
    expect(result).toBeInTheDocument();
    expect(result).toBeInstanceOf(HTMLDivElement);
  });

  it("doesn't warn for valid `as` options", () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    const mockError = jest
      .spyOn(global.console, 'error')
      .mockImplementation(NOOP);
    const CustomElement = React.forwardRef(
      (
        props: JSX.IntrinsicElements['div'],
        forwardedRef: React.Ref<HTMLDivElement>,
      ): JSX.Element => (
        <div {...props} ref={forwardedRef}>
          <div data-testid="testchild" />
        </div>
      ),
    );
    CustomElement.displayName = 'CustomElement';

    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();

    const {rerender} = render(<FocusScope />);
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();

    rerender(<FocusScope as={CustomElement} />);
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();

    mockWarn.mockRestore();
    mockError.mockRestore();
  });

  it('warns for invalid `as` options', () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    const mockError = jest
      .spyOn(global.console, 'error')
      .mockImplementation(NOOP);
    const FnComponent = (): JSX.Element => <div />;
    class ClassComponent extends React.Component {
      render(): JSX.Element {
        return <div />;
      }
    }

    expect(mockWarn).not.toHaveBeenCalled();

    const {rerender} = render(<FocusScope as={FnComponent} />);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringMatching(
        'Warning: FocusScope can only be rendered as a ReactDOM element or ref-forwarding component.',
      ),
    );

    mockWarn.mockClear();
    mockError.mockClear();
    try {
      rerender(<FocusScope as={ClassComponent} />);
    } catch {
      /* boop! */
    }
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringMatching(
        'Warning: FocusScope can only be rendered as a ReactDOM element or ref-forwarding component.',
      ),
    );

    mockWarn.mockRestore();
    mockError.mockRestore();
  });

  it('supports `as` option with ref forwarding Component', () => {
    const CustomElement = React.forwardRef(
      (
        props: React.HTMLProps<HTMLDivElement>,
        forwardedRef: React.Ref<HTMLDivElement>,
      ): JSX.Element => (
        <div {...props} ref={forwardedRef}>
          <div data-testid="testchild" />
        </div>
      ),
    );
    CustomElement.displayName = 'CustomElement';
    const {getByTestId} = render(
      <FocusScope as={CustomElement} data-testid="test" />,
    );
    const result = getByTestId('testchild');
    expect(result).toBeInTheDocument();
    expect(result).toBeInstanceOf(HTMLDivElement);
  });

  it('supports `trap` option', () => {
    const {getByTestId} = render(
      <Fragment>
        <FocusScope trap>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();

    input.focus();
    fireEvent.keyDown(input, {key: 'Tab'});
    expect(input2).toHaveFocus();

    fireEvent.keyDown(input, {key: 'Tab'});
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, {key: 'Tab', shiftKey: true});
    expect(input2).toHaveFocus();

    input3.focus();
    expect(input2).toHaveFocus();
  });

  it('handles toggling trap on after mount', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        <FocusScope>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();

    input.focus();
    fireEvent.keyDown(input, {key: 'Tab'});
    expect(input2).toHaveFocus();

    fireEvent.keyDown(input2, {key: 'Tab'});
    expect(input2).toHaveFocus();

    input3.focus();
    expect(input3).toHaveFocus();

    rerender(
      <Fragment>
        <FocusScope trap>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );

    input.focus();
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, {key: 'Tab', shiftKey: true});
    expect(input2).toHaveFocus();

    input3.focus();
    expect(input2).toHaveFocus();
  });

  it('handles toggling trap off after mount', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        <FocusScope trap>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();

    input.focus();
    fireEvent.keyDown(input, {key: 'Tab'});
    expect(input2).toHaveFocus();

    fireEvent.keyDown(input, {key: 'Tab'});
    expect(input).toHaveFocus();

    input3.focus();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        <FocusScope>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );

    input.focus();
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, {key: 'Tab', shiftKey: true});
    expect(input).toHaveFocus();

    input3.focus();
    expect(input3).toHaveFocus();
  });

  it('supports `autoFocus` option', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        <input data-testid="input" />
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    input.focus();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    const input2 = getByTestId('input2');
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();
  });

  it('ignores toggling autoFocus on after mount', () => {
    const {getByTestId, rerender} = render(
      <FocusScope id="focusManager1">
        <input data-testid="input" />
      </FocusScope>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).not.toHaveFocus();

    rerender(
      // eslint-disable-next-line jsx-a11y/no-autofocus
      <FocusScope id="focusManager1" autoFocus>
        <input data-testid="input" />
      </FocusScope>,
    );
    expect(input).not.toHaveFocus();
  });

  it('supports `restoreFocus` option', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        <input data-testid="input" />
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    input.focus();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
        <FocusScope restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    const input2 = getByTestId('input2');
    expect(input2).toBeInTheDocument();
    expect(input).toHaveFocus();

    input2.focus();
    expect(input2).toHaveFocus();
    expect(input).not.toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
      </Fragment>,
    );
    expect(input2).not.toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('handles toggling restoreFocus on after mount', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
        <FocusScope>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
    const input2 = getByTestId('input2');
    expect(input2).toBeInTheDocument();

    input2.focus();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
        <FocusScope restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
      </Fragment>,
    );
    expect(input2).not.toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('handles toggling restoreFocus off after mount', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        <input data-testid="input" />
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    input.focus();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    const input2 = getByTestId('input2');
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        <input data-testid="input" />
      </Fragment>,
    );
    expect(input).toBeInTheDocument();
    expect(input).not.toHaveFocus();
  });

  it('ignores restoreFocus when original target has been removed', () => {
    const {getByTestId, rerender} = render(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    const input2 = getByTestId('input2');
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus></FocusScope>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus restoreFocus>
          <input data-testid="input2" />
        </FocusScope>
      </Fragment>,
    );
    expect(input).not.toBeInTheDocument();
    expect(input).not.toHaveFocus();
    const newInput = getByTestId('input');
    expect(newInput).toBeInTheDocument();
    expect(newInput).not.toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
      </Fragment>,
    );
    expect(newInput).toBeInTheDocument();
    expect(newInput).not.toHaveFocus();
    expect(input2).not.toBeInTheDocument();
    expect(input2).not.toHaveFocus();
  });

  it('supports `onFocus` callback', () => {
    const cb = jest.fn();
    const {getByTestId} = render(
      <Fragment>
        <FocusScope onFocus={cb}>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();
    expect(cb).not.toHaveBeenCalled();

    input.focus();
    expect(input).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb).toHaveBeenLastCalledWith(
      expect.any(FocusEvent),
      expect.any(FocusManager),
    );

    input2.focus();
    expect(input2).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);

    input3.focus();
    expect(input3).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);

    input2.focus();
    expect(input2).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenLastCalledWith(
      expect.any(FocusEvent),
      expect.any(FocusManager),
    );
  });

  it('supports `onBlur` callback', () => {
    const cb = jest.fn();
    const {getByTestId} = render(
      <Fragment>
        <FocusScope onBlur={cb}>
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();
    expect(cb).not.toHaveBeenCalled();

    input.focus();
    expect(input).toHaveFocus();
    expect(cb).not.toHaveBeenCalled();

    input2.focus();
    expect(input2).toHaveFocus();
    expect(cb).not.toHaveBeenCalled();

    input3.focus();
    expect(input3).toHaveFocus();
    expect(cb).toHaveBeenCalledWith(
      expect.any(FocusEvent),
      expect.any(FocusManager),
    );
  });

  it('supports `onKeyPress` callback', () => {
    const cb = jest.fn();
    const {getByTestId, rerender} = render(
      <FocusScope data-testid="test" onKeyPress={cb}>
        <input data-testid="input1" />
        <input data-testid="input2" />
        <input data-testid="input3" />
      </FocusScope>,
    );
    const div = getByTestId('test');
    const input1 = getByTestId('input1');
    const input2 = getByTestId('input2');
    input1.focus();
    expect(input1).toHaveFocus();
    expect(cb).not.toHaveBeenCalled();

    const tabKeyPressEvent1 = createEvent.keyDown(div, {key: 'Tab'});
    fireEvent(div, tabKeyPressEvent1);
    expect(cb).toHaveBeenCalledWith(
      expect.any(KeyboardEvent),
      expect.any(FocusManager),
    );
    expect(tabKeyPressEvent1.defaultPrevented).toBe(true);
    expect(input2).toHaveFocus();

    rerender(
      <FocusScope data-testid="test" onKeyPress={e => e.preventDefault()}>
        <input data-testid="input1" />
        <input data-testid="input2" />
        <input data-testid="input3" />
      </FocusScope>,
    );
    const tabKeyPressEvent2 = createEvent.keyDown(div, {key: 'Tab'});
    fireEvent(div, tabKeyPressEvent2);
    expect(tabKeyPressEvent2.defaultPrevented).toBe(true);
    expect(input2).toHaveFocus();
  });

  it('supports nested FocusScope hierarchies', () => {
    const cb = jest.fn();
    const {getByTestId} = render(
      <div>
        <FocusScope id="focusManager1" onFocus={cb}>
          <span>
            <input data-testid="input" />
            <FocusScope id="focusManager2" onFocus={cb}>
              <input data-testid="input2" />
              <FocusScope id="focusManager3" onFocus={cb}>
                <div>
                  <input data-testid="input3" />
                </div>
              </FocusScope>
            </FocusScope>
          </span>
        </FocusScope>
      </div>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input2).toBeInTheDocument();
    expect(input3).toBeInTheDocument();

    input.focus();
    expect(input).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);
    const focusManager1 = cb.mock.calls[0][1];
    expect(focusManager1).toBeInstanceOf(FocusManager);

    cb.mockReset();
    input2.focus();
    expect(input2).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);
    const focusManager2 = cb.mock.calls[0][1];
    expect(focusManager2).toBeInstanceOf(FocusManager);
    expect(focusManager2).not.toBe(focusManager1);
    expect(focusManager2._focusTreeNode).not.toBe(focusManager1._focusTreeNode);

    cb.mockReset();
    input3.focus();
    expect(input3).toHaveFocus();
    expect(cb).toHaveBeenCalledTimes(1);
    const focusManager3 = cb.mock.calls[0][1];
    expect(focusManager3).toBeInstanceOf(FocusManager);
    expect(focusManager3).not.toBe(focusManager1);
    expect(focusManager3._focusTreeNode).not.toBe(focusManager1._focusTreeNode);
    expect(focusManager3).not.toBe(focusManager2);
    expect(focusManager3._focusTreeNode).not.toBe(focusManager2._focusTreeNode);

    expect(focusManager1.parent).toBeInstanceOf(FocusManager);
    expect(focusManager2.parent).toBeInstanceOf(FocusManager);
    expect(focusManager2.parent).not.toBe(focusManager1);
    expect(focusManager2.parent._focusTreeNode).toBe(
      focusManager1._focusTreeNode,
    );
    expect(focusManager3.parent).toBeInstanceOf(FocusManager);
    expect(focusManager3.parent).not.toBe(focusManager2);
    expect(focusManager3.parent._focusTreeNode).toBe(
      focusManager2._focusTreeNode,
    );

    expect(focusManager1.parent._focusTreeNode).toMatchInlineSnapshot(`
      <FocusTreeNode id="<root>">
        <FocusTreeNode id="focusManager1">
            <FocusTreeNode id="focusManager2">
                <FocusTreeNode id="focusManager3" />
            </FocusTreeNode>
        </FocusTreeNode>
      </FocusTreeNode>
    `);
  });

  it('reparents nested FocusScope hierarchies', () => {
    const cb = jest.fn();
    const {getByTestId, rerender} = render(
      <div>
        <FocusScope id="focusManager1" onFocus={cb}>
          <span>
            <input data-testid="input" />
            <FocusScope id="focusManager2" onFocus={cb}>
              <input data-testid="input2" />
              <FocusScope id="focusManager3" onFocus={cb}>
                <div>
                  <input data-testid="input3" />
                </div>
              </FocusScope>
            </FocusScope>
          </span>
        </FocusScope>
      </div>,
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    input.focus();
    input2.focus();
    input3.focus();
    const [
      [, focusManager1],
      [, focusManager2],
      [, focusManager3],
    ] = cb.mock.calls;
    expect(focusManager2.parent._focusTreeNode).toBe(
      focusManager1._focusTreeNode,
    );
    expect(focusManager3.parent._focusTreeNode).toBe(
      focusManager2._focusTreeNode,
    );
    expect(focusManager1.parent._focusTreeNode).toMatchInlineSnapshot(`
      <FocusTreeNode id="<root>">
        <FocusTreeNode id="focusManager1">
            <FocusTreeNode id="focusManager2">
                <FocusTreeNode id="focusManager3" />
            </FocusTreeNode>
        </FocusTreeNode>
      </FocusTreeNode>
    `);

    rerender(
      <div>
        <FocusScope id="focusManager1" onFocus={cb}>
          <span>
            <input data-testid="input" />
            <input data-testid="input2" />
            <FocusScope id="focusManager3" onFocus={cb}>
              <div>
                <input data-testid="input3" />
              </div>
            </FocusScope>
          </span>
        </FocusScope>
      </div>,
    );

    const newInput = getByTestId('input');
    const newInput3 = getByTestId('input3');
    cb.mockReset();
    newInput.focus();
    expect(newInput).toBe(input);
    newInput3.focus();
    expect(newInput3).not.toBe(input3);
    const [[, newFocusManager1], [, newFocusManager3]] = cb.mock.calls;
    expect(newFocusManager1).not.toBe(focusManager1);
    expect(newFocusManager1._focusTreeNode).toBe(focusManager1._focusTreeNode);
    expect(newFocusManager3).not.toBe(focusManager3);
    expect(newFocusManager3._focusTreeNode).not.toBe(
      focusManager3._focusTreeNode,
    );
    expect(newFocusManager3.parent).not.toBe(focusManager1);
    expect(newFocusManager3.parent._focusTreeNode).toBe(
      focusManager1._focusTreeNode,
    );
    expect(focusManager2.parent).toBeNull();
    expect(focusManager3.parent).toBeNull();
    expect(focusManager1.parent._focusTreeNode).toMatchInlineSnapshot(`
      <FocusTreeNode id="<root>">
        <FocusTreeNode id="focusManager1">
          <FocusTreeNode id="focusManager3" />
        </FocusTreeNode>
      </FocusTreeNode>
    `);
  });

  it('supports a render children prop', () => {
    const renderProp = jest.fn(({ref}) => <div ref={ref} data-testid="div" />);
    const {getByTestId, rerender} = render(
      <FocusScope id="test">{renderProp}</FocusScope>,
    );
    const div = getByTestId('div');
    expect(div).toBeInTheDocument();
    expect(renderProp).toHaveBeenLastCalledWith(
      expect.objectContaining({focusManager: expect.any(FocusManager)}),
    );
    const lastFocusManager = renderProp.mock.calls[1][0].focusManager;

    renderProp.mockReset();
    rerender(<FocusScope id="test">{renderProp}</FocusScope>);
    expect(renderProp).toHaveBeenLastCalledWith(
      expect.objectContaining({focusManager: lastFocusManager}),
    );

    renderProp.mockReset();
    rerender(<FocusScope id="test2">{renderProp}</FocusScope>);
    expect(renderProp).not.toHaveBeenLastCalledWith(
      expect.objectContaining({focusManager: lastFocusManager}),
    );
    expect(renderProp).toHaveBeenLastCalledWith(
      expect.objectContaining({focusManager: expect.any(FocusManager)}),
    );
  });

  it('errors for duplicate ids', () => {
    const mockConsoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(NOOP);

    class ErrorBoundary extends React.Component<{children: React.ReactNode}> {
      state = {hasError: false, error: null};
      static getDerivedStateFromError(
        error: Error,
      ): {hasError: boolean; error: Error} {
        return {hasError: true, error};
      }
      render(): JSX.Element {
        return this.state.hasError ? (
          <div data-testid="error">oh no!</div>
        ) : (
          <div>{this.props.children}</div>
        );
      }
    }

    const {getByTestId} = render(
      <ErrorBoundary>
        <FocusScope id="test">{jest.fn()}</FocusScope>
        <FocusScope id="test">
          <input />
        </FocusScope>
      </ErrorBoundary>,
    );

    const error = getByTestId('error');
    expect(error).toBeInTheDocument();
    expect(mockConsoleError).toHaveBeenCalled();
    mockConsoleError.mockRestore();
  });

  it('warns when trap is true with a render prop', () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    expect(mockWarn).not.toHaveBeenCalled();
    const FocusScopeTest = FocusScope as React.FC<{trap: boolean}>;
    render(<FocusScopeTest trap>{jest.fn()}</FocusScopeTest>);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('trap'));
    mockWarn.mockRestore();
  });

  it('warns when onFocus is set with a render prop', () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    expect(mockWarn).not.toHaveBeenCalled();
    const FocusScopeTest = FocusScope as React.FC<{onFocus: jest.Mock}>;
    render(<FocusScopeTest onFocus={jest.fn()}>{jest.fn()}</FocusScopeTest>);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('onFocus'));
    mockWarn.mockRestore();
  });

  it('warns when onBlur is set with a render prop', () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    expect(mockWarn).not.toHaveBeenCalled();
    const FocusScopeTest = FocusScope as React.FC<{onBlur: jest.Mock}>;
    render(<FocusScopeTest onBlur={jest.fn()}>{jest.fn()}</FocusScopeTest>);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(expect.stringContaining('onBlur'));
    mockWarn.mockRestore();
  });

  it('warns when onKeyPress is set with a render prop', () => {
    const mockWarn = jest
      .spyOn(global.console, 'warn')
      .mockImplementation(NOOP);
    expect(mockWarn).not.toHaveBeenCalled();
    const FocusScopeTest = FocusScope as React.FC<{onKeyPress: jest.Mock}>;
    render(<FocusScopeTest onKeyPress={jest.fn()}>{jest.fn()}</FocusScopeTest>);
    expect(mockWarn).toHaveBeenCalledTimes(1);
    expect(mockWarn).toHaveBeenCalledWith(
      expect.stringContaining('onKeyPress'),
    );
    mockWarn.mockRestore();
  });

  it('supports autoFocus with a render prop', () => {
    const renderProp = jest.fn(({ref}) => (
      <input data-testid="input" ref={ref} />
    ));
    const {getByTestId} = render(
      // eslint-disable-next-line jsx-a11y/no-autofocus
      <FocusScope id="autoFocus" autoFocus>
        {renderProp}
      </FocusScope>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('supports restoreFocus with a render prop', () => {
    const renderProp = jest.fn(({ref}) => (
      <input data-testid="input2" ref={ref} />
    ));
    const {getByTestId, rerender} = render(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
      </Fragment>,
    );
    const input = getByTestId('input');
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
        <FocusScope restoreFocus>{renderProp}</FocusScope>
      </Fragment>,
    );
    const input2 = getByTestId('input2');
    input2.focus();
    expect(input2).toBeInTheDocument();
    expect(input2).toHaveFocus();

    rerender(
      <Fragment>
        {/* eslint-disable-next-line jsx-a11y/no-autofocus */}
        <FocusScope autoFocus>
          <input data-testid="input" />
        </FocusScope>
      </Fragment>,
    );
    expect(input2).not.toBeInTheDocument();
    expect(input).toBeInTheDocument();
    expect(input).toHaveFocus();
  });

  it('works in an iframe', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument as Document;
    const ctx = (doc.defaultView as unknown) as {
      HTMLElement: typeof HTMLElement;
      FocusEvent: typeof FocusEvent;
    };
    polyfillHTMLElement(ctx.HTMLElement);
    const container = (iframe.contentDocument as Document).createElement('div');
    doc.body.appendChild(container);

    const focusCb = jest.fn();
    const blurCb = jest.fn();
    const {getByTestId} = render(
      <Fragment>
        <FocusScope onFocus={focusCb} onBlur={blurCb} data-testid="focusscope">
          <input data-testid="input" />
          <input data-testid="input2" />
        </FocusScope>
        <input data-testid="input3" />
      </Fragment>,
      {container},
    );
    const input = getByTestId('input');
    const input2 = getByTestId('input2');
    const input3 = getByTestId('input3');
    expect(input).toBeInTheDocument();
    expect(input.ownerDocument).toBe(iframe.contentDocument);
    expect(input2).toBeInTheDocument();
    expect(input2.ownerDocument).toBe(iframe.contentDocument);
    expect(input3).toBeInTheDocument();
    expect(input3.ownerDocument).toBe(iframe.contentDocument);
    expect(focusCb).not.toHaveBeenCalled();
    expect(blurCb).not.toHaveBeenCalled();

    input.focus();
    expect(input).toHaveFocus();
    expect(focusCb).toHaveBeenCalledTimes(1);
    expect(focusCb).toHaveBeenLastCalledWith(
      expect.any(ctx.FocusEvent),
      expect.any(FocusManager),
    );
    expect(blurCb).not.toHaveBeenCalled();

    input2.focus();
    expect(input2).toHaveFocus();
    expect(focusCb).toHaveBeenCalledTimes(1);
    expect(blurCb).not.toHaveBeenCalled();

    input3.focus();
    expect(input3).toHaveFocus();
    expect(focusCb).toHaveBeenCalledTimes(1);
    expect(blurCb).toHaveBeenCalledTimes(1);
    expect(blurCb).toHaveBeenLastCalledWith(
      expect.any(ctx.FocusEvent),
      expect.any(FocusManager),
    );

    input2.focus();
    expect(input2).toHaveFocus();
    expect(focusCb).toHaveBeenCalledTimes(2);
    expect(focusCb).toHaveBeenLastCalledWith(
      expect.any(ctx.FocusEvent),
      expect.any(FocusManager),
    );
    expect(blurCb).toHaveBeenCalledTimes(1);
  });
});

/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import {renderHook} from '@testing-library/react-hooks';
import {KeyboardSequence} from 'testutils/EventSequence';
jest.mock('tiny-warning');
import useKeyPress, {UseKeyPressConfig} from '../src';
import {Navigation} from '../src/navigation';
import {Whitespace} from '../src/whitespace';
import {UI} from '../src/ui';

describe('useKeyPress', () => {
  test('returns a bind function', () => {
    const {result, rerender} = renderHook((config: UseKeyPressConfig = {}) =>
      useKeyPress(jest.fn(), config),
    );
    expect(result.current).toBeInstanceOf(Function);

    const lastResult = result.current;
    rerender({domTarget: document.createElement('input')});
    expect(result.current).toBeInstanceOf(Function);
    expect(result.current).toBe(lastResult);
  });

  test('binds to a React element', async () => {
    const {result} = renderHook(() => useKeyPress(jest.fn()));
    expect(result.current()).toMatchObject({
      onKeyDown: expect.any(Function),
      onKeyUp: expect.any(Function),
    });

    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress(cb);
      return <input data-testid="input" {...bind()} />;
    };
    const {findByTestId} = render(<KeyPressUser />);
    const input = await findByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test('binds to a DOM element', async () => {
    const input = document.createElement('input');
    document.body.appendChild(input);
    expect(input).toBeInTheDocument();

    const cb = jest.fn();
    const {result, unmount} = renderHook(() =>
      useKeyPress(cb, {domTarget: input}),
    );
    expect(result.current()).toBeUndefined();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);

    unmount();
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);

    input.remove();
    expect(input).not.toBeInTheDocument();
  });

  test('binds to a Ref element', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const ref = React.useRef(null);
      const bind = useKeyPress(cb, {domTarget: ref});
      React.useEffect(bind, [bind]);
      return <input data-testid="input" ref={ref} />;
    };
    const {findByTestId} = render(<KeyPressUser />);
    const input = await findByTestId('input');
    expect(input).toBeInTheDocument();
    expect(cb).not.toHaveBeenCalled();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);
  });

  test('unbinds on unmount', async () => {
    const keyPressCb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress(keyPressCb);
      return <input data-testid="key-press-input" {...bind()} />;
    };

    const domTargetCb = jest.fn();
    const DomTargetUser = (props: {
      domTarget: React.RefObject<HTMLInputElement>;
    }): JSX.Element => {
      const bind = useKeyPress(domTargetCb, props);
      React.useEffect(bind, [bind]);
      return <div />;
    };

    const Wrapper = (props: {withKeyPress?: boolean}): JSX.Element => {
      const ref = React.useRef(null);
      return (
        <React.Fragment>
          <input data-testid="dom-target-input" ref={ref} />
          {props.withKeyPress ? (
            <React.Fragment>
              <KeyPressUser />
              <DomTargetUser domTarget={ref} />
            </React.Fragment>
          ) : null}
        </React.Fragment>
      );
    };

    const {findByTestId, rerender} = render(<Wrapper withKeyPress />);

    const domTargetInput = await findByTestId('dom-target-input');
    expect(domTargetInput).toBeInTheDocument();

    const keyPressInput = await findByTestId('key-press-input');
    expect(keyPressInput).toBeInTheDocument();

    const domTargetKeyboard = new KeyboardSequence(domTargetInput);
    await domTargetKeyboard.down({key: 'e'}).up();
    expect(domTargetCb).toHaveBeenCalledTimes(2);
    expect(keyPressCb).not.toHaveBeenCalled();

    const keyPressKeyboard = new KeyboardSequence(keyPressInput);
    await keyPressKeyboard.down({key: 'e'}).up();
    expect(keyPressCb).toHaveBeenCalledTimes(2);
    expect(domTargetCb).toHaveBeenCalledTimes(2);

    rerender(<Wrapper />);
    expect(domTargetInput).toBeInTheDocument();
    expect(keyPressInput).not.toBeInTheDocument();

    await domTargetKeyboard.down({key: 'e'}).up();
    expect(domTargetCb).toHaveBeenCalledTimes(2);

    await keyPressKeyboard.down({key: 'e'}).up();
    expect(keyPressCb).toHaveBeenCalledTimes(2);
  });

  test('calls a callback on key event', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress(cb);
      return <input data-testid="input" {...bind()} />;
    };
    const {getByTestId} = render(<KeyPressUser />);
    const input = await getByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard
      .down({key: 'e'})
      .repeat()
      .up();

    expect(cb).toHaveBeenCalledTimes(3);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  test('calls onKey on key event', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress({onKey: cb});
      return <input data-testid="input" {...bind()} />;
    };

    const {getByTestId} = render(<KeyPressUser />);
    const input = await getByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  test('calls onKeyPress on key press event', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress({onKeyPress: cb});
      return <input data-testid="input" {...bind()} />;
    };

    const {getByTestId} = render(<KeyPressUser />);
    const input = await getByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(1);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  test('calls onKeyRelease on key release event', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress({onKeyRelease: cb});
      return <input data-testid="input" {...bind()} />;
    };

    const {getByTestId} = render(<KeyPressUser />);
    const input = await getByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(1);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  test('can be disabled', async () => {
    const cb = jest.fn();
    const KeyPressUser = (props: {disabled?: boolean}): JSX.Element => {
      const bind = useKeyPress(cb, {enabled: !props.disabled});
      return <input data-testid="input" {...bind()} />;
    };

    const {getByTestId, rerender} = render(<KeyPressUser />);

    const input = await getByTestId('input');
    expect(input).toBeInTheDocument();

    const keyboard = new KeyboardSequence(input);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);

    rerender(<KeyPressUser disabled />);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(2);

    rerender(<KeyPressUser />);
    await keyboard.down({key: 'e'}).up();
    expect(cb).toHaveBeenCalledTimes(4);
  });

  test('supports event options', async () => {
    let assertions = 0;

    interface KeyPressUserProps {
      cb: jest.Mock;
      eventOptions?: UseKeyPressConfig['eventOptions'];
    }

    const KeyPressUser = ({
      cb,
      eventOptions,
    }: KeyPressUserProps): JSX.Element => {
      const bind = useKeyPress(cb, {eventOptions});
      const handlers = bind();
      return (
        <div {...handlers}>
          <input data-testid="input" />
        </div>
      );
    };

    let cb = jest.fn(({event}) => {
      event.preventDefault();
      // NOTE: These results only _coincidentally_ match our expectations.
      // See https://github.com/facebook/react/issues/6436
      // See https://github.com/facebook/react/issues/9783
      expect(event.defaultPrevented).toBe(true); // Default always preventable :(
      expect(event.eventPhase).toBe(3); // Always bubble phase :(
    });
    const {findByTestId, rerender} = render(<KeyPressUser cb={cb} />);
    const input = await findByTestId('input');
    const keyboard = new KeyboardSequence(input);

    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 5; // 1 + (2 in cb, called twice);

    cb = jest.fn(({event}) => {
      event.preventDefault();
      // NOTE: We _would_ expect this to be `false` when `{passive: true}`,
      // but it is not curently possible to passively listen to ReactDOM events.
      // See https://github.com/facebook/react/issues/6436
      expect(event.defaultPrevented).toBe(true); // Default always preventable :(
    });
    rerender(<KeyPressUser cb={cb} eventOptions={{passive: true}} />);
    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 3; // 1 + (2 in cb, called twice);

    cb = jest.fn(({event}) => {
      // NOTE: we _would_ expect this to be `1` (capture phase)
      // when`{capture: true}`, but it is not currently possible to
      // observe the event phase for ReactDOM events.
      // See https://github.com/facebook/react/issues/9783
      expect(event.eventPhase).toBe(3); // Always bubble phase :(
    });
    rerender(<KeyPressUser cb={cb} eventOptions={{capture: true}} />);
    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 3; // 1 + (2 in cb, called twice);

    const {
      result: hookResult,
      rerender: rerenderHook,
    } = renderHook(({capture}: {capture?: boolean} = {}) =>
      useKeyPress(cb, {eventOptions: {capture}}),
    );
    expect(hookResult.current()).toMatchObject({
      onKeyDown: expect.any(Function),
      onKeyUp: expect.any(Function),
      onKeyDownCapture: null,
      onKeyUpCapture: null,
    });
    assertions += 1;

    rerenderHook({capture: true});
    expect(hookResult.current()).toMatchObject({
      onKeyDown: null,
      onKeyUp: null,
      onKeyDownCapture: expect.any(Function),
      onKeyUpCapture: expect.any(Function),
    });
    assertions += 1;

    expect.assertions(assertions);
  });

  test('supports event options with DOM target', async () => {
    let assertions = 0;

    const input = document.createElement('input');
    document.body.appendChild(input);
    const domTarget = document.body;
    const keyboard = new KeyboardSequence(input);
    interface RenderHookProps {
      cb: jest.Mock;
      eventOptions?: UseKeyPressConfig['eventOptions'];
    }

    let cb = jest.fn(({event}) => {
      event.preventDefault();
      expect(event.eventPhase).toBe(3); // Bubble phase
      expect(event.defaultPrevented).toBe(true);
    });

    const {result, rerender} = renderHook(
      ({cb, eventOptions}: RenderHookProps) =>
        useKeyPress(cb, {domTarget, eventOptions}),
      {initialProps: {cb}},
    );
    result.current();
    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 5; // 1 + (2 in cb, called twice)

    cb = jest.fn(({event}) => {
      event.preventDefault();
      expect(event.defaultPrevented).toBe(false);
    });
    rerender({cb, eventOptions: {passive: true}});
    result.current();
    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 3; // 1 + (1 in cb, called twice)

    cb = jest.fn(({event}) => {
      expect(event.eventPhase).toBe(1); // Capture phase
    });
    rerender({cb, eventOptions: {capture: true}});
    result.current();
    await keyboard.space().up();
    expect(cb).toHaveBeenCalledTimes(2);
    assertions += 3; // 1 + (1 in cb, called twice)

    expect.assertions(assertions);
    input.remove();
  });

  test('handles chords (multiple keys)', async () => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress(cb);
      return <input data-testid="input" {...bind()} />;
    };

    const {findByTestId} = render(<KeyPressUser />);
    const input = await findByTestId('input');
    const spacePress = KeyboardSequence.create(input).space();
    const ePress = KeyboardSequence.create(input).down({key: 'e'});
    await spacePress;
    await ePress.up();
    await spacePress.up();

    expect(cb).toHaveBeenCalledTimes(4);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  const EventTypes = (
    eventTypeEnum: Record<string, string>,
    overrides?: Record<string, string>,
  ): [string, string][] => {
    const types: [string, string][] = [];
    for (const key of Object.values(eventTypeEnum)) {
      types.push([key, overrides?.[key] ?? key]);
    }
    return types;
  };

  it.each([
    ...EventTypes(UI, {[UI.Esc]: 'Escape'}),
    ...EventTypes(Whitespace, {[Whitespace.SpaceChar]: 'Space'}),
    ...EventTypes(Navigation, {
      [Navigation.Down]: 'ArrowDown',
      [Navigation.Left]: 'ArrowLeft',
      [Navigation.Right]: 'ArrowRight',
      [Navigation.Up]: 'ArrowUp',
    }),
  ])(`handles '%s' events with on%s named handlers`, async (key, handler) => {
    const keyHandler = jest.fn();
    const pressHandler = jest.fn();
    const releaseHandler = jest.fn();

    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress({
        [`on${handler}`]: keyHandler,
        [`on${handler}Press`]: pressHandler,
        [`on${handler}Release`]: releaseHandler,
      });
      return <input data-testid="input" {...bind()} />;
    };
    const {findByTestId} = render(<KeyPressUser />);
    const input = await findByTestId('input');
    const pressed = KeyboardSequence.create(input).down({key});

    await pressed;
    expect(pressHandler).toHaveBeenCalledTimes(1);
    expect(keyHandler).toHaveBeenCalledTimes(1);
    expect(releaseHandler).not.toHaveBeenCalled();
    expect(keyHandler.mock.calls[0]).toEqual(pressHandler.mock.calls[0]);

    await pressed.repeat();
    expect(pressHandler).toHaveBeenCalledTimes(1);
    expect(keyHandler).toHaveBeenCalledTimes(2);
    expect(releaseHandler).not.toHaveBeenCalled();

    await pressed.up();
    expect(pressHandler).toHaveBeenCalledTimes(1);
    expect(keyHandler).toHaveBeenCalledTimes(3);
    expect(releaseHandler).toHaveBeenCalledTimes(1);
    expect(keyHandler.mock.calls[2]).toEqual(releaseHandler.mock.calls[0]);
  });

  test.each([
    [['alt']],
    [['alt', 'ctrl']],
    [['alt', 'ctrl', 'meta']],
    [['alt', 'ctrl', 'meta', 'shift']],
    [['ctrl']],
    [['ctrl', 'meta']],
    [['ctrl', 'meta', 'shift']],
    [['meta']],
    [['meta', 'shift']],
    [['shift']],
  ])('handles modifier keys %j', async (modifiers: string[]) => {
    const cb = jest.fn();
    const KeyPressUser = (): JSX.Element => {
      const bind = useKeyPress(cb);
      return <input data-testid="input" {...bind()} />;
    };

    const {findByTestId} = render(<KeyPressUser />);

    const input = await findByTestId('input');
    let seq = KeyboardSequence.create(input);
    for (const modifier of modifiers as ('alt' | 'ctrl' | 'meta' | 'shift')[]) {
      seq = seq[modifier]();
    }

    await seq.space();
    expect(cb).toHaveBeenCalledTimes(1);
    cb.mock.calls.forEach(([{event, ...state}]) => {
      expect(event).toBeDefined();
      expect(state).toMatchSnapshot({
        startTime: expect.any(Number),
        elapsedTime: expect.any(Number),
        timeStamp: expect.any(Number),
      });
    });
  });

  test('bind warns if being spread without being called (nice to have)', async () => {
    const mockWarn = require('tiny-warning') as jest.Mock;
    mockWarn.mockReset();
    expect(mockWarn).not.toHaveBeenCalled();
    const KeyPressUser = (props: {type?: string}): JSX.Element => {
      const bind = useKeyPress(jest.fn());
      return props.type ? <input {...bind} {...props} /> : <input {...bind} />;
    };
    const {rerender} = render(<KeyPressUser />);
    expect(mockWarn).toHaveBeenCalled();
    mockWarn.mockReset();
    expect(mockWarn).not.toHaveBeenCalled();
    rerender(<KeyPressUser type="text" />);
    expect(mockWarn).toHaveBeenCalled();
  });
});

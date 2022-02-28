/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import usePageGesture, {
  FromInputState,
  CANCELED,
  PREVIOUS,
  NEXT,
  FIRST,
  LAST,
  VERTICAL,
  PageGestureConfig,
  PaginationHandlers,
} from '../usePageGesture';
import {GestureLikeSequence} from './gestureutils';

describe('usePageGesture HORIZONTAL', () => {
  const config: PageGestureConfig | null = null;
  const handler = jest.fn();
  const onNext = jest.fn();
  const onPrevious = jest.fn();
  const onFirst = jest.fn();
  const onLast = jest.fn();
  const paginationHandlers: PaginationHandlers = {
    onNext,
    onPrevious,
    onFirst,
    onLast,
  };
  let callback: FromInputState;
  let gesture: GestureLikeSequence;

  beforeEach(() => {
    handler.mockClear();
    onNext.mockClear();
    onPrevious.mockClear();
    onFirst.mockClear();
    onLast.mockClear();
    callback = () => {
      throw new Error('Update callback was not defined!');
    };
    const PageGestureUser = (): JSX.Element => {
      const handlerCallback = usePageGesture(handler, config);
      const paginationCallback = usePageGesture(paginationHandlers, config);
      callback = v => {
        handlerCallback(v);
        paginationCallback(v);
      };
      return <div />;
    };
    render(<PageGestureUser />);
    gesture = GestureLikeSequence.create(callback);
  });

  test('ignores UP gesture', async () => {
    await gesture.up();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores DOWN gesture', async () => {
    await gesture.down();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs PREVIOUS action on RIGHT gesture', async () => {
    await gesture.right();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs NEXT action on LEFT gesture', async () => {
    await gesture.left();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores vertical noise in gesture', async () => {
    await gesture.left().up();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('cancels gesture that reverses direction', async () => {
    await gesture.left().right();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs action when reverse gesture clears threshold', async () => {
    await gesture
      .left()
      .right()
      .right();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores ARROW_DOWN press', async () => {
    await gesture.arrowDown();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs PREVIOUS action on ARROW_LEFT press', async () => {
    await gesture.arrowLeft();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs NEXT action on ARROW_RIGHT press', async () => {
    await gesture.arrowRight();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores ARROW_UP press', async () => {
    await gesture.arrowUp();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs FIRST action on HOME press', async () => {
    await gesture.home();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(FIRST);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs LAST action on END press', async () => {
    await gesture.end();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(LAST);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).toHaveBeenCalledTimes(1);
  });

  test('ignores PAGE_DOWN press', async () => {
    await gesture.pageDown();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores PAGE_UP press', async () => {
    await gesture.pageUp();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores SPACE press', async () => {
    await gesture.space();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });
});

describe('usePageGesture VERTICAL', () => {
  const config: PageGestureConfig = {orientation: VERTICAL};
  const handler = jest.fn();
  const onNext = jest.fn();
  const onPrevious = jest.fn();
  const onFirst = jest.fn();
  const onLast = jest.fn();
  const paginationHandlers: PaginationHandlers = {
    onNext,
    onPrevious,
    onFirst,
    onLast,
  };
  let callback: FromInputState;
  let gesture: GestureLikeSequence;

  beforeEach(() => {
    handler.mockClear();
    onNext.mockClear();
    onPrevious.mockClear();
    onFirst.mockClear();
    onLast.mockClear();
    callback = () => {
      throw new Error('Update callback was not defined!');
    };
    const PageGestureUser = (): JSX.Element => {
      const handlerCallback = usePageGesture(handler, config);
      const paginationCallback = usePageGesture(paginationHandlers, config);
      callback = v => {
        handlerCallback(v);
        paginationCallback(v);
      };
      return <div />;
    };
    render(<PageGestureUser />);
    gesture = GestureLikeSequence.create(callback);
  });

  test('performs NEXT action on UP gesture', async () => {
    await gesture.up();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs PREVIOUS action on DOWN gesture', async () => {
    await gesture.down();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores RIGHT gesture', async () => {
    await gesture.right();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores LEFT gesture', async () => {
    await gesture.left();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores horizontal noise in gesture', async () => {
    await gesture.up().left();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('cancels gesture that reverses direction', async () => {
    await gesture.up().down();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs action when reverse gesture clears threshold', async () => {
    await gesture
      .up()
      .down()
      .down();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs NEXT action on ARROW_DOWN press', async () => {
    await gesture.arrowDown();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores ARROW_LEFT press', async () => {
    await gesture.arrowLeft();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('ignores ARROW_RIGHT press', async () => {
    await gesture.arrowRight();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(CANCELED);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs PREVIOUS action on ARROW_UP press', async () => {
    await gesture.arrowUp();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs FIRST action on HOME press', async () => {
    await gesture.home();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(FIRST);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).toHaveBeenCalledTimes(1);
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs LAST action on END press', async () => {
    await gesture.end();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(LAST);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).toHaveBeenCalledTimes(1);
  });

  test('performs NEXT action on PAGE_DOWN press', async () => {
    await gesture.pageDown();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs PREVIOUS action on PAGE_UP press', async () => {
    await gesture.pageUp();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(PREVIOUS);
    expect(onNext).not.toHaveBeenCalled();
    expect(onPrevious).toHaveBeenCalledTimes(1);
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });

  test('performs NEXT action on SPACE press', async () => {
    await gesture.space();
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenLastCalledWith(NEXT);
    expect(onNext).toHaveBeenCalledTimes(1);
    expect(onPrevious).not.toHaveBeenCalled();
    expect(onFirst).not.toHaveBeenCalled();
    expect(onLast).not.toHaveBeenCalled();
  });
});

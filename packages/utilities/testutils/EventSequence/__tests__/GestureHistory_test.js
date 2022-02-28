/* eslint-env jest, browser */
import GestureHistory from '../GestureHistory';

test('GestureHistory gets accurate size', () => {
  const history = new GestureHistory();
  expect(history.size).toBe(0);
  history.next(new Event('a'));
  expect(history.size).toBe(1);
});

test('GestureHistory gets first event', () => {
  const history = new GestureHistory();
  expect(history.first).toBeUndefined();
  history.next(new Event('a'));
  expect(history.first).toMatchObject({type: 'a'});
  history.next(new Event('b'));
  expect(history.first).toMatchObject({type: 'a'});
});

test('GestureHistory gets last event', () => {
  const history = new GestureHistory();
  expect(history.last).toBeUndefined();
  history.next(new Event('a'));
  expect(history.last).toMatchObject({type: 'a'});
  history.next(new Event('b'));
  expect(history.last).toMatchObject({type: 'b'});
});

test('GestureHistory gets nth event', () => {
  const history = new GestureHistory();
  expect(history.nth(2)).toBeUndefined();
  history.next(new Event('a'));
  expect(history.nth(2)).toBeUndefined();
  history.next(new Event('b'));
  expect(history.nth(2)).toMatchObject({type: 'b'});
  history.next(new Event('c'));
  expect(history.nth(2)).toMatchObject({type: 'b'});
});

test('GestureHistory is iterable', () => {
  const history = new GestureHistory();
  history.next(new Event('a'));
  history.next(new Event('b'));
  history.next(new Event('c'));
  expect(Array.from(history)).toMatchObject([
    {type: 'a'},
    {type: 'b'},
    {type: 'c'},
  ]);
});

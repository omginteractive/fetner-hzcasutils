/* eslint-env jest, browser */
import KeyboardSequence from '../KeyboardSequence';

beforeEach(() => {
  jest.useFakeTimers();
});

test('KeyboardSequence.down() reveals subsequence', async () => {
  const handler = jest.fn();
  const node = document.createElement('div');
  node.tabIndex = 1;

  node.addEventListener('keydown', handler);
  node.addEventListener('keyup', handler);

  let sequence = KeyboardSequence.create(node);
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).not.toHaveProperty('up', expect.any(Function));

  sequence = sequence.down({key: 'Space'});
  expect(sequence).not.toHaveProperty('down', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('up', expect.any(Function));

  sequence = sequence.repeat();
  expect(sequence).not.toHaveProperty('down', expect.any(Function));
  expect(sequence).toHaveProperty('repeat', expect.any(Function));
  expect(sequence).toHaveProperty('up', expect.any(Function));

  sequence = sequence.up();
  expect(sequence).toHaveProperty('down', expect.any(Function));
  expect(sequence).not.toHaveProperty('repeat', expect.any(Function));
  expect(sequence).not.toHaveProperty('up', expect.any(Function));

  await sequence.then(handler);

  node.removeEventListener('keydown', handler);
  node.removeEventListener('keyup', handler);

  expect(handler).toHaveBeenCalledTimes(4);

  const expectedOrder = [
    expect.objectContaining({type: 'keydown', repeat: false}),
    expect.objectContaining({type: 'keydown', repeat: true}),
    expect.objectContaining({type: 'keyup'}),
  ];

  for (let i = 0; i < expectedOrder.length; i++) {
    expect(handler).toHaveBeenNthCalledWith(i + 1, expect.any(KeyboardEvent));
    expect(handler).toHaveBeenNthCalledWith(i + 1, expectedOrder[i]);
  }

  expect(handler).toHaveBeenLastCalledWith(expectedOrder);
});

test('KeyboardSequence.repeat().up() builds on initialized down()', async () => {
  const expected = {
    key: ' ',
    code: 'Space',
    keyCode: 32,
    which: 32,
  };
  const result = await KeyboardSequence.create(document.createElement('div'))
    .down({key: expected.key})
    .repeat()
    .up();
  expect(result).toEqual([
    expect.objectContaining({type: 'keydown', repeat: false, ...expected}),
    expect.objectContaining({type: 'keydown', repeat: true, ...expected}),
    expect.objectContaining({type: 'keyup', repeat: false, ...expected}),
  ]);
});

test('KeyboardSequence continues a down sequence', async () => {
  let sequence = KeyboardSequence.create(document.createElement('div'));
  const expected = [];

  sequence = sequence.space();
  expected.push({key: ' ', type: 'keydown', repeat: false, ctrlKey: false});

  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.repeat();
  expected.push({key: ' ', type: 'keydown', repeat: true, ctrlKey: false});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.modify({ctrlKey: true});
  expected.push({key: ' ', type: 'keydown', repeat: true, ctrlKey: true});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.repeat();
  expected.push({key: ' ', type: 'keydown', repeat: true, ctrlKey: true});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.up();
  expected.push({key: ' ', type: 'keyup', repeat: false, ctrlKey: true});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));
});

test('KeyboardSequence supports modifier keys', async () => {
  let sequence = KeyboardSequence.create(document.createElement('div'));
  expect(sequence).toHaveProperty('modify', expect.any(Function));
  expect(sequence).toHaveProperty('ctrl', expect.any(Function));
  expect(sequence).toHaveProperty('alt', expect.any(Function));
  expect(sequence).toHaveProperty('meta', expect.any(Function));
  expect(sequence).toHaveProperty('shift', expect.any(Function));

  const expected = [];

  sequence = sequence.modify({ctrlKey: true});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.down({key: 'e'});
  expected.push({
    key: 'e',
    type: 'keydown',
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.modify({ctrlKey: false});
  expected.push({
    key: 'e',
    type: 'keydown',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.ctrl();
  expected.push({
    key: 'e',
    type: 'keydown',
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.up();
  expected.push({
    key: 'e',
    type: 'keyup',
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.ctrl();
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.down({key: 'f'});
  expected.push({
    key: 'f',
    type: 'keydown',
    ctrlKey: true,
    altKey: false,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.alt(false);
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.alt();
  expected.push({
    key: 'f',
    type: 'keydown',
    ctrlKey: true,
    altKey: true,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.ctrl(false);
  expected.push({
    key: 'f',
    type: 'keydown',
    ctrlKey: false,
    altKey: true,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.up();
  expected.push({
    key: 'f',
    type: 'keyup',
    ctrlKey: false,
    altKey: true,
    metaKey: false,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.modify({altKey: false});
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.shift();
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.meta();
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.space();
  expected.push({
    key: ' ',
    type: 'keydown',
    ctrlKey: false,
    altKey: false,
    metaKey: true,
    shiftKey: true,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.meta(false);
  expected.push({
    key: ' ',
    type: 'keydown',
    ctrlKey: false,
    altKey: false,
    metaKey: false,
    shiftKey: true,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.modify({shiftKey: false, metaKey: true});
  expected.push({
    key: ' ',
    type: 'keydown',
    ctrlKey: false,
    altKey: false,
    metaKey: true,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.up();
  expected.push({
    key: ' ',
    type: 'keyup',
    ctrlKey: false,
    altKey: false,
    metaKey: true,
    shiftKey: false,
  });
  expect(await sequence).toEqual(expected.map(expect.objectContaining));

  sequence = sequence.meta(false);
  expect(await sequence).toEqual(expected.map(expect.objectContaining));
});

test.each([
  ['space', {key: ' ', code: 'Space', keyCode: 32}],
  ['pageUp', {key: 'PageUp', code: 'PageUp', keyCode: 33}],
  ['pageDown', {key: 'PageDown', code: 'PageDown', keyCode: 34}],
  ['end', {key: 'End', code: 'End', keyCode: 35}],
  ['home', {key: 'Home', code: 'Home', keyCode: 36}],
  ['arrowLeft', {key: 'ArrowLeft', code: 'ArrowLeft', keyCode: 37}],
  ['arrowUp', {key: 'ArrowUp', code: 'ArrowUp', keyCode: 38}],
  ['arrowRight', {key: 'ArrowRight', code: 'ArrowRight', keyCode: 39}],
  ['arrowDown', {key: 'ArrowDown', code: 'ArrowDown', keyCode: 40}],
  ['enter', {key: 'Enter', code: 'Enter', keyCode: 13}],
  ['tab', {key: 'Tab', code: 'Tab', keyCode: 9}],
  ['backspace', {key: 'Backspace', code: 'Backspace', keyCode: 8}],
  ['escape', {key: 'Escape', code: 'Escape', keyCode: 27}],
])('KeyboardSequence has the %s key shortcut', async (name, expected) => {
  const sequence = KeyboardSequence.create(document.createElement('div'));
  expect(sequence).toHaveProperty(name, expect.any(Function));
  const result = await sequence[name]()
    .repeat()
    .up();
  expect(result).toEqual([
    expect.objectContaining({type: 'keydown', repeat: false, ...expected}),
    expect.objectContaining({type: 'keydown', repeat: true, ...expected}),
    expect.objectContaining({type: 'keyup', repeat: false, ...expected}),
  ]);
});

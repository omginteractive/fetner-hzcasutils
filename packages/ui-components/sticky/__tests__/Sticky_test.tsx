/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import {test} from '@jest/globals';
import {
  StickyPortal,
  Sticky,
  Fixed,
  useStickyState,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createStickyLayout,
} from '../src';

test('Sticky is implemented', () => {
  const {container} = render(<Sticky />);
  expect(container).toBeInTheDocument();
});
test('Fixed is implemented', () => {
  const {container} = render(<Fixed />);
  expect(container).toBeInTheDocument();
});
test('StickyPortal is implemented', () => {
  const {container} = render(<StickyPortal />);
  expect(container).toBeInTheDocument();
});

test('useStickyState initializes to equal false', () => {
  let stuck;
  const StickyState = (): JSX.Element => {
    stuck = useStickyState();
    return <h2>{stuck ? "i'm stuck :(" : "i'm free! :D"}</h2>;
  };
  render(<StickyState />);
  expect(stuck).toBe(false);
});

test.todo(`
  Add tests for createStickyLayout
  Add tests to test useStickyState functionality
  Add tests for scrolling to ensure sticky/fixed components are correct
  Add tests for Controlled vs Uncontrolled Sticky components
  Add tests for uncontrolled Sticky with Positioned Ancestor
`);

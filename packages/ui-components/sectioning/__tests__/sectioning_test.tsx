/* eslint-env jest, browser */
import React from 'react';
import {render, screen} from '@testing-library/react';
import {
  H,
  Section,
  Article,
  Aside,
  Nav,
  Body,
  Blockquote,
  Details,
  Dialog,
  Fieldset,
  Figure,
  Td,
} from '../src';

describe.each`
  Component  | renders
  ${Section} | ${'section'}
  ${Article} | ${'article'}
  ${Aside}   | ${'aside'}
  ${Nav}     | ${'nav'}
`('Sectioning content components', ({Component, renders}) => {
  describe(Component.displayName, () => {
    it(`renders ${renders}`, () => {
      render(<Component data-testid={renders} />);
      expect(screen.getByTestId(renders)).toBeInTheDocument();
    });

    it(`increments heading level`, () => {
      render(
        <Component>
          <H>first</H>
          <Component>
            <H>second</H>
            <Component>
              <H>third</H>
            </Component>
          </Component>
          <H>fourth</H>
        </Component>,
      );
      const first = screen.getByText('first');
      expect(first).toBeInTheDocument();
      expect(first.tagName).toBe('H2');

      const second = screen.getByText('second');
      expect(second).toBeInTheDocument();
      expect(second.tagName).toBe('H3');

      const third = screen.getByText('third');
      expect(third).toBeInTheDocument();
      expect(third.tagName).toBe('H4');

      const fourth = screen.getByText('fourth');
      expect(fourth).toBeInTheDocument();
      expect(fourth.tagName).toBe('H2');
    });
  });
});

describe.each`
  Component     | renders
  ${Body}       | ${'body'}
  ${Blockquote} | ${'blockquote'}
  ${Details}    | ${'details'}
  ${Dialog}     | ${'dialog'}
  ${Fieldset}   | ${'fieldset'}
  ${Figure}     | ${'figure'}
  ${Td}         | ${'td'}
`('Sectioning root components', ({Component, renders}) => {
  describe(Component.displayName, () => {
    const originalConsoleError = console.error;

    beforeEach(() => {
      // Hijack console.error to surpress warnings about invalid DOM nesting.
      console.error = (...args: Parameters<typeof console.error>) => {
        const [msg] = args;
        if (msg && msg.startsWith('Warning: validateDOMNesting')) return;
        originalConsoleError(...args);
      };
    });

    afterEach(() => {
      console.error = originalConsoleError;
    });
    it(`renders ${renders}`, () => {
      render(<Component data-testid={renders} />);
      expect(screen.getByTestId(renders)).toBeInTheDocument();
    });

    it(`resets heading level`, () => {
      render(
        <Component>
          <H>first</H>
          <Component>
            <H>second</H>
            <Component>
              <H>third</H>
            </Component>
          </Component>
          <H>fourth</H>
        </Component>,
      );
      const first = screen.getByText('first');
      expect(first).toBeInTheDocument();
      expect(first.tagName).toBe('H1');

      const second = screen.getByText('second');
      expect(second).toBeInTheDocument();
      expect(second.tagName).toBe('H1');

      const third = screen.getByText('third');
      expect(third).toBeInTheDocument();
      expect(third.tagName).toBe('H1');

      const fourth = screen.getByText('fourth');
      expect(fourth).toBeInTheDocument();
      expect(fourth.tagName).toBe('H1');
    });
  });
});

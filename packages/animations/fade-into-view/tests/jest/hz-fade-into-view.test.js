/* eslint-env jest */
import React from 'react';
import renderer from 'react-test-renderer';
import FadeIntoView from '../../src';

describe('FadeIntoView', () => {
  it('should render simple text', () => {
    const item = (
      <FadeIntoView direction="Up" render={() => <p>Boo!</p>} activate />
    );
    const renderedItem = renderer.create(item).toJSON();
    expect(renderedItem).toMatchSnapshot();
  });

  it('should render link text', () => {
    const item = (
      <FadeIntoView
        direction="Up"
        activate
        render={() => <a href="http://www.google.com">Boo!</a>}
      />
    );
    const renderedItem = renderer.create(item).toJSON();
    expect(renderedItem).toMatchSnapshot();
  });
});

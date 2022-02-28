// @ts-check

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const TEST = ({isDefault, main}) => `
/* eslint-env jest, browser */
import ${isDefault ? main : `{${main}}`} from '../src';

test('${main} is implemented', () => {
  expect(() => ${main}()).not.toThrow();
  throw new Error('implement ${main} and write some tests!');
});
`;

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const TEST_REACT_COMPONENT = ({isDefault, main}) => `
/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import ${isDefault ? main : `{${main}}`} from '../src';

test('${main} is implemented', () => {
  const {container} = render(<${main} />);
  expect(container).toBeInTheDocument();
  throw new Error('implement ${main} and write some tests!');
});
`;

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const TEST_REACT_HOOK = ({isDefault, main}) => `
/* eslint-env jest, browser */
import React from 'react';
import {render} from '@testing-library/react';
import ${isDefault ? main : `{${main}}`} from '../src';

test('${main} is implemented', () => {
  const ${main.replace(/^use/, '')}User = (): JSX.Element => {
    ${main}();
    return <div />;
  };
  const {container} = render(<${main.replace(/^use/, '')}User />);
  expect(container).toBeInTheDocument();
  throw new Error('implement ${main} and write some tests!');
});
`;

/**
 * @param {import("../../bin/create-package").Options} options
 * @returns {string}
 */
module.exports = function renderTest(options) {
  if (options.isReact && options.main.startsWith('use')) {
    return TEST_REACT_HOOK(options);
  }
  if (options.isReact && /^[A-Z]/.test(options.main)) {
    return TEST_REACT_COMPONENT(options);
  }
  return TEST(options);
};

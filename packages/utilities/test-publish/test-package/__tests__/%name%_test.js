// @ts-check

/* prettier-ignore */
/**
 * @param {string} name
 * @param {string} version
 */
const TEST_SUITE = (name, version) => `
/* eslint-env jest, node */
const {promisify} = require('util');
const readFile = promisify(require('fs').readFile);
const path = require('path');

// Testing utils for react stuff.
const React = require('react');
const {render, fireEvent} = require('@testing-library/react');
const userEvent = require('@testing-library/user-event');

describe('${name}', () => {
  test('has been installed @${version}', async () => {
    const meta = JSON.parse(
      (await readFile(
        path.resolve('node_modules', '${name}', 'package.json'),
      )).toString(),
    );
    expect(meta.name).toBe('${name}');
    expect(meta.version).toBe('${version}');
  });

  test('can be loaded as a module', () => {
    const module = require('${name}');
    expect(module).toBeDefined();
    expect(Object.keys(module)).toBeDefined();
  });
});
`;

/**
 * @param {{name: string, version: string}} options
 * @returns {string}
 */
module.exports = function renderTestSuite({name, version}) {
  return TEST_SUITE(name, version);
};

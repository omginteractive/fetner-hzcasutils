// @ts-check

const CHANGELOG = () => `
# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.
`;

/**
 * @returns {string}
 */
module.exports = function renderChangelog() {
  return CHANGELOG();
};

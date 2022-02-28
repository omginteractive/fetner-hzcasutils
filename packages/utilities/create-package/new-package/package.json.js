// @ts-check

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.type
 */
const PACKAGE_JSON = options => `
{
  "name": "@hzdg/${options.name}",
  "version": "0.0.1",
  "main": "cjs/index.js",
  "module": "es/index.js",
  "typings": "ts/index.d.ts",
  "license": "MIT",
  "private": true,
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/",
    "@hzdg:registry": "https://npm.pkg.github.com/"
  },
  "repository" : {
    "type" : "git",
    "url": "ssh://git@github.com/hzdg/hz-core.git",
    "directory": "packages/${options.type}/${options.name}"
  },
  "files": [
    "cjs",
    "es",
    "ts",
    "types",
    "!**/examples",
    "!**/__test*"
  ]
}
`;

/**
 * @param {import("../bin/create-package").Options} options
 * @returns {string}
 */
module.exports = function createPackageJson(options) {
  return PACKAGE_JSON(options);
};

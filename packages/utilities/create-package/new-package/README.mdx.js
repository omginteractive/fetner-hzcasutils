// @ts-check

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.main
 * @param {string} options.menu
 * @param {string} options.route
 * @param {boolean} options.isDefault
 */
const README = ({name, main, menu, route, isDefault}) => `
---
name: ${main}
menu: ${menu}
route: ${route}
---

# ${main}

## Installation

\`\`\`shell
yarn add @hzdg/${name}
\`\`\`

## Usage

\`\`\`js
import ${isDefault ? main : `{${main}}`} from '@hzdg/${name}';
\`\`\`

## TODO: write some [docz](https://docz.site)!
`;

/**
 * @param {import("../bin/create-package").Options} options
 * @returns {string}
 */
module.exports = function renderReadme(options) {
  return README(options);
};

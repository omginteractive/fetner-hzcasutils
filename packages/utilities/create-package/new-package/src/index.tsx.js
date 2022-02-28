// @ts-check

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const INDEX = ({main, isDefault}) => `
export${isDefault ? ' default' : ''} function ${main}(): void {
  throw new Error('${main} not implemented yet!');
}
`;

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const REACT_HOOK_INDEX = ({main, isDefault}) => `
import React from 'react';

export${isDefault ? ' default' : ''} function ${main}(): void {
  throw new Error('${main} not implemented yet!');
}
`;

/* prettier-ignore */
/**
 * @param {Object} options
 * @param {string} options.main
 * @param {boolean} options.isDefault
 */
const REACT_COMPONENT_INDEX = ({main, isDefault}) => `
import React from 'react';

export interface ${main}Props {};

export${isDefault ? ' default' : ''} function ${main}(props: ${main}Props): JSX.Element {
  throw new Error('${main} not implemented yet!');
}
`;

/**
 * @param {import("../../bin/create-package").Options} options
 * @returns {string}
 */
module.exports = function renderIndex(options) {
  if (options.isReact && options.main.startsWith('use')) {
    return REACT_HOOK_INDEX(options);
  }
  if (options.isReact && /^[A-Z]/.test(options.main)) {
    return REACT_COMPONENT_INDEX(options);
  }
  return INDEX(options);
};

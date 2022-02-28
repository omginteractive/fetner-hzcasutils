const path = require('path');

module.exports = {
  extends: ['hzdg', 'hzdg/jest', 'hzdg/react', 'hzdg/typescript'],
  globals: {
    __DEV__: 'readonly',
  },
  env: {
    node: true,
    es6: true,
    browser: true,
  },
  settings: {
    'import/resolver': {
      jest: {
        jestConfigFile: path.resolve('jest.config.js'),
      },
    },
  },
  overrides: [
    {
      // disable typescript-eslint rules for .jsx?
      files: ['*.js', '*.jsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};

const emojiTypes = require('@hzdg/gitmoji');

module.exports = {
  extends: ['@commitlint/config-conventional'],
  parserPreset: '@hzdg/conventional-changelog',
  rules: {
    'type-enum': [2, 'always', emojiTypes.map(({emoji}) => emoji)],
  },
};

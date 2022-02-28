module.exports = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testRegex: '.*/__tests__/.*_test.(?:j|t)sx?$',
  transformIgnorePatterns: ['node_modules/(?!(@juggle)/)'],
};

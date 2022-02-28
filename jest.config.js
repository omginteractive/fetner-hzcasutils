// For a detailed explanation regarding each configuration property, visit:
// https://jestjs.io/docs/en/configuration.html

module.exports = {
  // A set of global variables that need to be available in all test environments.
  globals: {
    __DEV__: true,
  },

  // An array of file extensions your modules use
  moduleFileExtensions: ['js', 'json', 'jsx', 'node', 'ts', 'tsx'],

  // An array of absolute paths to additional locations to search when resolving modules
  modulePaths: ['<rootDir>'],

  // The root directory that Jest should scan for tests and modules within
  rootDir: __dirname,

  // The paths to modules that run some code to configure or set up the testing framework before each test.
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],

  // A list of paths to snapshot serializer modules Jest should use for snapshot testing.
  snapshotSerializers: ['jest-snapshot-serializer-raw'],

  // The test environment that will be used for testing.
  testEnvironment: '<rootDir>/jest-environment-jsdom.js',

  // The regexp pattern Jest uses to detect test files
  testRegex: '.*/__tests__/[^%]*_test.(?:j|t)sx?$',

  // This option sets the URL for the jsdom environment. It is reflected in properties such as location.href
  testURL: 'http://localhost',

  // An array of regexp pattern strings that are matched against all test paths before executing the test.
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/packages/deprecated/',
  ],

  // An array of RegExp patterns that are matched against all source file paths before re-running tests in watch mode.
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/\\..*'],

  // An array of regexp pattern strings that are matched against all source file paths before transformation.
  transformIgnorePatterns: ['node_modules/(?!(@juggle)/)'],

  watchPlugins: [
    'jest-watch-yarn-workspaces',
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
};

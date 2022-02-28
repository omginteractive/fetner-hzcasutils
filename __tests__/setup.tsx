/* eslint-env jest, node */
import fs from 'fs';
import path from 'path';
import childProcess from 'child_process';
import semver, {SemVer} from 'semver';
import chalk from 'chalk';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace jest {
    interface Matchers<R, T> {
      /**
       * Check that a package JSON object has the specified dependency.
       */
      toHaveDependency(packageName: string): R;
      /**
       * Check that a package JSON object has the specified devDependency.
       */
      toHaveDevDependency(packageName: string): R;
      /**
       * Check that a package JSON object has the specified peerDependency.
       */
      toHavePeerDependency(packageName: string): R;
      /**
       * Check that a package JSON object has the specified optionalDependency.
       */
      toHaveOptionalDependency(packageName: string): R;
      /**
       * Check that a version string is a compatible-range SemVer string.
       *
       * A range is a 'compatible' range means when any version that matches
       * the range is _at least_ equal to a given minimum version,
       * but _less than_ the next major version.
       *
       * A 'compatible' range is usually expressed with a caret,
       * i.e., `"^1.3.0"`, which expands to `">=1.3.0 < 2.0.0"`.
       */
      toBeValidCompatibleSemVerRange(): R;
      /**
       * Check that a version string intersects with all of the given ranges.
       *
       * Ranges 'intersect' if there exists _at least_ one possible version
       * that matches all of the given ranges.
       */
      toIntersectSemVerRanges(ranges: string[]): R;
    }
  }
}

interface Workspace {
  name: string;
  location: string;
  private: boolean;
}

const DEPENDENCIES = 'dependencies';
const DEV_DEPENDENCIES = 'devDependencies';
const PEER_DEPENDENCIES = 'peerDependencies';
const OPTIONAL_DEPENDENCIES = 'optionalDependencies';

type DependencyType =
  | typeof DEPENDENCIES
  | typeof DEV_DEPENDENCIES
  | typeof PEER_DEPENDENCIES
  | typeof OPTIONAL_DEPENDENCIES;

const DEPENDENCY_TYPES: DependencyType[] = [
  DEPENDENCIES,
  DEV_DEPENDENCIES,
  PEER_DEPENDENCIES,
  OPTIONAL_DEPENDENCIES,
];

export type Pkg = {[key in DependencyType]: Record<string, string>} & {
  name: string;
  version: string;
  description: string;
  license: string;
  publishConfig: {
    registry: 'https://npm.pkg.github.com/';
    ['@hzdg:registry']: 'https://npm.pkg.github.com/';
  };
  config?: {
    tests?: {
      dependencies?: boolean | {[packageName: string]: boolean};
    };
  };
  main: string;
};

export const hasDependencyOfAnyType = (dependency: string, pkg: Pkg): boolean =>
  Boolean(pkg.dependencies && dependency in pkg.dependencies) ||
  Boolean(pkg.devDependencies && dependency in pkg.devDependencies) ||
  Boolean(pkg.peerDependencies && dependency in pkg.peerDependencies) ||
  Boolean(pkg.optionalDependencies && dependency in pkg.optionalDependencies);

/**
 * Check if the given `pkg` is configured to skip tests
 * for the given `dependency`.
 *
 * The `pkg` can be configured as such in its `package.json` by
 * adding a `tests` config, like:
 *
 *    {
 *      ... // other `package.json` entries
 *      config: {
 *        tests: {
 *          // `false` exempts all dependencies from tests for this package.
 *          dependencies: false // or {dependencyName: false}
 *        }
 *      }
 *    }
 */
export const isExempt = (dependency: string, pkg: Pkg): boolean => {
  const deps = pkg.config && pkg.config.tests && pkg.config.tests.dependencies;
  if (typeof deps === 'object') return deps[dependency] === false;
  return deps === false;
};

// Collect a list of yarn/lerna workspaces.
let workspaces: Workspace[] = JSON.parse(
  childProcess.execSync('lerna list --json --loglevel=error').toString(),
);

// Filter the collected workspaces by PACKAGES env var, if defined.
const PACKAGES: string | undefined = process.env.PACKAGES;
if (PACKAGES) {
  const allowedWorkspaces = PACKAGES.split(',');
  workspaces = workspaces.filter(({name}) => allowedWorkspaces.includes(name));
}

// Build the list of package JSON metadata to test.
export const packages: [string, Pkg][] = [];
for (const workspace of workspaces) {
  if (!workspace.private) {
    packages.push([
      workspace.name,
      JSON.parse(
        fs
          .readFileSync(path.join(workspace.location, 'package.json'))
          .toString(),
      ),
    ]);
  }
}

export const collectOtherVersions = (
  name: string,
  dependency: string,
): string[] => {
  const otherVersions: string[] = [];
  for (const [otherName, otherPkg] of packages) {
    if (name === otherName) continue;
    if (!hasDependencyOfAnyType(dependency, otherPkg)) continue;
    for (const type of DEPENDENCY_TYPES) {
      if (otherPkg[type] && otherPkg[type][dependency]) {
        otherVersions.push(otherPkg[type][dependency]);
      }
    }
  }
  return otherVersions;
};

interface MatcherErrorOptions {
  [key: string]: unknown;
  message: string;
  matcherName: string;
}
interface ReceivedErrorOptions extends MatcherErrorOptions {
  received: unknown;
}
interface ExpectedErrorOptions extends MatcherErrorOptions {
  expected: unknown;
}

function createMatcherError(
  this: jest.MatcherUtils,
  options: ReceivedErrorOptions | ExpectedErrorOptions,
): Error {
  const {utils} = this;
  const {matcherHint, printWithType, RECEIVED_COLOR, EXPECTED_COLOR} = utils;
  const {matcherName, message, expected, received} = options;
  const hint = matcherHint(matcherName, undefined, undefined);
  let generic;
  let specific;
  if ('received' in options) {
    generic = `${RECEIVED_COLOR('received')} ${message}`;
    specific = printWithType('Received', received, this.utils.printReceived);
  } else {
    generic = `${EXPECTED_COLOR('expected')} ${message}`;
    specific = printWithType('Expected', expected, this.utils.printExpected);
  }
  return new Error(
    `${hint}\n\n${chalk.bold('Matcher error')}: ${generic}\n\n${specific}`,
  );
}

function printDiff(
  this: jest.MatcherUtils,
  key: DependencyType,
  expected: string,
  received: Pkg,
): string {
  const {diff, printExpected, printReceived} = this.utils;
  const expectedDeps = {[expected]: expect.any(String)};
  const difference = diff(
    {[key]: {...received[key], ...expectedDeps}},
    {[key]: received[key]},
    {expand: this.expand},
  );
  return difference && difference.includes('- Expect')
    ? `Difference:\n\n${difference}`
    : `Expected: ${printExpected(expectedDeps)}\n` +
        `Received: ${printReceived(received[key])}`;
}

function configSuggestion(
  this: jest.MatcherUtils,
  dependency: string,
  pkg: Pkg,
): string {
  const {isNot, utils} = this;
  const {diff, EXPECTED_COLOR, RECEIVED_COLOR} = utils;
  const difference = diff(
    JSON.stringify(pkg, null, 2),
    JSON.stringify(
      {
        ...pkg,
        config: {
          ...pkg.config,
          tests: {
            ...(pkg.config ? pkg.config.tests : null),
            [dependency]: false,
          },
        },
      },
      null,
      2,
    ),
    {
      includeChangeCounts: false,
      omitAnnotationLines: true,
      bColor: EXPECTED_COLOR,
      aColor: RECEIVED_COLOR,
      expand: true,
    },
  );
  return (
    `If you know ${RECEIVED_COLOR(pkg.name)} ` +
    `${isNot ? 'needs' : 'does not need'} ${EXPECTED_COLOR(dependency)},\n` +
    'you may exempt it from testing by configuring the test\n' +
    `in its package.json, like:\n\n` +
    difference
  );
}

function toHaveDependencyOfType(
  this: jest.MatcherUtils,
  received: Pkg,
  expected: string,
  type?: 'dev' | 'peer' | 'optional',
): {actual: Pkg; pass: boolean; message: () => string} {
  const {matcherHint} = this.utils;
  let matcherName:
    | 'toHaveDevDependency'
    | 'toHavePeerDependency'
    | 'toHaveOptionalDependency'
    | 'toHaveDependency';
  let key: DependencyType;

  switch (type) {
    case 'dev':
      key = 'devDependencies';
      matcherName = 'toHaveDevDependency';
      break;
    case 'peer':
      key = 'peerDependencies';
      matcherName = 'toHavePeerDependency';
      break;
    case 'optional':
      key = 'optionalDependencies';
      matcherName = 'toHaveOptionalDependency';
      break;
    default:
      key = 'dependencies';
      matcherName = 'toHaveDependency';
      break;
  }

  if (typeof received !== 'object' || received === null) {
    throw createMatcherError.call(this, {
      matcherName,
      received,
      message: 'value must be a non-null object',
    });
  }

  if (typeof expected !== 'string') {
    throw createMatcherError.call(this, {
      matcherName,
      expected,
      message: 'value must be a string',
    });
  }

  const pass = typeof (received[key] || {})[expected] === 'string';

  const message = () =>
    matcherHint(matcherName, undefined, undefined, {isNot: this.isNot}) +
    '\n\n' +
    printDiff.call(this, key, expected, received) +
    '\n\n' +
    configSuggestion.call(this, expected, received);

  return {actual: received, message, pass};
}

expect.extend({
  toHaveDependency(received, expected: string) {
    return toHaveDependencyOfType.call(this, received, expected);
  },
  toHaveDevDependency(received, expected: string) {
    return toHaveDependencyOfType.call(this, received, expected, 'dev');
  },
  toHavePeerDependency(received, expected: string) {
    return toHaveDependencyOfType.call(this, received, expected, 'peer');
  },
  toHaveOptionalDependency(received, expected: string) {
    return toHaveDependencyOfType.call(this, received, expected, 'optional');
  },
  toBeValidCompatibleSemVerRange(received) {
    const version: SemVer | string = semver.coerce(received) || received;
    if (!semver.validRange(received)) {
      throw createMatcherError.call(this, {
        received,
        matcherName: 'toBeValidCompatibleSemVerRange',
        message: 'value must be a valid SemVer range',
      });
    }

    const nextMinor: string = semver.inc(version, 'minor') || '';
    const nextMajor: string = semver.inc(version, 'major') || '';
    const nextMinorPasses = semver.satisfies(nextMinor, received);
    const nextMajorPasses = semver.outside(nextMajor, received, '>');

    const {matcherHint, printExpected, printReceived} = this.utils;
    const hint = matcherHint('toBeValidCompatibleSemVerRange', `"${received}"`);

    return {
      pass: nextMinorPasses && nextMajorPasses,
      message: (): string => {
        if (this.isNot) {
          if (nextMinorPasses) {
            return (
              hint +
              '\n\n' +
              `Expected next minor version ${printExpected(nextMinor)} ` +
              `not to match range ${printReceived(received)}`
            );
          } else {
            return (
              hint +
              '\n\n' +
              `Expected next major version ${printExpected(nextMajor)} ` +
              `not to match range ${printReceived(received)}`
            );
          }
        } else {
          if (!nextMinorPasses) {
            return (
              hint +
              '\n\n' +
              `Expected next minor version ${printExpected(nextMinor)} ` +
              `to match range ${printReceived(received)}`
            );
          } else {
            return (
              hint +
              '\n\n' +
              `Expected next major version ${printExpected(nextMajor)} ` +
              `to match range ${printReceived(received)}`
            );
          }
        }
      },
    };
  },
  toIntersectSemVerRanges(received: string, ranges: string[]) {
    if (!semver.validRange(received)) {
      throw createMatcherError.call(this, {
        received,
        matcherName: 'toIntersectSemVerRanges',
        message: 'value must be a valid SemVer range',
      });
    }

    if (!Array.isArray(ranges)) {
      throw createMatcherError.call(this, {
        expected: ranges,
        matcherName: 'toIntersectSemVerRanges',
        message: 'ranges must be an array of strings',
      });
    }

    for (const i in ranges) {
      if (!semver.validRange(ranges[i])) {
        throw createMatcherError.call(this, {
          expected: ranges[i],
          matcherName: 'toIntersectSemVerRanges',
          message: `[${i}] value must be a valid SemVer range`,
        });
      }
    }

    const {matcherHint, printExpected, printReceived} = this.utils;
    const hint = matcherHint(
      'toIntersectSemVerRanges',
      `"${received}"`,
      `[${ranges.map(r => `"${r}"`).join(', ')}]`,
    );

    const otherRangesPass = ranges.map(v => semver.intersects(received, v));

    return {
      pass: otherRangesPass.every(Boolean),
      message: (): string => {
        for (const i in otherRangesPass) {
          if (otherRangesPass[i] && this.isNot) {
            return (
              hint +
              '\n\n' +
              `Expected ${printReceived(received)} ` +
              `not to intersect ${printExpected(ranges[i])}`
            );
          } else if (!otherRangesPass[i]) {
            return (
              hint +
              '\n\n' +
              `Expected ${printReceived(received)} ` +
              `to intersect ${printExpected(ranges[i])}`
            );
          }
        }
        return (
          hint +
          '\n\n' +
          `Expected ${printReceived(received)}` +
          `${this.isNot ? ' not ' : ' '}` +
          `to intersect ${printExpected(ranges)}`
        );
      },
    };
  },
});

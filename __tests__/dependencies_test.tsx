/* eslint-env jest, node */
import {
  packages,
  isExempt,
  hasDependencyOfAnyType,
  collectOtherVersions,
} from './setup';

describe.each(packages)('%s', (name, pkg) => {
  describe('dependencies', () => {
    describe.each`
      dependency          | required
      ${'@babel/runtime'} | ${true}
      ${'@prop-types'}    | ${false}
    `('$dependency', ({dependency, required}) => {
      // Only test this dependency if it is not exempted
      // and it is required or appears to be defined.
      const shouldTest =
        !isExempt(dependency, pkg) &&
        (required || hasDependencyOfAnyType(dependency, pkg));

      if (shouldTest) {
        const dependencyRange =
          pkg.dependencies && pkg.dependencies[dependency];

        test('is a compatible-range dependency', () => {
          // Make sure this dependency is only defined as a direct dependency.
          expect(pkg).not.toHaveDevDependency(dependency);
          expect(pkg).not.toHavePeerDependency(dependency);
          expect(pkg).not.toHaveOptionalDependency(dependency);
          expect(pkg).toHaveDependency(dependency);
          // Make sure the dependency defines a valid range.
          expect(dependencyRange).toBeValidCompatibleSemVerRange();
        });

        const otherVersions = collectOtherVersions(name, dependency);
        if (otherVersions.length) {
          test(`range intersects ranges for ${dependency} in all other packages`, () => {
            expect(dependencyRange).toIntersectSemVerRanges(otherVersions);
          });
        }
      }
    });
  });

  describe('peerDependencies', () => {
    describe.each`
      dependency     | required
      ${'react'}     | ${false}
      ${'react-dom'} | ${false}
    `('$dependency', ({dependency, required}) => {
      // Only test this dependency if it is not exempted
      // and it is required or appears to be defined.
      const shouldTest =
        !isExempt(dependency, pkg) &&
        (required || hasDependencyOfAnyType(dependency, pkg));

      if (shouldTest) {
        const dependencyRange =
          pkg.peerDependencies && pkg.peerDependencies[dependency];

        test('is a compatible-range dependency', () => {
          // Make sure this dependency is only defined as a direct dependency.
          expect(pkg).not.toHaveDevDependency(dependency);
          expect(pkg).not.toHaveOptionalDependency(dependency);
          expect(pkg).not.toHaveDependency(dependency);
          expect(pkg).toHavePeerDependency(dependency);
          // Make sure the dependency defines a valid range.
          expect(dependencyRange).toBeValidCompatibleSemVerRange();
        });

        const otherVersions = collectOtherVersions(name, dependency);
        if (otherVersions.length) {
          test(`range intersects ranges for ${dependency} in all other packages`, () => {
            expect(dependencyRange).toIntersectSemVerRanges(otherVersions);
          });
        }
      }
    });
  });
});

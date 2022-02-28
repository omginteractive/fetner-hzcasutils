# HZ Core

[HZ Core][docs] is [HZ]'s library of [components], [hooks], and utilities for [React]!

## Usage

What kinda stuff is in here, and how do i use it in my project?

[Read the Docs!][docs] (password: dev-1987)

## Issue Tracking

### Bugs

Found a bug? Check through the [current issues][issues] for any open related bugs. If none are found, [open a new bug report](https://github.com/hzdg/hz-core/issues/new/choose).

### New Components

Need a new component? Check through the [docs] for an existing component or the [issues] tracker for any current component requests. If none are found, [create a new Github issue describing the new component](https://github.com/hzdg/hz-core/issues/new/choose) before creating a new package.

### New Features

Open a [new feature request](https://github.com/hzdg/hz-core/issues/new/choose) for any new features to add, whether it's new functionality for a component, or new deployment strategy for packages. Remember to first check through the [docs] or existing [issues] for any existing context on this feature.

---

## Getting Started

You will need:

- Node 8+
- Yarn

1. Pull down project from Github
2. Run `yarn`
3. Run `lerna bootstrap`

## Project Structure

HZ Core is structured as a monorepo. We use a number of tools and conventions
to keep things organized and interoperable. Much of this work is done for us
through the magic of [Lerna] and [Yarn] workspaces.

Uses:

- [Lerna]
- [Docz]
- [Typescript]
- [Yarn]

## How to Write a Commit Message

We use [Conventional Commits] to help automate [Semantic Versioning][semver]
of our packages, and to help in generating a useful [Changelog]. We opt to use
a GitHub-inspired [Gitmoji]-based commit type. This reduces the amount of
character count required for specifying type, and also gives a (subjectively)
easier visual guide to the types of changes commits are making.

> NOTE: While it's possible to compose your commit messages any way you want,
> it is recommended that you run `yarn commit`, which will use a [Commitizen]
> CLI workflow to help you write your message, rather than `git commit`.

As such, a commit message should take the form:

```
<type> [(scope)] <subject>

[body]
```

Where \<angle segments\> are required,
and [bracket segments] are optional.

Some examples:

`🚨 squash linting errors`

`➕ (@hzdg/scroll-monitor) add react-dom@^16.3.1`

`🐛 (@hzdg/scroll-monitor) fix wheel delta and velocity`

## How to Create a New Package

The quickest way to create a new package is to use our lil CLI wizard:

```shell
yarn create-package
```

This wizard will ask a few questions about the package,
then generate the basic file structure for the package.

If creating or modifying a package manually, try to adhere to
the following conventions:

- it should live under `packages/<type>`, where `type` is one of
  the existing package types. If your package doesn't seem to belong,
  see [Creating a New Package Type](#creating-a-new-package-type).
- The package directory name should be `dash-case`.
- The package name (in `package.json`) should be `dash-case`.
- The package name should be namespaced `@hzdg/<package-name>`.
- if the package exports a React Component, its name should be the
  `dash-case` version of the `ComponentName`, i.e., `component-name`.
- if the package exports a React hook, its name should be the `dash-case`
  version of the `useThisHook`, i.e. `use-this-hook`
- The package should include a `CHANGELOG.md`
- The package registry should be defined in `package.json` as:
  ```json
  "publishConfig": {
    "registry": "https://npm.pkg.github.com/",
    "@hzdg:registry": "https://npm.pkg.github.com/"
  },
  ```
- The package repository should be defined in `package.json` as:
  ```json
  "repository": {
    "type": "git",
    "url": "ssh://git@github.com/hzdg/hz-core.git",
    "directory": "packages/<type>/<package-name>"
  },
  ```

### Creating a New Package Type

If the existing package types (any of the directories under `packages`)
do not seem to fit the package you would like to add a new type can be
created by doing the following:

- make a new directory at `packages/<new-type>`, where `new-type`
  is the dash-case name for the type of packages it will contain.
- Create a [yarn workspace] in the root `package.json`:
  ```json
  "workspaces": [
    "packages/<new-type>/*",
  ]
  ```
- Create a [lerna package] in the root `lerna.json`:
  ```json
  "packages": [
    "packages/<new-type>/*",
  ]
  ```

## How to Publish

We use [Lerna] and a [GitHub Action] that will automatically detect changes,
version, and publish to [GitHub Packages], so publishing is a simple as `git push`.

Still, it can be daunting to try to cut a release without knowing if it is
going to work. To embolden us, hzcore has a [smoke test] to check if the new
package versions are likely to publish successfully.

> **NOTE:** This smoke test is also run as part of the GitHub Publish workflow,
> So if it fails there, new versions won't be published. For peace-of-mind,
> it is a good idea to run it locally _before_ pushing to master.

### Publish 'smoke tests'

To run the publish smoke tests:

```shell
yarn test-publish
```

It will take a few mins to run, but if it succeeds, you can feel pretty good
that the next published versions will be ok.

### Publish 'smoke test' playground

If you want to poke around with the packages that have been installed in the
test project, you can run:

```shell
yarn test-publish --open [code|atom|...etc]
```

This will do everything the normal test does, except it won't run the tests.
Instead, it will open the test project using the specified command
(`code`, by default).

You can then edit any of the test suites that were generated and try
to test the packages with more rigor. This is an easy way to get a
proper installed package playground to do some extra vetting
of packages before a publish.

### Versioning

By default, [Lerna] handles versioning and publishing together as part of the
`lerna publish` flow. Lerna knows about [conventional commits], and it will
use the change log since the last version of a package to decide what the next
version should be.

If you want to set the version yourself, you can do so by running
`lerna version` and `lerna publish` separately.

See [lerna changed] and [lerna version] for more.

### Publishing

As noted above, all you should really need to do to publish new package
versions is `git push` to master. However, it is also possible to publish
manually by running `lerna publish`.

If the versioning step succeeds (or if you ran `lerna version` separately),
but `lerna publish` fails, you can try running `npm publish` in each package.

See [lerna publish]

## TODO: How to Write Components

- **Render Props** are a useful technique for components that are used mostly
  for state management where it does not care about the shape of the children.
  [Read more about render props here][render props].
  - Note: Remember that both `this.props` and `this.state`
    can share a common variable, so be conscious of which
    object you pass first into the render prop.

## TODO: How to Write Tests

We use [Jest] to test things. To run tests, simply run `yarn test`.
If you want to keep your tests running while you work, run `yarn test --watch`.

## TODO: How to Write Docs

We use [Docz] to view all components. Check out their info on
[writing MDX](https://www.docz.site/docs/writing-mdx) for general information.

### Running the docz dev server

1. Run `yarn develop`
2. Navigate to `http://localhost:3000`

### Publishing docs

[Docs] are built and published to [Netlify] automatically via [Netlify Build],
so all you should need to do to publish is a simple `git push`.

[hz]: https://hzdg.com
[react]: https://reactjs.org
[components]: https://reactjs.org/docs/components-and-props.html
[render props]: https://reactjs.org/docs/render-props.html
[hooks]: https://reactjs.org/docs/hooks-intro.html
[docs]: https://hz-core.netlify.app/
[lerna]: https://github.com/lerna/lerna
[docz]: https://www.docz.site/
[typescript]: https://www.typescriptlang.org/
[yarn]: https://yarnpkg.com/en/
[semver]: https://semver.org
[netlify]: https://app.netlify.com/sites/hz-core/overview
[issues]: https://github.com/hzdg/hz-core/issues
[jest]: https://jestjs.io/
[conventional commits]: https://www.conventionalcommits.org/
[commitizen]: http://commitizen.github.io/cz-cli/
[gitmoji]: https://gitmoji.carloscuesta.me/
[changelog]: https://keepachangelog.com/
[yarn workspace]: https://yarnpkg.com/lang/en/docs/workspaces/
[lerna package]: https://github.com/lerna/lerna#lernajson
[smoke test]: https://en.wikipedia.org/wiki/Smoke_testing_(software)
[lerna changed]: https://github.com/lerna/lerna/tree/master/commands/changed#readme
[lerna version]: https://github.com/lerna/lerna/tree/master/commands/version#readme
[lerna publish]: https://github.com/lerna/lerna/tree/master/commands/publish#readme
[github action]: https://github.com/hzdg/hz-core/actions?query=workflow%3APublish
[github packages]: https://github.com/hzdg/hz-core/packages
[netlify build]: https://app.netlify.com/sites/hz-core/deploys

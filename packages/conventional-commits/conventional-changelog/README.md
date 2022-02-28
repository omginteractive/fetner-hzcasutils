---
name: conventional-changelog
menu: Conventional Commits
route: /conventional-changelog
---

# @hzdg/conventional-changelog

A [changelog preset] for [lerna] using [@hzdg/gitmoji]
as the [conventional commits] standard to determine the version bump
and generate `CHANGELOG.md` files on publish.

## Getting started

> Note: You may also want to configure [commitlint]
> via [@hzdg/commitlint-config] and [commitizen]
> via [@hzdg/commitizen-config]. Also see [@hzdg/commit-msg]
> for a better `prepare-commit-msg` git hook.

Add @hzdg/conventional-changelog via yarn:

```shell
yarn add @hzdg/conventional-changelog
```

In `lerna.json`, configure lerna to use @hzdg/conventional-changelog:

```json
{
  "command": {
    "version": {
      "conventionalCommits": true,
      "changelogPreset": "@hzdg/conventional-changelog"
    },
    "publish": {
      "message": "🔖 publish"
    }
  }
}
```

It is recommended to also setup [@hzdg/commitizen-config]
and [@hzdg/commit-msg] for easier commit authoring,
and [@hzdg/commitlint-config] for automated enforcement
of the conventions.

## Conventional Commits

As a tool for managing packages in a monorepo, [Lerna] has builtin support
for automated versioning via [conventional commits]. This preset teaches Lerna
the following conventions:

- Version bumps for packges that have changes since their last tagged release,
  with the version determined by the highest level of conventional commit
  in the changeset, as described by [@hzdg/gitmoji]
- Equivalent version bumps for dependent packages to keep them in sync
  (See [this comment](https://github.com/lerna/lerna/pull/707#issuecomment-288261858)
  for more on versioning of dependents)

## Conventional Changelog

When publishing, [Lerna] can automatically generate a `CHANGELOG.md`
for each package using the info it has collected while versioning.
This preset teaches Lerna how to interpret the changes described
by commits authored using the [@hzdg/gitmoji] conventions into a readable
CHANGELOG.

[lerna]: https://github.com/lerna/lerna
[conventional commits]: https://github.com/lerna/lerna/tree/master/commands/version#--conventional-commits
[changelog preset]: https://github.com/lerna/lerna/tree/master/commands/version#--changelog-preset
[commitizen]: https://github.com/commitizen/cz-cli
[git-cz]: https://github.com/commitizen/cz-cli#using-the-command-line-tool
[commitlint]: https://github.com/conventional-changelog/commitlint
[@hzdg/conventional-changelog]: ./conventional-changelog
[@hzdg/commitlint-config]: ./commitlint-config
[@hzdg/commitizen-config]: ./commitizen-config
[@hzdg/commit-msg]: ./commit-msg
[@hzdg/gitmoji]: ./gitmoji

---
name: gitmoji
menu: Conventional Commits
route: /gitmoji
---

# @hzdg/gitmoji

Defines the set of [gitmoji] used
in the [@hzdg/conventional-changelog] standard.

> Note: This is not normally use directly!
> See [@hzdg/conventional-changelog] for usage.

## Gitmoji

These emoji are uesd in [conventional commits]
to automate [semantic versioning], and for generating
a [conventional changelog].

### Major Version Bump

These Gitmoji result in a **major** version bump:

| emoji | name     | description                  |
| ----- | -------- | ---------------------------- |
| 💥    | breaking | Introducing breaking changes |

### Minor Version Bump

These Gitmoji result in a **minor** version bump:

| emoji | name    | description              |
| ----- | ------- | ------------------------ |
| ✨    | feature | Introducing new features |

### Patch Version Bump

These Gitmoji result in a **patch** version bump:

| emoji | name     | description            |
| ----- | -------- | ---------------------- |
| 🐛    | fix      | Fixing a bug           |
| 🚑    | quickfix | Critical hotfix        |
| 🔒    | security | Fixing security issues |

### Other (Patch)

These Gitmoji do not have a specific level,
but may result in a **patch** version bump:

| emoji | name        | description                               |
| ----- | ----------- | ----------------------------------------- |
| 🎨    | style       | Improving structure / format of the code  |
| ⚡️   | perf        | Improving performance                     |
| 🔥    | prune       | Removing code or files                    |
| 📝    | docs        | Writing docs                              |
| 🚀    | deploy      | Deploying stuff                           |
| 🎉    | init        | Initial commit                            |
| ✅    | test        | Adding tests                              |
| 🔖    | release     | Releasing / Version tags                  |
| 🚨    | lint        | Removing linter warnings                  |
| 🚧    | wip         | Work in progress                          |
| 💚    | fix-ci      | Fixing CI Build                           |
| ⬇️    | downgrade   | Downgrading dependencies                  |
| ⬆️    | upgrade     | Upgrading dependencies                    |
| 📌    | pin         | Pinning dependencies to specific versions |
| ♻️    | refactoring | Refactoring code                          |
| ➖    | dep-rm      | Removing a dependency                     |
| ➕    | dep-add     | Adding a dependency                       |
| 🔧    | config      | Changing configuration files              |
| 👽    | compat      | Updating code due to external API changes |
| 🚚    | mv          | Moving or renaming files                  |

[gitmoji]: https://gitmoji.carloscuesta.me/
[conventional commits]: https://www.conventionalcommits.org/
[semantic versioning]: https://semver.org/
[conventional changelog]: https://github.com/conventional-changelog/conventional-changelog
[@hzdg/conventional-changelog]: ./conventional-changelog

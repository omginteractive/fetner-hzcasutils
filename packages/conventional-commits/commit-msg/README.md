---
name: commit-msg
menu: Conventional Commits
route: /commit-msg
---

# @hzdg/commit-msg

Adds info about the [@hzdg/conventional-changelog] standard
to the git commit message template.

## Getting started

> Note: This is only useful if you also configure your project
> to use [@hzdg/conventional-changelog]! You may also want to
> configure [commitlint] via [@hzdg/commitlint-config], and
> also [commitizen] via [@hzdg/commitizen-config].

Add @hzdg/commit-msg and husky via yarn:

```shell
yarn add husky @hzdg/commit-msg
```

Then, configure the [prepare-commit-msg git hook] via [husky]:

```json
{
  "hooks": {
    "prepare-commit-msg": "commit-msg $HUSKY_GIT_PARAMS"
  }
}
```

This will modify the git commit message template with info
about the [@hzdg/conventional-changelog] standard.

[commitizen]: https://github.com/commitizen/cz-cli
[commitlint]: https://github.com/conventional-changelog/commitlint
[husky]: https://www.npmjs.com/package/husky
[prepare-commit-msg git hook]: https://git-scm.com/docs/githooks#_prepare_commit_msg
[@hzdg/conventional-changelog]: ./conventional-changelog
[@hzdg/commitizen-config]: ./commitizen-config
[@hzdg/commitlint-config]: ./commitlint-config

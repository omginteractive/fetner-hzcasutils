---
name: commitlint-config
menu: Conventional Commits
route: /commitlint-config
---

# @hzdg/commitlint-config

Configures [commitlint] to use the [@hzdg/conventional-changelog] standard.

## Getting started

> Note: This is only useful if you also configure your project
> to use [@hzdg/conventional-changelog]! You may also want to
> configure [commitizen] via [@hzdg/commitizen-config], and
> see [@hzdg/commit-msg] for a better `prepare-commit-msg` git hook.

Add @hzdg/commitlint-config, commitlint and [husky] via yarn:

```shell
yarn add husky commitlint @hzdg/commitlint-config
```

Then, add a `commitlint.config.js` to your project root
to tell commitlint to use this config:

```js
module.exports = require('@hzdg/commitlint-config');
```

## Git Hook

You can configure the [commit-msg git hook] via [husky]:

```json
{
  "hooks": {
    "commit-msg": "commitlint -E HUSKY_GIT_PARAMS"
  }
}
```

This will run commitlint on every commit message,
unless you pass `--no-verify` when commiting.

[commitizen]: https://github.com/commitizen/cz-cli
[commitlint]: https://github.com/conventional-changelog/commitlint
[husky]: https://www.npmjs.com/package/husky
[commit-msg git hook]: https://git-scm.com/docs/githooks#_commit_msg
[@hzdg/conventional-changelog]: ./conventional-changelog
[@hzdg/commitizen-config]: ./commitizen-config
[@hzdg/commit-msg]: ./commit-msg

---
name: commitizen-config
menu: Conventional Commits
route: /commitizen-config
---

# @hzdg/commitizen-config

Configures [commitizen] to use the [@hzdg/conventional-changelog] standard.

## Getting started

> Note: This is only useful if you also configure your project
> to use [@hzdg/conventional-changelog]! You may also want to
> configure [commitlint] via [@hzdg/commitlint-config], and
> see [@hzdg/commit-msg] for a better `prepare-commit-msg` git hook.

Add @hzdg/commitizen-config and commitizen via yarn:

```shell
yarn add commitizen @hzdg/commitizen-config
```

In `package.json`, configure commitizen to use @hzdg/commitzen-config:

```json
{
  "config": {
    "commitizen": {
      "path": "@hzdg/commitizen-config"
    }
  }
}
```

> See [Configuration](#configuration) for additional options.

You can now uses [git-cz] to author commits, or add a script
to `package.json` to use commitizen to author commits:

```json
{
  "scripts": {
    "commit": "git-cz"
  }
}
```

With this, you can run `yarn commit` to be prompted to author a commit
that conforms to the [@hzdg/conventional-changelog] standard.

## Configuration

### package.json

You specify the configuration of @hzdg/commitizen-config
through the `config.commitizen` key:

```json
{
  "config": {
    "commitizen": {
      "path": "@hzdg/commitizen-config",
      "maxHeaderWidth": 100,
      "maxLineWidth": 100,
      "defaultType": "",
      "defaultScope": "",
      "defaultSubject": "",
      "defaultBody": "",
      "defaultIssues": ""
    }
  }
}
```

All are optional except `path`.

### Environment variables

The following environment varibles can be used to override
any default configuration or `package.json` based configuration.

- `CZ_TYPE` = `defaultType`
- `CZ_SCOPE` = `defaultScope`
- `CZ_SUBJECT` = `defaultSubject`
- `CZ_BODY` = `defaultBody`
- `CZ_ISSUES` = `defaultIssues`
- `CZ_MAX_HEADER_WIDTH` = `maxHeaderWidth`
- `CZ_MAX_LINE_WIDTH` = `maxLineWidth`

### Commitlint

If using the [commitlint] js library, the `maxHeaderWidth` configuration
property will default to the configuration of the `header-max-length` rule
instead of the hard coded value of `100`. This can be ovewritten
by setting the `maxHeaderWidth` configuration in `package.json`
or the `CZ_MAX_HEADER_WIDTH` environment variable.

> See [@hzdg/commitlint-config] to configure commitlint for the
> [@hzdg/conventional-changelog] standard.

[commitizen]: https://github.com/commitizen/cz-cli
[git-cz]: https://github.com/commitizen/cz-cli#using-the-command-line-tool
[commitlint]: https://github.com/conventional-changelog/commitlint
[@hzdg/conventional-changelog]: ./conventional-changelog
[@hzdg/commitlint-config]: ./commitlint-config
[@hzdg/commit-msg]: ./commit-msg

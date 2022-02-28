const path = require('path');
const wrap = require('wrap-ansi');
const pad = require('pad');
const fuzzy = require('fuzzy');
const chalk = require('chalk');
const style = require('ansi-styles');
const autocompletePrompt = require('inquirer-autocomplete-prompt');
const emojis = require('@hzdg/gitmoji');
const project = require('@lerna/project');

const config = require('commitizen').configLoader.load() || {};

/**
 * This commitizen config is based on https://github.com/ngryman/cz-emoji
 * and https://github.com/commitizen/cz-conventional-changelog
 */

const options = {
  defaultType: process.env.CZ_TYPE || config.defaultType,
  defaultScope: process.env.CZ_SCOPE || config.defaultScope,
  defaultSubject: process.env.CZ_SUBJECT || config.defaultSubject,
  defaultBody: process.env.CZ_BODY || config.defaultBody,
  defaultIssues: process.env.CZ_ISSUES || config.defaultIssues,
  maxHeaderWidth:
    (process.env.CZ_MAX_HEADER_WIDTH &&
      parseInt(process.env.CZ_MAX_HEADER_WIDTH)) ||
    config.maxHeaderWidth ||
    100,
  maxLineWidth:
    (process.env.CZ_MAX_LINE_WIDTH &&
      parseInt(process.env.CZ_MAX_LINE_WIDTH)) ||
    config.maxLineWidth ||
    100,
};

(function(options) {
  try {
    const commitlintLoad = require('@commitlint/load');
    commitlintLoad().then(function(clConfig) {
      if (clConfig.rules) {
        const maxHeaderLengthRule = clConfig.rules['header-max-length'];
        if (
          typeof maxHeaderLengthRule === 'object' &&
          maxHeaderLengthRule.length >= 3 &&
          !process.env.CZ_MAX_HEADER_WIDTH &&
          !config.maxHeaderWidth
        ) {
          options.maxHeaderWidth = maxHeaderLengthRule[2];
        }
      }
    });
  } catch (err) {
    /** BOOP! */
  }
})(options);

function autocomplete({name, message, choices, keys}) {
  const options = {
    pre: `${style.yellow.open}${style.bold.open}`,
    post: `${style.bold.close}${style.yellow.close}`,
    extract: v => keys.map(k => v[k]).join(''),
  };
  return {
    type: 'autocomplete',
    name,
    message,
    async source(_, q) {
      if (!q) return choices;
      const results = fuzzy.filter(q, await choices, options);
      return Promise.resolve(
        results.map(result => ({...result.original, name: result.string})),
      );
    },
  };
}

function getTypeChoices() {
  const maxNameLength = emojis
    .map(({name}) => name)
    .reduce((max, {length}) => (length > max ? length : max), 0);
  return emojis.map(({name, emoji, code, description}) => ({
    name: `${pad(name, maxNameLength)}  ${emoji}  ${description}`,
    value: emoji,
    code,
  }));
}

async function getScopeChoices() {
  const scopes = await project.getPackages(process.cwd());
  const maxNameLength = scopes
    .map(({name}) => name)
    .reduce((max, {length}) => (length > max ? length : max), 0);
  return [
    {name: pad('<none>', maxNameLength), value: ' '},
    ...scopes.map(({location, name}) => ({
      name: `${pad(name, maxNameLength)}  ${path.relative('.', location)}`,
      value: name,
      location,
    })),
  ];
}

function format({type, scope, subject, issues, body, breaking}) {
  const wrapOptions = {
    trim: true,
    cut: false,
    newline: '\n',
    indent: '',
    width: options.maxLineWidth,
  };
  // parentheses are only needed when a scope is present
  scope = scope ? (scope.trim() ? `(${scope.trim()}) ` : '') : '';
  // build head line and limit it to 100
  const head = `${type} ${scope}${subject.trim()}`;
  // wrap body at `options.maxLineWidth`
  body = body ? wrap(body, wrapOptions) : false;
  // apply breaking change prefix, removing it if already present
  breaking = breaking ? breaking.trim() : '';
  breaking = breaking
    ? `BREAKING CHANGE: ${breaking.replace(/^BREAKING CHANGE: /, '')}`
    : '';
  breaking = breaking ? wrap(breaking, wrapOptions) : false;
  // wrap issues at `options.maxLineWidth`
  issues = issues ? wrap(issues, wrapOptions) : false;
  return [head, body, breaking, issues].filter(v => v).join('\n\n');
}

function filterSubject(subject) {
  subject = subject.trim();
  if (subject.charAt(0).toLowerCase() !== subject.charAt(0)) {
    subject =
      subject.charAt(0).toLowerCase() + subject.slice(1, subject.length);
  }
  while (subject.endsWith('.')) {
    subject = subject.slice(0, subject.length - 1);
  }
  return subject;
}

function headerLength(answers) {
  return (
    answers.type.length + 2 + (answers.scope ? answers.scope.length + 2 : 0)
  );
}

function maxSummaryLength(options, answers) {
  return options.maxHeaderWidth - headerLength(answers);
}

module.exports = {
  prompter(cz, commit) {
    cz.prompt.registerPrompt('autocomplete', autocompletePrompt);
    return cz
      .prompt([
        autocomplete({
          name: 'type',
          message: "Select the type of change you're committing:",
          choices: getTypeChoices(),
          default: options.defaultType,
          keys: ['name'],
        }),
        autocomplete({
          name: 'scope',
          message: 'Specify a scope:',
          choices: getScopeChoices(),
          default: options.defaultScope,
          keys: ['name'],
        }),
        {
          type: 'input',
          name: 'subject',
          message: function(answers) {
            return (
              'Write a short, imperative tense description of the change (max ' +
              maxSummaryLength(options, answers) +
              ' chars):\n'
            );
          },
          default: options.defaultSubject,
          validate: function(subject, answers) {
            const filteredSubject = filterSubject(subject);
            return filteredSubject.length == 0
              ? 'subject is required'
              : filteredSubject.length <= maxSummaryLength(options, answers)
              ? true
              : 'Subject length must be less than or equal to ' +
                maxSummaryLength(options, answers) +
                ' characters. Current length is ' +
                filteredSubject.length +
                ' characters.';
          },
          transformer: function(subject, answers) {
            const filteredSubject = filterSubject(subject);
            const color =
              filteredSubject.length <= maxSummaryLength(options, answers)
                ? chalk.green
                : chalk.red;
            return color('(' + filteredSubject.length + ') ' + subject);
          },
          filter: function(subject) {
            return filterSubject(subject);
          },
        },
        {
          type: 'input',
          name: 'body',
          message:
            'Provide a longer description of the change: (press enter to skip)\n',
        },
        {
          type: 'confirm',
          name: 'isBreaking',
          message: 'Are there any breaking changes?',
          default: false,
        },
        {
          type: 'input',
          name: 'breakingBody',
          default: '-',
          message:
            'A BREAKING CHANGE commit requires a body. Please enter a longer description of the commit itself:\n',
          when: answers => answers.isBreaking && !answers.body,
          validate: breakingBody =>
            breakingBody.trim().length > 0 ||
            'Body is required for BREAKING CHANGE',
        },
        {
          type: 'input',
          name: 'breaking',
          message: 'Describe the breaking changes:\n',
          when: answers => answers.isBreaking,
        },
        {
          type: 'confirm',
          name: 'isIssueAffected',
          message: 'Does this change affect any open issues?',
          default: options.defaultIssues ? true : false,
        },
        {
          type: 'input',
          name: 'issuesBody',
          default: '-',
          message:
            'If issues are closed, the commit requires a body. Please enter a longer description of the commit itself:\n',
          when: answers =>
            answers.isIssueAffected && !answers.body && !answers.breakingBody,
        },
        {
          type: 'input',
          name: 'issues',
          message: 'Add issue references (e.g. "fix #123", "re #123".):\n',
          when: answers => answers.isIssueAffected,
          default: options.defaultIssues ? options.defaultIssues : undefined,
        },
      ])
      .then(format)
      .then(commit)
      .catch(e => {
        console.error(e);
        process.exit(1);
      });
  },
};

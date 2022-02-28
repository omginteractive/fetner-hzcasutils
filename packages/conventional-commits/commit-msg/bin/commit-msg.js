#! /usr/bin/env node
// @ts-check
const fs = require('fs');
const {promisify} = require('util');
const project = require('@lerna/project');
const yargs = require('yargs');
const emojiTypes = require('@hzdg/gitmoji');

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

/**
 * @param {unknown} filePath
 * @returns {filePath is string}
 */
const isFilePath = filePath =>
  Boolean(filePath && fs.existsSync(/** @type {string} */ (filePath)));

/**
 * @param {(import('@lerna/package').Package)[]} scopes
 * @returns {string}
 */
const header = scopes => `#
# NOTE: It is recommended to author commits using \`yarn commit\`
# or \`git-cz\`, rather than \`git commit\`.
#
# For more on commitizen, see: http://commitizen.github.io/cz-cli/
#
# This monorepo uses some commit conventions to help automate
# versioning and change logging as much as possible.
#
# These conventions are inspired by:
#   https://github.com/conventional-changelog/conventional-changelog
#   https://github.com/ngryman/cz-emoji
#
# The conventions are implemented and enforced by:
#   http://commitizen.github.io/cz-cli/
#   https://github.com/marionebl/commitlint
#
# As such, a commit message should take the form:
#
#   <type> [(scope)] <subject>
#
#   [body]
#
# Where <angle segments> are required,
# and [bracket segments] are optional.
# See lists of valid values for <type> and [(scope)] below.
#
# Some examples:
#
#   🚨 squash linting errors
#
#   ➕ (@hzdg/scroll-monitor) add react-dom@^16.3.1
#
#   🐛 (@hzdg/scroll-monitor) fix wheel delta and velocity
#
# Valid values for <type> are:
${emojiTypes
  .map(({emoji, description}) => `#   ${emoji} - ${description}`)
  .join('\n')}
#
#
# Valid values for [(scope)] are:
${scopes.map(({name}) => `#   (${name})`).join('\n')}
#\n`;

/**
 * Modifies the git commit message template with gitmoji and scope info.
 *
 * @param {string} filepath
 * @returns {Promise<void>}
 */
async function commitMsg(filepath) {
  if (isFilePath(filepath)) {
    const originalMsg = await readFile(filepath, 'utf8');
    await writeFile(
      filepath,
      originalMsg.replace(
        /#\s*\n/,
        header(await project.getPackages(process.cwd())),
      ),
      'utf8',
    );
  } else {
    throw new Error(`Expected a git message path, got ${filepath}`);
  }
}

module.exports = commitMsg;

// If this is module is being run as a script, invoke the main function.
if (
  typeof require !== 'undefined' &&
  require.main === /** @type {unknown} */ (module)
) {
  const {file: filepath} = yargs
    .usage(
      '$0 <file>',
      'Modifies the git commit message template with gitmoji and scope info.\n\n' +
        'Useful as a prepare-commit-msg git hook, i.e., via husky config\n' +
        'in package.json or husky config file:\n\n' +
        '{"hooks": {"prepare-commit-msg": "commit-msg $HUSKY_GIT_PARAMS"}}\n',
      yargs =>
        yargs
          .positional('file', {
            description: 'The filepath to the git commit msg',
            type: 'string',
          })
          .example(
            '$0 $HUSKY_GIT_PARAMS',
            'Use as a prepare-commit-msg husky hook',
          )
          .example(
            '$0 .git/COMMIT_MSG',
            'Modify an existing commit message file',
          ),
    )
    .alias('help', 'h')
    .string('file')
    .demand('file').argv;

  commitMsg(filepath).catch((/** @type {Error} */ err) => {
    console.error((err.stack && err.stack) || err);
    process.exit(1);
  });
}

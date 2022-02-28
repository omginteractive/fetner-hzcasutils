#! /usr/bin/env node
// @ts-check
const {promisify} = require('util');
const path = require('path');
const fs = require('fs');
const dashify = require('dashify');
const Fuse = require('fuse.js');
const inquirer = require('inquirer');
const report = require('yurnalist');
const autocompletePrompt = require('inquirer-autocomplete-prompt');
const validatePackageName = require('validate-npm-package-name');
const isVarName = require('is-var-name');

const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const writeFile = promisify(fs.writeFile);
const mkdirp = promisify(require('mkdirp'));

const PROJECT_ROOT = process.cwd();
const PACKAGES = path.resolve(PROJECT_ROOT, 'packages');

/**
 * @template T
 * @typedef {{[K in keyof T]: T[K] extends string ? K : never}[keyof T]} StringFields
 */

/**
 * @typedef {Object} Workspace
 * @property {string} name
 * @property {string} location
 * @property {Object[]} [devDependencies]
 * @property {Object[]} [peerDependencies]
 * @property {Boolean} [private]
 */

/**
 * @typedef {Object} DoczConfig
 * @property {string[]} menu
 */

/**
 * @typedef {Object} PackageMeta
 * @property {string} name
 */

/**
 * @typedef {Object} Options
 * @property {string} type
 * @property {string} name
 * @property {string} main
 * @property {string} menu
 * @property {string} route
 * @property {boolean} isDefault
 * @property {boolean} isReact
 */

/**
 * @typedef {Object} Result
 * @property {string} name
 * @property {string} dirname
 */

const FUSE_OPTIONS = {
  shouldSort: true,
  threshold: 0.4,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
};

/**
 * @param {Options} options
 * @returns {Promise<string>}
 */
async function createPackageDir(options) {
  const dirname = `${options.type}/${options.name}`;
  await mkdirp(path.resolve(PACKAGES, dirname));
  return dirname;
}

/**
 *
 * @param {(o: Options) => string} template
 * @param {Options} props
 * @returns {string}
 */
function renderTemplate(template, props) {
  return `${template(props).trim()}\n`;
}

/**
 * @param {Options} options
 * @param {string} [root]
 * @returns {Promise<{filepath: string, template: (o: Options) => string}[]>}
 */
async function collectPackageFiles(options, root) {
  const templateRoot = root
    ? path.resolve(__dirname, '../new-package', root)
    : path.resolve(__dirname, '../new-package');
  const templateFilenames = await readdir(templateRoot);
  const packageFiles = [];
  for (const templateFilename of templateFilenames) {
    const templatePath = path.resolve(templateRoot, templateFilename);
    if ((await stat(templatePath)).isDirectory()) {
      packageFiles.push(
        ...(await collectPackageFiles(
          options,
          root ? path.join(root, templateFilename) : templateFilename,
        )),
      );
    } else {
      const template = require(templatePath);
      if (typeof template !== 'function') continue;
      const filepath = templateFilename
        .replace(/%([^%]+)%/g, (
          pattern,
          /** @type {StringFields<options>} */ match,
        ) => (match ? options[match] : pattern))
        .replace(/(\.[^.]+)(?:\.js)?$/, '$1');

      packageFiles.push({
        template,
        filepath: root ? path.join(root, filepath) : filepath,
      });
    }
  }
  return packageFiles;
}

/**
 * @param {Options} options
 * @returns {Promise<Result>}
 */
async function createPackage(options) {
  const dirname = await createPackageDir(options);
  const packageFiles = await collectPackageFiles(options);
  for (const packageFile of packageFiles) {
    const filepath = path.resolve(PACKAGES, dirname, packageFile.filepath);
    await mkdirp(path.dirname(filepath));
    await writeFile(filepath, renderTemplate(packageFile.template, options));
  }
  const meta = require(path.resolve(PACKAGES, dirname, 'package.json'));
  return {name: meta.name, dirname};
}

module.exports = createPackage;

/**
 * @param {Object} options
 * @param {string} options.name
 * @param {string} options.message
 * @param {any[] | Promise<any[]>} options.choices
 * @param {string[]} options.keys
 * @returns {{type: string, name: string, message: string, source: Function}}
 */
function autocomplete({name, message, choices, keys}) {
  /** @type Fuse<any, any> */
  let search;
  return {
    type: 'autocomplete',
    name,
    message,
    /**
     * @param {any} _
     * @param {string} q
     */
    async source(_, q) {
      if (!search) {
        search = new Fuse(await choices, {...FUSE_OPTIONS, keys});
      }
      return Promise.resolve(q ? search.search(q) : choices);
    },
  };
}

/**
 * @returns Promise<{value: string}>
 */
function getTypeChoices() {
  const {packages} = require(path.resolve(PROJECT_ROOT, 'lerna.json'));
  const types = new Set();
  for (const packageLocation of packages) {
    types.add(path.dirname(path.relative(PACKAGES, packageLocation)));
  }
  return Array.from(types).map(value => ({value}));
}

/**
 * @returns Promise<{value: string}>
 */
async function getMenuChoices() {
  /** @type {DoczConfig} */
  const doczConfig = require(path.resolve(PROJECT_ROOT, 'doczrc.js'));
  return doczConfig.menu
    .filter(value => !/About/.test(value))
    .map(value => ({value}));
}

/**
 * @param {string} value
 * @param {string} type
 * @returns {boolean | string}
 */
function validateName(value, type) {
  if (/_/.test(value)) {
    return 'dash-case only, please!';
  }
  if (fs.existsSync(path.resolve(PACKAGES, type, `${value}`))) {
    return `${type}/${value} already exists!`;
  }
  const result = validatePackageName(`@hzdg/${value}`);
  if (!result.validForNewPackages) {
    if (result.errors && result.errors.length) {
      return result.errors[0];
    }
    if (result.warnings && result.warnings.length) {
      return result.warnings[0];
    }
    return false;
  }
  return true;
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isReactComponentName(name) {
  return /^[A-Z]/.test(name);
}

/**
 * @param {string} name
 * @returns {boolean}
 */
function isReactHookName(name) {
  return /^use/.test(name);
}

/**
 * @returns {Promise<Options>}
 */
async function promptForOptions() {
  inquirer.registerPrompt('autocomplete', autocompletePrompt);

  const {type} = await inquirer.prompt([
    autocomplete({
      name: 'type',
      message: 'Select the type of package you want to create:',
      choices: getTypeChoices(),
      keys: ['value'],
    }),
  ]);

  const {main} = await inquirer.prompt([
    {
      type: 'input',
      name: 'main',
      message:
        'Name your main function or component (TitleCase for a component, useCamelCase for a hook):',
      validate: name => isVarName(name) || 'Not a valid identifier!',
    },
  ]);

  const {isDefault, isReact} = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'isDefault',
      message: `Is ${main} the default export?`,
      default: true,
    },
    {
      type: 'confirm',
      name: 'isReact',
      message: 'Are we making some React stuff?',
      default: () => isReactComponentName(main) || isReactHookName(main),
    },
  ]);

  const {name} = await inquirer.prompt([
    {
      type: 'input',
      name: 'name',
      message: 'Name your new package (dash-case):',
      validate: name => validateName(name, type),
      default: () => dashify(main),
    },
  ]);

  const {menu, route} = await inquirer.prompt([
    autocomplete({
      name: 'menu',
      message: 'Select the docz menu for your package:',
      choices: getMenuChoices(),
      keys: ['value'],
    }),
    {
      type: 'input',
      name: 'route',
      message: 'What do you want the route (slug) to be?',
      default: `/${dashify(main)}`,
      validate: route => {
        if (!/^\//.test(route)) {
          return 'Route must start with a slash!';
        }
        if (!/^[/\-a-z]*$/.test(route)) {
          return 'Route should be lowercase letters, slashes and dashes only!';
        }
        return true;
      },
    },
  ]);

  return {name, type, main, isDefault, isReact, menu, route};
}

// If this is module is being run as a script,
// collect options from the user,
// then invoke the createPackage function.
if (
  typeof require !== 'undefined' &&
  require.main === /** @type {unknown} */ (module)
) {
  promptForOptions()
    .then(createPackage)
    .then(result => {
      report.success(`Created package ${result.name} at ${result.dirname}!`);
    })
    .catch(err => {
      report.error((err.stack && err.stack) || err);
      process.exit(1);
    });
}

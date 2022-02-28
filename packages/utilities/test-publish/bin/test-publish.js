#! /usr/bin/env node
// @ts-check
const childProcess = require('child_process');
const {onExit} = require('@rauschma/stringio');
const path = require('path');
const os = require('os');
const fs = require('fs');
const {promisify} = require('util');
const rmdir = promisify(require('rimraf'));
const mkdirp = promisify(require('mkdirp'));
const stoppable = require('stoppable');
const yargs = require('yargs');
const report = require('yurnalist');
const {default: verdaccio} = require('verdaccio');

const writeFile = promisify(fs.writeFile);
const readFile = promisify(fs.readFile);
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const rm = promisify(fs.unlink);

/**
 * @template T
 * @typedef {{[K in keyof T]: T[K] extends string ? K : never}[keyof T]} StringFields
 */

/**
 * @typedef {Object} Pkg
 * @property {string} name
 * @property {string} version
 * @property {boolean} private
 * @property {string} location
 * @property {{[name: string]: string}} dependencies
 * @property {{[name: string]: string}} devDependencies
 * @property {{[name: string]: string}} peerDependencies
 */

/**
 * @typedef {Object} PkgJson
 * @property {string} name
 * @property {string} version
 * @property {boolean} private
 * @property {{[name: string]: string}} dependencies
 * @property {{[name: string]: string}} devDependencies
 * @property {{[name: string]: string}} peerDependencies
 * @property {{[registry: string]: string, registry: string}} publishConfig
 */

/**
 * @typedef {Object} Registry
 * @property {string} url
 * @property {() => void} stop
 */

/**
 * @typedef {Object} Project
 * @property {string} path
 * @property {Pkg[]} installedPackages
 * @property {() => Promise<void>} cleanup
 */

const verdaccioConfig = {
  storage: path.join(os.tmpdir(), `verdaccio`, `storage`),
  port: 4873, // default
  web: {
    enable: true,
    title: `hzdg-dev`,
  },
  logs: [{type: `stdout`, format: `pretty-timestamped`, level: `warn`}],
  packages: {
    '**': {
      access: `$all`,
      publish: `$all`,
      proxy: `npmjs`,
    },
  },
  uplinks: {
    npmjs: {
      url: `https://registry.npmjs.org/`,
    },
  },
};

/**
 * @param {string} command
 * @returns {string}
 */
function resolveCommand(command) {
  if (/^(?:\.|\/)/.test(command)) {
    return command;
  }
  const nodeCommand = path.resolve('./node_modules/.bin', command);
  if (fs.existsSync(nodeCommand)) return nodeCommand;
  return command;
}

/**
 * @param {string} command
 * @param {string[]} args
 * @param {import('child_process').SpawnOptions | undefined} [options]
 * @returns {Promise<void>}
 */
async function run(command, args, options) {
  command = resolveCommand(command);
  report.command(`${command} ${args.join(' ')}`);
  const source = childProcess.spawn(command, args, {
    stdio: ['ignore', process.stdout, process.stderr],
    ...options,
  });
  return onExit(source);
}

/**
 *
 * @param {string} command
 * @param {import('child_process').ExecSyncOptionsWithStringEncoding | undefined} [options]
 */
function execSync(command, options) {
  command = command.replace(/(^[^\s]+)\s*(.*)$/, (str, cmd, args) =>
    cmd ? `${resolveCommand(cmd)}${args ? ` ${args}` : ''}` : str,
  );
  report.command(command);
  return childProcess.execSync(command, options);
}

/**
 *
 * @param {Pkg} pkg
 * @returns {Promise<PkgJson>}
 */
async function readPackageJson({location}) {
  const pkgJsonPath = path.join(location, 'package.json');
  return JSON.parse((await readFile(pkgJsonPath)).toString());
}
/**
 *
 * @param {Pkg} pkg
 * @param {PkgJson} pkgJson
 * @returns {Promise<void>}
 */
function writePackageJson({location}, pkgJson) {
  const pkgJsonPath = path.join(location, 'package.json');
  return writeFile(pkgJsonPath, JSON.stringify(pkgJson, null, 2));
}

/**
 * @param {Record<string, Pkg>} pkgs
 * @returns {Promise<void>}
 */
async function ensureCleanWorkingDirs(pkgs) {
  for (const pkg of Object.values(pkgs)) {
    const diff = execSync(`git diff --stat ${pkg.location}`).toString();
    if (diff) {
      throw new Error(
        `${path.relative(
          process.cwd(),
          pkg.location,
        )} has uncommited changes!\n${diff}`,
      );
    }
  }
}

/**
 * @param {Record<string, Pkg>} pkgs
 * @param {Record<string, Pkg>} [publicPkgs]
 * @returns {Promise<Record<string, Pkg>>}
 */
async function collectUnpublishedDeps(pkgs, publicPkgs) {
  if (!publicPkgs) {
    publicPkgs = {};
    for (const pkg of JSON.parse(
      execSync('lerna list --json --loglevel=error').toString(),
    )) {
      if (pkg.name in pkgs) continue;
      publicPkgs[pkg.name] = pkg;
    }
  }
  /** @type Record<string, Pkg> */
  const unpublishedDeps = {};
  if (Object.keys(pkgs).length <= 0) return unpublishedDeps;
  for (const pkg of Object.values(pkgs)) {
    for (const dep in pkg.dependencies) {
      if (dep in publicPkgs && !(dep in unpublishedDeps)) {
        const meta = await readPackageJson(publicPkgs[dep]);
        unpublishedDeps[dep] = {...meta, ...publicPkgs[dep]};
      }
    }
  }
  const unpublishedNestedDeps = await collectUnpublishedDeps(
    unpublishedDeps,
    publicPkgs,
  );
  return {...unpublishedDeps, ...unpublishedNestedDeps};
}

/**
 * @returns {Promise<Record<string, Pkg>>}
 */
async function collectChangedPkgs() {
  /** @type Record<string, Pkg> */
  const changedPkgs = {};
  for (const pkg of JSON.parse(
    execSync('lerna changed --all --json --loglevel=error').toString(),
  )) {
    const meta = await readPackageJson(pkg);
    changedPkgs[pkg.name] = {...meta, ...pkg};
  }
  if (!Object.keys(changedPkgs).length) {
    throw new Error('No packages need publishing!');
  }
  if (Object.values(changedPkgs).every(pkg => pkg.private)) {
    throw new Error(
      `No public packages need publishing!\nChanged packages are:\n${Object.keys(
        changedPkgs,
      )
        .map(n => `  ${n}`)
        .join('\n')}`,
    );
  }
  return changedPkgs;
}

async function getBranch() {
  return execSync(`git rev-parse --abbrev-ref HEAD`).toString(); // TODO: Remove this?
}

/**
 * @returns {Promise<Record<string, Pkg>>}
 */
async function versionPkgs() {
  // NOTE: We will do this again after the version has happened,
  // but we do it before versioning now to bail as early
  // as possible if we don't have any publishable packages,
  // or if we have uncommitted changes in any packages.
  let pkgsToPublish = await collectChangedPkgs();
  await ensureCleanWorkingDirs(pkgsToPublish);
  // Get the current branch. This is to override lerna's configuration,
  // which normally only allows versioning/publishing from the default branch.
  const gitBranch = await getBranch();
  await run('lerna', [
    'version',
    'prerelease',
    '--yes',
    '--loglevel=error',
    '--no-progress',
    '--no-git-tag-version',
    '--preid=dev',
    `--allow-branch=${gitBranch}`,
  ]);
  pkgsToPublish = await collectChangedPkgs();
  report.success('Created new versions!');
  return pkgsToPublish;
}

/**
 * @param {Record<string, Pkg>} pkgs
 * @returns {Promise<void>}
 */
async function rollBackPkgs(pkgs) {
  const spinner = report.activity();
  spinner.tick('rolling back versions');
  for (const pkg in pkgs) {
    await run('git', ['checkout', `${pkgs[pkg].location}`]);
  }
  report.success('Rolled back versions!');
  spinner.end();
}

/**
 * @returns {Promise<Registry>}
 */
async function startRegistry() {
  const spinner = report.activity();
  spinner.tick('Starting local verdaccio server');
  // clear storage
  await rmdir(verdaccioConfig.storage);
  return new Promise(resolve => {
    verdaccio(
      verdaccioConfig,
      verdaccioConfig.port,
      verdaccioConfig.storage,
      `1.0.0`,
      `hzdg-dev`,
      (webServer, addr) => {
        webServer.listen(addr.port || addr.path, addr.host, () => {
          const registryUrl = `http://${addr.host}:${addr.port}`;
          const registry = stoppable(webServer);
          report.success(`Started local verdaccio server at ${registryUrl}`);
          spinner.end();
          resolve({
            url: registryUrl,
            stop: promisify(registry.stop.bind(registry)),
          });
        });
      },
    );
  });
}

/**
 * @param {Pkg} pkg
 * @param {string} registry
 * @returns {Promise<() => Promise<void>>}
 */
async function createTemporaryNPMRC({location}, registry) {
  const NPMRCPath = path.join(location, `.npmrc`);
  const NPMRC = `${registry.replace(/https?:/g, ``)}/:_authToken="hzdg-dev"`;
  await writeFile(NPMRCPath, NPMRC);
  return async () => {
    await rm(NPMRCPath);
  };
}

/**
 *
 * @param {Pkg} pkg
 * @param {string} registry
 */
async function updatePackageRegistry(pkg, registry) {
  const pkgJson = await readPackageJson(pkg);
  pkgJson.publishConfig = {registry, ['@hzdg:registry']: registry};
  return writePackageJson(pkg, pkgJson);
}

/**
 * @param {Pkg[]} pkgs
 * @param {string} [root]
 * @returns {Promise<Record<string, string>>}
 */
async function collectProjectFiles(pkgs, root) {
  const templateRoot = root
    ? path.resolve(__dirname, '../test-package', root)
    : path.resolve(__dirname, '../test-package');
  const templateFilenames = await readdir(templateRoot);
  /** @type {Record<string, string>} */
  const projectFiles = {};
  const TemplatePattern = /%([^%]+)%/g;
  const ExtPattern = /(\.[^.]+)(?:\.js)?$/;
  for (const templateFilename of templateFilenames) {
    const templatePath = path.resolve(templateRoot, templateFilename);
    if ((await stat(templatePath)).isDirectory()) {
      Object.assign(
        projectFiles,
        await collectProjectFiles(
          pkgs,
          root ? path.join(root, templateFilename) : templateFilename,
        ),
      );
    } else if (TemplatePattern.test(templatePath)) {
      const template = require(templatePath);
      if (typeof template !== 'function') {
        throw new Error(
          `Expected ${templatePath} to export a template function, but got ${template}`,
        );
      }
      for (const pkg of pkgs) {
        const filepath = templateFilename
          .replace(TemplatePattern, (
            pattern,
            /** @type {StringFields<Pkg>} */ match,
          ) => (match ? pkg[match] : pattern))
          .replace('@hzdg/', '')
          .replace(ExtPattern, '$1');
        projectFiles[root ? path.join(root, filepath) : filepath] = template(
          pkg,
        );
      }
    } else {
      const src = (await readFile(templatePath)).toString();
      if (!src) {
        throw new Error(`Could not read file at ${templatePath}`);
      }
      projectFiles[
        root ? path.join(root, templateFilename) : templateFilename
      ] = src;
    }
  }
  return projectFiles;
}

/**
 *
 * @param {string} packagePath
 * @param {Pkg[]} pkgs
 * @param {string} registry
 * @returns {Promise<() => Promise<void>>}
 */
async function createTestProject(packagePath, pkgs, registry) {
  const spinner = report.activity();
  spinner.tick(`creating test project`);
  await rmdir(packagePath);
  await mkdirp(packagePath);

  await writeFile(
    path.join(packagePath, '.npmrc'),
    `@hzdg:registry="${registry}"`,
  );

  try {
    const projectFiles = await collectProjectFiles(pkgs);
    for (const filepath in projectFiles) {
      const targetPath = path.resolve(packagePath, filepath);
      await mkdirp(path.dirname(targetPath));
      await writeFile(targetPath, projectFiles[filepath]);
    }
  } catch (e) {
    await rmdir(packagePath);
    spinner.end();
    throw e;
  }
  spinner.end();
  report.success(`Created test project at ${packagePath}!`);
  return async () => {
    await rmdir(packagePath);
  };
}

/**
 * @param {Record<string, Pkg>} pkgs
 * @param {string} registry
 * @returns {Promise<Pkg[]>}
 */
async function publishPkgs(pkgs, registry) {
  const spinner = report.activity();
  spinner.tick(`publishing packages`);
  const unpublishedDeps = await collectUnpublishedDeps(pkgs);
  if (Object.keys(unpublishedDeps).length > 0) {
    await ensureCleanWorkingDirs(unpublishedDeps);
  }
  const allPkgsToPublish = Object.values(unpublishedDeps);
  const publishedPkgs = [];
  for (const pkg of Object.values(pkgs)) {
    if (pkg.private) {
      report.warn(`skipping private package ${pkg.name}!`);
      continue;
    }
    allPkgsToPublish.push(pkg);
  }

  for (const pkg of allPkgsToPublish) {
    const cleanup = await createTemporaryNPMRC(pkg, registry);
    let error;
    try {
      await updatePackageRegistry(pkg, registry);
      await run(
        'npm',
        ['publish', '--quiet', '--no-progress', '--tag', 'hzdg-dev'],
        {cwd: pkg.location},
      );
      publishedPkgs.push(pkg);
    } catch (e) {
      error = e;
    } finally {
      await cleanup();
    }
    if (error) {
      spinner.end();
      throw error;
    }
    report.success(`Published ${pkg.name} to ${registry}!`);
  }
  spinner.end();
  return publishedPkgs;
}

/**
 *
 * @param {Pkg[]} pkgs
 * @param {string} registry
 * @returns {Promise<Project>}
 */
async function installPublishedPkgs(pkgs, registry) {
  const packagePath = path.join(os.tmpdir(), 'hzdg', 'test');
  const cleanup = await createTestProject(packagePath, pkgs, registry);
  /** @type Set<string> */
  const pkgsToInstall = new Set();
  for (const pkg of pkgs) {
    pkgsToInstall.add(`${pkg.name}@hzdg-dev`);
    for (const dep in pkg.peerDependencies) {
      pkgsToInstall.add(`${dep}@${pkg.peerDependencies[dep]}`);
    }
  }

  try {
    await run(
      'yarn',
      [
        'add',
        ...Array.from(pkgsToInstall),
        '--no-progress',
        '--non-interactive',
        '--exact',
      ],
      {cwd: packagePath},
    );
    report.success('installed packages!');
  } catch (error) {
    await cleanup();
    throw error;
  }
  return {path: packagePath, installedPackages: pkgs, cleanup};
}

/**
 *
 * @param {Record<string, Pkg>} pkgs
 * @param {Project} project
 * @returns {Promise<void>}
 */
async function testInstalledPackages(pkgs, project) {
  await run('jest', [], {cwd: project.path});
}

/**
 * @param {{open: string | undefined}} [options]
 * @returns {Promise<Record<string, Pkg> | undefined>}
 */
async function testPublish(options) {
  const openCmd = options ? options.open : false;
  const shouldOpen = typeof openCmd == 'string';
  let error = false;
  /** @type {Record<string, Pkg> | undefined} */
  let pkgsToPublish;
  /** @type {Record<string, Pkg> | undefined} */
  let pkgsToRollBack;
  /** @type {Registry | undefined} */
  let registry;
  /** @type {Project | undefined} */
  let project;
  try {
    // get list of packages that need publish and version them all temporarily.
    pkgsToPublish = await versionPkgs();
    pkgsToRollBack = {...pkgsToPublish};
    // spin up verdaccio
    registry = await startRegistry();
    // publish packages to verdaccio
    const publishedPkgs = await publishPkgs(pkgsToPublish, registry.url);
    if (!publishedPkgs.length) {
      throw new Error(`no packages were published!`);
    }
    for (const pkg of publishedPkgs) {
      pkgsToRollBack[pkg.name] = pkg;
    }
    // install published packages in a test project.
    project = await installPublishedPkgs(publishedPkgs, registry.url);
    if (!shouldOpen) {
      // run smoke tests for each package.
      await testInstalledPackages(pkgsToPublish, project);
    }
  } catch (e) {
    error = e;
  } finally {
    // stop the verdaccio server
    if (registry && (error || !shouldOpen)) {
      await registry.stop();
      report.info('Verdaccio server stopped!');
    }
    if (project && (error || !shouldOpen)) {
      await project.cleanup();
      report.info('Test project cleaned!');
    }
    if (pkgsToRollBack) {
      // roll back the version and registry changes
      await rollBackPkgs(pkgsToRollBack);
    }

    if (!error && shouldOpen && project && registry) {
      report.info(`local registry available at ${registry.url}`);
      report.info(`opening test project at ${project.path}`);
      execSync(`${openCmd} ${project.path}`);
    }
  }
  if (error) throw error;
  return pkgsToPublish;
}

exports.testPublish = testPublish;
// If this is module is being run as a script,
// then invoke the testPublish function.
if (typeof require !== 'undefined' && require.main === module) {
  const options = yargs
    .usage(
      '\nCollects changed packages and publishes them to a test registry.\n\n' +
        `Also runs a suite of basic 'smoke tests' for each package.\n\n` +
        'If the --open option is specified, also opens the test project\n' +
        `using the specified command, or 'code' if none is provided.`,
    )
    .example('$0', 'Run the publish tests for all changed packages')
    .example('$0 --open', 'Open the test project in vscode')
    .example('$0 --open atom', 'Open the test project in atom')
    .alias('help', 'h')
    .option('open', {
      alias: 'o',
      description: 'Open the created test project with the specified command',
      type: 'string',
      coerce: s => (s.trim() ? s : 'code'),
    }).argv;

  const {open} = options;
  testPublish({open})
    .then(pkgs => {
      if (!pkgs) {
        report.warn('No packages were checked?');
      } else {
        report.success('Good to go!');
      }
    })
    .catch(err => {
      report.error((err.stack && err.stack) || err);
      process.exit(1);
    });
}

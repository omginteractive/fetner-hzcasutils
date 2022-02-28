const fs = require('fs');
const {spawnSync} = require('child_process');

/**
 * Adapted from: https://community.netlify.com/t/common-issue-using-private-npm-modules-on-netlify/795/33
 *
 * Netlify does not support Github Packages (or other private package
 * registries besides npm), options are:
 *   - Commit .npmrc to repo - However, now we have a secret token in our repo
 *   - Environment variable in .npmrc - However, this requires all developer
 *     machines to have the same environment variable configured
 *   - Get creative with the preinstall script... :)
 */

// Only run this script on Netlify
// this is a default Netlify environment variable
if (process.env.NETLIFY === 'true') {
  // Check if .npmrc was already updated by this script.
  // If it was then do nothing (otherwise we create an infinite yarn loop)
  if (process.env.NETLIFY_NPMRC_DONE !== 'true') {
    // Update .npmrc with the env GITHUB_TOKEN.
    fs.appendFileSync(
      '.npmrc',
      `//npm.pkg.github.com/:_authToken=${process.env.GITHUB_TOKEN}\n`,
    );

    // Run yarn again, because the yarn process which is executing
    // this script won't pick up the .npmrc file we just updated.
    // The original yarn process will continue after this second
    // yarn process finishes, and when it does it will report
    // "success Already up-to-date."
    spawnSync('yarn', {
      stdio: 'inherit',
      env: {...process.env, NETLIFY_NPMRC_DONE: true},
    });
  }
}

const JSDomEnvironmentBase = require('jest-environment-jsdom-sixteen');

const PRAGMA_GLOBAL = 'jsdom-global';

/**
 * A custom version of the jsdom Jest environment
 * that supports replacing jsdom globals with node globals.
 *
 * This is useful for scenarios where code under test runs
 * `instanceof` checks on jsdom objects.
 *
 * For instance, `Element instancecof Object` will be `false`
 * in the default jsdom environment. This is because a jsdom
 * context is sandboxed from the node context (like an iframe
 * being sandboxed from the host document).
 *
 * This environment supports changing jsdom globals via
 * a docblock pragma, i.e.
 *
 * @jsdom-global Object
 *
 * This pragma will replace the jsdom Object with node's Object,
 * which will allow tests `Element instanceof Object` to pass.
 *
 * See https://github.com/jsdom/jsdom/issues/1737
 * and https://github.com/webcomponents/polyfills/issues/105
 */
class JSDomEnvironment extends JSDomEnvironmentBase {
  constructor(config, context) {
    super(config, context);
    const pragmas = context.docblockPragmas;
    this.withGlobals =
      Boolean(pragmas[PRAGMA_GLOBAL]) &&
      new Map(pragmas[PRAGMA_GLOBAL].split(/\s*,\s*/).map(v => [v, null]));
  }

  async setup() {
    await super.setup();
    if (this.withGlobals) {
      this.withGlobals.forEach((_, key) => {
        this.withGlobals.set(key, this.global.window[key]);
        this.global.window[key] = global[key];
      });
    }
  }

  async teardown() {
    if (this.withGlobals) {
      this.withGlobals.forEach((value, key) => {
        this.global.window[key] = value;
        this.withGlobals.set(key, null);
      });
    }
    await super.teardown();
  }
}

module.exports = JSDomEnvironment;

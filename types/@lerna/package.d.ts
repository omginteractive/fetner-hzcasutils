import npa from 'npm-package-arg';

type JSONPrimitive = string | number | boolean | null;
type JSONValue = JSONPrimitive | JSONObject | JSONArray;
type JSONObject = {[member: string]: JSONValue};
type JSONArray = JSONValue[];

declare module '@lerna/package' {
  export class Package {
    constructor(
      pkg: JSONObject & {
        name: string;
        version: string;
      },
      location: string,
      rootPath?: string,
    );
    name: string;
    location: string;
    private: boolean;
    resolved: string;
    rootPath: string;
    bin: {[key: string]: string};
    scripts: {[key: string]: string};
    manifestLocation: string;
    nodeModulesLocation: string;
    binLocation: string;

    get version(): string;
    set version(version: string);

    get contents(): string;
    set contents(subDirectory: string);

    get dependencies(): {[key: string]: string} | undefined;
    get devDependencies(): {[key: string]: string} | undefined;
    get optionalDependencies(): {[key: string]: string} | undefined;
    get peerDependencies(): {[key: string]: string} | undefined;

    /**
     * Map-like retrieval of arbitrary values
     * @param {String} key field name to retrieve value
     * @returns {Any} value stored under key, if present
     */
    get(key: string): JSONValue | undefined;

    /**
     * Map-like storage of arbitrary values
     * @param {String} key field name to store value
     * @param {Any} val value to store
     * @returns {Package} instance for chaining
     */
    set(key: string, val: JSONValue): this;

    /** Provide shallow copy for munging elsewhere */
    toJSON(): JSONObject;

    /**
     * Refresh internal state from disk (e.g., changed by external lifecycles)
     */
    refresh(): Promise<this>;

    /**
     * Write manifest changes to disk
     * @returns {Promise} resolves when write finished
     */
    serialize(): Promise<this>;

    /**
     * Mutate local dependency spec according to type
     * @param {Object} resolved npa metadata
     * @param {String} depVersion semver
     * @param {String} savePrefix npm_config_save_prefix
     */
    updateLocalDependency(
      resolved: npa.Result,
      depVersion: string,
      savePrefix: string,
    ): void;
  }
}

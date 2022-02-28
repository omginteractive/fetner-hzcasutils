declare module 'yurnalist' {
  type Stdout = NodeJS.WritableStream;
  type Stdin = NodeJS.ReadableStream;

  type Package = {
    name: string;
    version: string;
  };

  type Tree = {
    name: string;
    children?: Trees;
    hint?: string | null;
    hidden?: boolean;
    color?: string | null;
  };

  type Trees = Tree[];

  type ReporterSpinner = {
    tick: (name: string) => void;
    end: () => void;
  };

  type ReporterSelectOption = {
    name: string;
    value: string;
  };

  type ReporterSpinnerSet = {
    spinners: ReporterSetSpinner[];
    end: () => void;
  };

  type ReporterSetSpinner = {
    clear: () => void;
    setPrefix: (current: number, prefix: string) => void;
    tick: (msg: string) => void;
    end: () => void;
  };

  type QuestionOptions = {
    password?: boolean;
    required?: boolean;
  };

  type InquirerPromptTypes =
    | 'list'
    | 'rawlist'
    | 'expand'
    | 'checkbox'
    | 'confirm'
    | 'input'
    | 'password'
    | 'editor';

  type PromptOptions = {
    name?: string;
    type?: InquirerPromptTypes;
    validate?: (input: string | Array<string>) => boolean | string;
  };

  export type ApiReporterOptions = {
    verbose?: boolean;
    stdout?: Stdout;
    stderr?: Stdout;
    stdin?: Stdin;
    emoji?: boolean;
    noProgress?: boolean;
    silent?: boolean;
    nonInteractive?: boolean;
    peekMemoryCounter?: boolean;
  };

  type Language = 'en';

  type FormatFunction = (...strs: string[]) => string;

  export type Formatter = {
    bold: FormatFunction;
    dim: FormatFunction;
    italic: FormatFunction;
    underline: FormatFunction;
    inverse: FormatFunction;
    strikethrough: FormatFunction;
    black: FormatFunction;
    red: FormatFunction;
    green: FormatFunction;
    yellow: FormatFunction;
    blue: FormatFunction;
    magenta: FormatFunction;
    cyan: FormatFunction;
    white: FormatFunction;
    gray: FormatFunction;
    grey: FormatFunction;
    stripColor: FormatFunction;
  };

  export type ReporterOptions = {
    verbose?: boolean;
    language?: Language;
    stdout?: Stdout;
    stderr?: Stdout;
    stdin?: Stdin;
    emoji?: boolean;
    noProgress?: boolean;
    silent?: boolean;
    nonInteractive?: boolean;
  };

  export class BaseReporter {
    constructor(opts?: ReporterOptions);

    formatter: Formatter;
    language: Language;
    stdout: Stdout;
    stderr: Stdout;
    stdin: Stdin;
    isTTY: boolean;
    emoji: boolean;
    noProgress: boolean;
    isVerbose: boolean;
    isSilent: boolean;
    nonInteractive: boolean;
    format: Formatter;

    peakMemoryInterval: NodeJS.Timeout | null;
    peakMemory: number;
    startTime: number;

    lang(key: Language, ...args: unknown[]): string;

    /**
     * `stringifyLangArgs` run `JSON.stringify` on strings too causing
     * them to appear quoted. This marks them as "raw" and prevents
     * the quoting and escaping
     */
    rawText(str: string): {inspect(): string};

    verbose(msg: string): void;

    verboseInspect(val: unknown): void;

    _verbose(msg: string): void;
    _verboseInspect(val: unknown): void;

    _getStandardInput(): Stdin;

    initPeakMemoryCounter(): void;

    checkPeakMemory(): void;

    close(): void;

    getTotalTime(): number;

    // TODO
    list(key: string, items: string[], hints?: Record<string, unknown>): void;

    // Outputs basic tree structure to console
    tree(key: string, obj: Trees, options?: {force?: boolean}): void;

    // called whenever we begin a step in the CLI.
    step(current: number, total: number, message: string, emoji?: string): void;

    // a error message has been triggered. this however does not always meant an abrupt
    // program end.
    error(message: string): void;

    // an info message has been triggered. this provides things like stats and diagnostics.
    info(message: string): void;

    // a warning message has been triggered.
    warn(message: string): void;

    // a success message has been triggered.
    success(message: string): void;

    // a simple log message
    // TODO: rethink the {force} parameter. In the meantime, please don't use it (cf comments in #4143).
    log(message: string, options?: {force?: boolean}): void;

    // a shell command has been executed
    command(command: string): void;

    // inspect and pretty-print any value
    inspect(value: unknown): void;

    // the screen shown at the very start of the CLI
    header(command: string, pkg: Package): void;

    // the screen shown at the very end of the CLI
    footer(showPeakMemory: boolean): void;

    // a table structure
    table(head: string[], body: string[][]): void;

    // render an activity spinner and return a function that will trigger an update
    activity(): ReporterSpinner;

    //
    activitySet(total: number, workers: number): ReporterSpinnerSet;

    //
    question(question: string, options?: QuestionOptions): Promise<string>;

    //
    questionAffirm(question: string): Promise<boolean>;

    // prompt the user to select an option from an array
    select(
      header: string,
      question: string,
      options: ReporterSelectOption[],
    ): Promise<string>;

    // render a progress bar and return a function which when called will trigger an update
    progress(total: number): () => void;

    // utility function to disable progress bar
    disableProgress(): void;

    //
    prompt<T>(
      message: string,
      choices: unknown[],
      options?: PromptOptions,
    ): Promise<T[]>;
  }

  export class ConsoleReporter extends BaseReporter {}

  export function createReporter(options?: ApiReporterOptions): ConsoleReporter;

  export const table: ConsoleReporter['table'];
  export const step: ConsoleReporter['step'];
  export const inspect: ConsoleReporter['inspect'];
  export const list: ConsoleReporter['list'];
  export const header: ConsoleReporter['header'];
  export const footer: ConsoleReporter['footer'];
  export const log: ConsoleReporter['log'];
  export const success: ConsoleReporter['success'];
  export const error: ConsoleReporter['error'];
  export const info: ConsoleReporter['info'];
  export const command: ConsoleReporter['command'];
  export const warn: ConsoleReporter['warn'];
  export const question: ConsoleReporter['question'];
  export const tree: ConsoleReporter['tree'];
  export const activitySet: ConsoleReporter['activitySet'];
  export const activity: ConsoleReporter['activity'];
  export const select: ConsoleReporter['select'];
  export const progress: ConsoleReporter['progress'];
  export const close: ConsoleReporter['close'];
  export const lang: ConsoleReporter['lang'];
  export const reporter: ConsoleReporter;
  export default reporter;
}

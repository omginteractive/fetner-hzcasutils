declare module 'callbag-subject' {
  import {Source, Sink} from 'callbag';
  /**
   * A callbag listener sink which is also a listenable source,
   * and maintains an internal list of listeners.
   * Use this like you would use RxJS Subject.
   */
  export default function<T>(): Source<T> & Sink<T>;
}

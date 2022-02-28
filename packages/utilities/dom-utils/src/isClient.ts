const isClient =
  typeof window !== 'undefined' &&
  typeof Document !== 'undefined' &&
  typeof HTMLElement !== 'undefined';

export default isClient;

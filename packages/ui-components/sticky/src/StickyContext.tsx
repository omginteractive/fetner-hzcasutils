import {createContext, useContext} from 'react';
/**
 * Whether or not the Sticky content should stick,
 * or should stick to the bottom of the containing element.
 */
export type ShouldStickState = boolean | 'bottom';

const StickyContext = createContext<ShouldStickState>(false);

export const StickyContextProvider = StickyContext.Provider;

/**
 *`useStickyState` is a hook for components that care whether
 * the nearest `Sticky` or `Fixed` ancestor is currently stuck.
 *
 * Returns a `boolean` or `'bottom'`, defaulting to `false`.
 */
export function useStickyState(): ShouldStickState {
  return useContext(StickyContext);
}

import React, {useContext} from 'react';

const SectioningContext = React.createContext(1) as React.Context<SectionLevel>;

/**
 * One of six possible HTML5 Sectioning Levels.
 */
export type SectionLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * Establishes a sectioning context for
 * descendant sectioning and heading content.
 */
export const SectionLevelProvider = SectioningContext.Provider;

/**
 * Returns the current sectioning level, as provided by
 * the nearest `SectionLevelProvier`
 */
export function useSectionLevel(): SectionLevel {
  return useContext(SectioningContext);
}

/**
 * Returns the current sectioning level, incremented by 1,
 * up to the maximum `SectionLevel` of 6, as provided by
 * the nearest `SectionLevelProvider`.
 *
 * Note that, as the minimum section level is `1`, the default
 * return value will be `2` when no sectioning context has been established.
 */
export function useNextSectionLevel(): SectionLevel {
  const level = useSectionLevel();
  // TODO: warn if max level is already reached.
  return Math.min(6, Math.max(2, level + 1)) as SectionLevel;
}

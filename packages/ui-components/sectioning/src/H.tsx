import React from 'react';
import {SectionLevel, useSectionLevel} from './sectionLevel';

export interface HProps extends React.ComponentProps<'h1'> {
  /**
   * One of the six possible HTML5 Sectioning levels to use: 1—6.
   * If this is defined, it will be used instead
   * of the nearest sectioning context.
   */
  level?: SectionLevel;
}

export const H = React.forwardRef(function H(
  {level, ...props}: HProps,
  ref: HProps['ref'],
): JSX.Element {
  const sectionLevel = useSectionLevel();
  return React.createElement(`h${level || sectionLevel}`, {...props, ref});
});
H.displayName = 'H';

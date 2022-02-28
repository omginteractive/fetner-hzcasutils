import React from 'react';
import {SectionLevelProvider, useNextSectionLevel} from './sectionLevel';

export type SectionProps = React.ComponentProps<'section'>;
export const Section = React.forwardRef(function Section(
  {children, ...props}: SectionProps,
  ref: SectionProps['ref'],
): JSX.Element {
  return (
    <section {...props} ref={ref}>
      <SectionLevelProvider value={useNextSectionLevel()}>
        {children}
      </SectionLevelProvider>
    </section>
  );
});
Section.displayName = 'Section';

export type ArticleProps = React.ComponentProps<'article'>;
export const Article = React.forwardRef(function Article(
  {children, ...props}: ArticleProps,
  ref: ArticleProps['ref'],
): JSX.Element {
  return (
    <article {...props} ref={ref}>
      <SectionLevelProvider value={useNextSectionLevel()}>
        {children}
      </SectionLevelProvider>
    </article>
  );
});
Article.displayName = 'Article';

export type AsideProps = React.ComponentProps<'aside'>;
export const Aside = React.forwardRef(function Aside(
  {children, ...props}: AsideProps,
  ref: AsideProps['ref'],
): JSX.Element {
  return (
    <aside {...props} ref={ref}>
      <SectionLevelProvider value={useNextSectionLevel()}>
        {children}
      </SectionLevelProvider>
    </aside>
  );
});
Aside.displayName = 'Aside';

export type NavProps = React.ComponentProps<'nav'>;
export const Nav = React.forwardRef(function Nav(
  {children, ...props}: NavProps,
  ref: NavProps['ref'],
): JSX.Element {
  return (
    <nav {...props} ref={ref}>
      <SectionLevelProvider value={useNextSectionLevel()}>
        {children}
      </SectionLevelProvider>
    </nav>
  );
});
Nav.displayName = 'Nav';

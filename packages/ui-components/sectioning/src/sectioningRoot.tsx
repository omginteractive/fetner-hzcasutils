import React from 'react';
import {SectionLevelProvider} from './sectionLevel';

export type BodyProps = React.ComponentProps<'body'>;
export const Body = React.forwardRef(function Body(
  {children, ...props}: BodyProps,
  ref: BodyProps['ref'],
): JSX.Element {
  return (
    <body {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </body>
  );
});
Body.displayName = 'Body';

export type BlockquoteProps = React.ComponentProps<'blockquote'>;
export const Blockquote = React.forwardRef(function Blockquote(
  {children, ...props}: BlockquoteProps,
  ref: BlockquoteProps['ref'],
): JSX.Element {
  return (
    <blockquote {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </blockquote>
  );
});
Blockquote.displayName = 'Blockquote';

export type DetailsProps = React.ComponentProps<'details'>;
export const Details = React.forwardRef(function Details(
  {children, ...props}: DetailsProps,
  ref: DetailsProps['ref'],
): JSX.Element {
  return (
    <details {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </details>
  );
});
Details.displayName = 'Details';

export type DialogProps = React.ComponentProps<'dialog'>;
export const Dialog = React.forwardRef(function Dialog(
  {children, ...props}: DialogProps,
  ref: DialogProps['ref'],
): JSX.Element {
  return (
    <dialog {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </dialog>
  );
});
Dialog.displayName = 'Dialog';

export type FieldsetProps = React.ComponentProps<'fieldset'>;
export const Fieldset = React.forwardRef(function Fieldset(
  {children, ...props}: FieldsetProps,
  ref: FieldsetProps['ref'],
): JSX.Element {
  return (
    <fieldset {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </fieldset>
  );
});
Fieldset.displayName = 'Fieldset';

export type FigureProps = React.ComponentProps<'figure'>;
export const Figure = React.forwardRef(function Figure(
  {children, ...props}: FigureProps,
  ref: FigureProps['ref'],
): JSX.Element {
  return (
    <figure {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </figure>
  );
});
Figure.displayName = 'Figure';

export type TdProps = React.ComponentProps<'td'>;
export const Td = React.forwardRef(function Td(
  {children, ...props}: TdProps,
  ref: TdProps['ref'],
): JSX.Element {
  return (
    <td {...props} ref={ref}>
      <SectionLevelProvider value={1}>{children}</SectionLevelProvider>
    </td>
  );
});
Td.displayName = 'Td';

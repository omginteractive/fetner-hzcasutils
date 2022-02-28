import React, {forwardRef, Ref} from 'react';

import {useDraftailComponents, Components} from './context';

interface CreateElementProps {
  key?: string | number;
  components?: Components;
  draftailType?: string;
  originalType?: string;
  parentName?: string;
  rest?: unknown[];
  children: React.ReactNode;
  [name: string]: unknown;
}

const TYPE_PROP_NAME = 'draftailType';

const DEFAULTS: {
  inlineCode: string;
  wrapper: React.ReactNode;
} = {
  inlineCode: 'code',
  // eslint-disable-next-line react/display-name
  wrapper: ({children}: React.PropsWithChildren<{}>) =>
    React.createElement(React.Fragment, {}, children),
};

const DraftailCreateElement = forwardRef(
  (props: CreateElementProps, ref: Ref<{}>): JSX.Element => {
    const {
      components: propComponents,
      draftailType,
      originalType,
      parentName,
      ...rest
    } = props;

    const components = useDraftailComponents(propComponents as Components);

    const type = draftailType;
    const Component =
      components[`${parentName}.${type}`] ||
      components[type as string] ||
      DEFAULTS[type] ||
      originalType;

    if (propComponents) {
      return React.createElement(Component, {
        ref,
        ...rest,
        components: propComponents,
      });
    }

    return React.createElement(Component, {ref, ...rest});
  },
);

DraftailCreateElement.displayName = 'DraftailCreateElement';

export default function createElement(
  type: string,
  props: CreateElementProps,
): JSX.Element {
  const args = arguments;
  const draftailType = props && props.draftailType;

  if (typeof type === 'string' || draftailType) {
    const argsLength = args.length;

    const createElementArgArray: unknown[] = new Array(argsLength);
    createElementArgArray[0] = DraftailCreateElement;

    const newProps: {[name: string]: unknown} = {};

    for (let key in props) {
      if ({}.hasOwnProperty.call(props, key)) {
        newProps[key] = props[key];
      }
    }

    newProps.originalType = type;
    newProps[TYPE_PROP_NAME] = typeof type === 'string' ? type : draftailType;

    createElementArgArray[1] = newProps;

    for (let i = 2; i < argsLength; i++) {
      createElementArgArray[i] = args[i];
    }

    return React.createElement.apply(null, createElementArgArray as [
      typeof DraftailCreateElement,
      {[name: string]: unknown},
      keyof typeof args
    ]);
  }

  return React.createElement.apply(null, [type, {...props}]);
}

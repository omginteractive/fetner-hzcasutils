---
name: About
route: /
---

# HZ Core

HZ's library of [components], [hooks], and utilities for React!

### The Monorepo

The library is managed as a monorepo with code divided into separate packages.
This allows independent version management for the various implementations,
while allowing easy interdependency, development, and testing.

See [packages](#packages) below for more.

### These Docs

The Docs are organized differently from the underlying packages.
This allows some flexibility around how packages are managed and maintained.

For example, there could be a `useHover` hook documented under 'Hooks' and a
`Hoverable` component documented under 'Headless Components' that share an
underlying implementation and are published together in one behavior package.

Some documentation categories are described below.

---

## Headless Components

These are components that make use of [render props] to provide some state,
but do not provide any UI themselves.

## Hooks

These are React [hooks] that can be used to compose state and other React
features into custom components.

> **NOTE:**
> There may be equivalent [headless components] for many hooks, but it is
> recommended to favor hooks over their headless counterparts in most cases,
> as they generally have a smaller footprint, more flexibility, fewer gotchas,
> and (sometimes much) less boilerplate.

## Styled Components

These are components that are styled using [styled components].
They often have default UI styles and are typically [themable].
They're likely to be composed from other hzcore components or hooks.

## Utilities

These are general-purpose or just generally useful utilities.
Anything that doesn't fall under any of the other documentation
categories can go here.

---

## Packages

Packages are loosely categorized by their primary scope or domain.
Some package categories are described below.

### behaviors

These packages implement behaviors, i.e., hover states, pagination, etc.
They don't typically have much (if anything) in the way of styling or animation.

Components in this category are sometimes referred to as [headless components]
or [render prop components].

This category is also where the majority of hzcore [hooks] are likely
to be found, as hooks are very useful for encapsulating composable state,
a primary ingredient in any reusable behavior.

[components]: https://reactjs.org/docs/components-and-props.html
[hooks]: https://reactjs.org/docs/hooks-intro.html
[headless components]: https://medium.com/merrickchristensen/headless-user-interface-components-565b0c0f2e18
[render prop components]: https://cdb.reacttraining.com/use-a-render-prop-50de598f11ce
[render props]: https://cdb.reacttraining.com/use-a-render-prop-50de598f11ce
[styled components]: https://www.styled-components.com
[themable]: https://www.styled-components.com/docs/advanced#theming

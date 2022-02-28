---
name: useHover
menu: Hooks
route: /use-hover
---

# use-hover

The hook component to get the hover/focus event props for a component.
Use it any time you need to apply hover state to any functional component.
Returns a boolean to determine whether the element is being hovered and an
object with 2 event props:

```
  onMouseEnter
  onMouseLeave
```

#### To use (requires react v. 16.8+)

```js
import useHover from '@hzdg/use-hover';

function Box() {
    const [isHovering, hoverProps] = useHover({
        mouseEnterDelayMS: 50,
        mouseLeaveDelayMS: 50,
    });
    return (
        <div
            style={{
                background: isHovering ? 'black' : 'red',
                width: '200px',
                height: '200px',
            }}
            {...hoverProps}
        />
    );
}
```

#### Known Issues

`ERROR: Hooks can only be called inside the body of a function component.` First check React's [Invalid Hook Call Warning](https://reactjs.org/warnings/invalid-hook-call-warning.html) page first. Another possible solution would be to add the blow in your webpack config within resolve:

```
alias: {
    react: path.resolve('PATH/TO/MY/node_modules/react'),
},
```

If you're using GatsbyJS, you can add the below in `gatsby-node.js`:

```
exports.onCreateWebpackConfig = ({stage, actions}) => {
  actions.setWebpackConfig({
    resolve: {
      alias: {
        react: path.resolve('../node_modules/react'),
      },
    },
  });
};
```

More info found in https://github.com/facebook/react/issues/13991

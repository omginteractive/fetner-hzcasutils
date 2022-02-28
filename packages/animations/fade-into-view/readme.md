**STATE**

| State name | Type | Default | Description |
|-|-|-|-|
| isRest | boolean | False | Determines if the component has completed animation
| activate | boolean | False | Determines if the component is active to animate

**HANDLERS**

Along with Props and State, below are handlers that will also be passed:

| Handler name | Type | Default | Description |
|-|-|-|-|
| setActive | function(activate: boolean) | null | Handler to set FadeIntoView as active/inactive |


<hr />

All possible arguments sent to render prop:
```jsx static
const myContent = ({
    direction,
    render, // TODO: This should be omitted
    offsetPosition,
    activate,
    isRest,
    setActive}) => {
    // ...
};

<FadeIntoView direction="Up" render={myContent} />
```

A simple Example using `isRest` to update content.
```js
    const myContent = ({isRest}) => (
        <div>
            {isRest ? 'Done!': 'Moving... wait for it...'}
        </div>
    );
    <FadeIntoView
        direction="Up"
        activate={true}
        render={myContent}
    />
```


An example using the fade out action.
```js

    const buttonStyle = {
        boxShadow: 'rgba(0, 0, 0, 0.12) 0px 1px 6px, rgba(0, 0, 0, 0.12) 0px 1px 4px',
        borderRadius: 2,
        backgroundColor: '#f38230',
        display: 'inline-block',
        padding: '13px 20px',
        margin: '20px 0',
        color: '#fff',
        fontFamily: 'Helvetica, Arial',
        fontSize: '13px',
        textTransform: 'uppercase',
        fontWeight: '100',
    };

    const contentStyle = {
        display: 'inline-block',
        padding: 10
    };


    // Create base button to trigger hide
    const buttonHider = ({setHover}) => (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={buttonStyle}
        >
            Hover to Hide
        </div>
    );

    // Create the general content for the fade in view
    const myContent = ({setActive}) =>
        <div style={contentStyle}>
            <div><a href="http://www.google.com">Google</a></div>
            <Button
                onHoverChange={() => setActive(false)}
                render={buttonHider}
            />
        </div>;

    <FadeIntoView
        direction="Left"
        offsetPosition={200}
        activate={true}
        render={myContent}
    />

```

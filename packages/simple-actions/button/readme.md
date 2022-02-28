Simple button.

```js
const renderButton = ({hover, setHover}) =>
  <div
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {hover ? 'Press' : 'Hover'} me!
  </div>;

<Button render={renderButton} />
```

### Styles
There are a few ways to add styles to this component

#### Adding Styles with CSS Stylesheet
File: [mystyles.css](../packages/hz-button/src/styles/mystyles.css)
```js
require('./src/styles/mystyles.css');

const renderButtonWithClassName = ({hover, setHover}) =>
  <div
    className="RedButton__base"
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {hover ? 'Press' : 'Hover'} me!
  </div>;

<Button render={renderButtonWithClassName} />
```

#### Adding Styles with Inline Styling
```js
const renderButton = ({hover, setHover}) =>
  <div
    style={{border: '3px solid', borderColor: hover ? 'red' : 'blue'}}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {hover ? 'Press' : 'Hover'} me!
  </div>;

<Button render={renderButton} />
```

#### Adding Styles with CSS Modules

```js
const myCssModulesStyles = require('./src/styles/mystyles.css');

const renderButtonWithCssModule = ({hover, setHover}) =>
  <div
    className={myCssModulesStyles.buttonBase}
    onMouseEnter={() => setHover(true)}
    onMouseLeave={() => setHover(false)}
  >
    {hover ? 'Press' : 'Hover'} me!
  </div>;

<Button render={renderButtonWithCssModule} />
```

#### TODO

We may want to ship variants that make it easier to get up and running
in common scenarios. For example:

```js static
// @flow
import {Component} from 'react';

type DomButtonPropTypes = {
  render: (props: {hover: boolean}) => Element<*>,
};

class DomButton extends Component<DomButtonPropTypes> {
  renderButton = ({setHover, ...props}) => {
    const {render, ...domRenderProps} = this.props;
    const element = render({...props, ...domRenderProps});
    return React.cloneElement(element, {
      onMouseEnter: () => {
        setHover(true);
      },
      onMouseLeave: () => {
        setHover(false);
      },
    });
  };

  render() {
    return <Button render={this.renderButton} />;
  }
}

<DomButton render={({hover}) => <span>{`hovering? ${hover}`}</span>} />
```

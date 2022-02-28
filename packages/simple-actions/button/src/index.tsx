import React, {Component} from 'react';

export interface State {
  hover: boolean;
}

export interface Props {
  /**
   * A callback for handling Button hover state changes.
   * This may be useful (for example) for synchronizing
   * external state with the Button's hover state.
   */
  onHoverChange?: (value: boolean) => void;
  /**
   * The Button 'render prop'. This should take `RenderProps`
   * as it's only argument, and return a valid React Element.
   */
  render: (props: RenderProps) => JSX.Element;
}

export type RenderProps = State & {
  /**
   * A callback for updating Button hover state.
   */
  setHover: (value: boolean) => void;
};

/**
 * A normal button component
 */
class Button extends Component<Props, State> {
  state = {
    hover: false,
  };

  componentDidUpdate(_: any, prevState: State) {
    if (
      typeof this.props.onHoverChange === 'function' &&
      prevState.hover !== this.state.hover
    ) {
      this.props.onHoverChange(this.state.hover);
    }
  }

  handleSetHover = (hover: boolean) => {
    this.setState(
      (state: State): State | null => {
        if (hover === state.hover) return null;
        return {...state, hover};
      },
    );
  };

  render() {
    // Extract the Button props (render and change handlers).
    // Pass all other props through to the render prop
    // along with Button state and callbacks.
    // eslint-disable-next-line no-unused-vars
    const {onHoverChange: _, render, ...props} = this.props;
    return render({
      ...props,
      ...this.state,
      setHover: this.handleSetHover,
    });
  }
}

export default Button;

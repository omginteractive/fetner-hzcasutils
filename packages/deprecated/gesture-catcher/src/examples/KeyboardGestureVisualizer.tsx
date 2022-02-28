import React from 'react';
import {useKeyboardGesture} from '@hzdg/gesture-catcher';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import GestureConfigurator, {
  useGestureConfigurator,
} from './components/GestureConfigurator';

interface KeyboardGestureVisualizerProps {
  children?: React.ReactNode;
}

export default function KeyboardGestureVisualizer({
  children,
}: KeyboardGestureVisualizerProps): JSX.Element {
  const [gestureHandler, gesturePlotProps] = useGestureVisualizer(
    'Keyboard Event',
  );
  const [gestureConfig, gestureConfiguratorProps] = useGestureConfigurator();
  const ref = useKeyboardGesture(gestureHandler, gestureConfig);
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <div ref={ref} tabIndex={0}>
      <GestureVisualizer {...gesturePlotProps}>{children}</GestureVisualizer>
      <GestureConfigurator {...gestureConfiguratorProps} />
    </div>
  );
}

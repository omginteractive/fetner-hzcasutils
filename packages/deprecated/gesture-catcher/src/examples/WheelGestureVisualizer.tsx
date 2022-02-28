import React from 'react';
import {useWheelGesture} from '@hzdg/gesture-catcher';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import GestureConfigurator, {
  useGestureConfigurator,
} from './components/GestureConfigurator';

interface TouchGestureVisualizerProps {
  children?: React.ReactNode;
}

export default function WheelGestureVisualizer({
  children,
}: TouchGestureVisualizerProps): JSX.Element {
  const [gestureHandler, gesturePlotProps] = useGestureVisualizer(
    'Wheel Event',
  );
  const [gestureConfig, gestureConfiguratorProps] = useGestureConfigurator();
  const ref = useWheelGesture(gestureHandler, gestureConfig);
  return (
    <div ref={ref}>
      <GestureVisualizer {...gesturePlotProps}>{children}</GestureVisualizer>
      <GestureConfigurator {...gestureConfiguratorProps} />
    </div>
  );
}

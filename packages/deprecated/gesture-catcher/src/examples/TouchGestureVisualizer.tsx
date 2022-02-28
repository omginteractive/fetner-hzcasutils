import React from 'react';
import {useTouchGesture} from '@hzdg/gesture-catcher';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import GestureConfigurator, {
  useGestureConfigurator,
} from './components/GestureConfigurator';

interface TouchGestureVisualizerProps {
  children?: React.ReactNode;
}
export default function TouchGestureVisualizer({
  children,
}: TouchGestureVisualizerProps): JSX.Element {
  const [gestureHandler, gesturePlotProps] = useGestureVisualizer(
    'Touch Event',
  );
  const [gestureConfig, gestureConfiguratorProps] = useGestureConfigurator();
  const ref = useTouchGesture(gestureHandler, gestureConfig);
  return (
    <div ref={ref}>
      <GestureVisualizer {...gesturePlotProps}>{children}</GestureVisualizer>
      <GestureConfigurator {...gestureConfiguratorProps} />
    </div>
  );
}

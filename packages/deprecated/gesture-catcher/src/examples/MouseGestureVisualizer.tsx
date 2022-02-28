import React from 'react';
import {useMouseGesture} from '@hzdg/gesture-catcher';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import GestureConfigurator, {
  useGestureConfigurator,
} from './components/GestureConfigurator';

interface MouseGestureVisualizerProps {
  children?: React.ReactNode;
}

export default function MouseGestureVisualizer({
  children,
}: MouseGestureVisualizerProps): JSX.Element {
  const [gestureHandler, gesturePlotProps] = useGestureVisualizer(
    'Mouse Event',
  );
  const [gestureConfig, gestureConfiguratorProps] = useGestureConfigurator();
  const ref = useMouseGesture(gestureHandler, gestureConfig);
  return (
    <div ref={ref}>
      <GestureVisualizer {...gesturePlotProps}>{children}</GestureVisualizer>
      <GestureConfigurator {...gestureConfiguratorProps} />
    </div>
  );
}

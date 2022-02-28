import React, {useCallback, useState, Fragment} from 'react';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import ThrottleConfigurator, {
  useThrottleConfigurator,
} from './ThrottleConfigurator';
import useThrottledCallback from '../src';

export default function ThrottleVisualizer(): JSX.Element {
  const [paused, setPaused] = useState(false);
  const [config, configuratorProps] = useThrottleConfigurator({
    leading: true,
    trailing: true,
    wait: 16,
  });
  const [visualizerHandlers, visualizerProps] = useGestureVisualizer(
    'Events',
    'Throttled Events',
  );

  const handleClick = useCallback(() => {
    setPaused(isPaused => {
      if (isPaused) visualizerProps.onClick();
      return !isPaused;
    });
  }, [setPaused, visualizerProps]);

  const handleInputThrottled = useThrottledCallback(
    visualizerHandlers.onMove,
    config,
    [visualizerHandlers, config],
  );

  const handleInput = useCallback(
    e => {
      e.persist();
      visualizerHandlers.onInput(e);
      handleInputThrottled(e);
    },
    [visualizerHandlers, handleInputThrottled],
  );

  return (
    <Fragment>
      <div onMouseMove={paused ? undefined : handleInput}>
        <GestureVisualizer
          discrete
          withCount
          data={visualizerProps.data}
          onClick={handleClick}
        >
          <p style={{color: 'lightgray'}}>Move mouse around!</p>
          <p style={{color: 'lightgray'}}>
            Click to {paused ? 'reset' : 'pause'}
          </p>
        </GestureVisualizer>
      </div>
      <ThrottleConfigurator {...configuratorProps} />
    </Fragment>
  );
}

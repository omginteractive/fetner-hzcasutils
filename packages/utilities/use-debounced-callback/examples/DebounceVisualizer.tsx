import React, {useCallback, useState, Fragment} from 'react';
import GestureVisualizer, {useGestureVisualizer} from 'gesture-visualizer';
import DebounceConfigurator, {
  useDebouceConfigurator,
} from './DebounceConfigurator';
import useDebouncedCallback from '../src';

export default function DebounceVisualizer(): JSX.Element {
  const [paused, setPaused] = useState(false);
  const [config, configuratorProps] = useDebouceConfigurator({
    trailing: true,
    wait: 16,
  });
  const [visualizerHandlers, visualizerProps] = useGestureVisualizer(
    'Events',
    'Debounced Events',
  );

  const handleClick = useCallback(() => {
    setPaused(isPaused => {
      if (isPaused) visualizerProps.onClick();
      return !isPaused;
    });
  }, [setPaused, visualizerProps]);

  const handleInputDebounced = useDebouncedCallback(
    visualizerHandlers.onMove,
    config,
    [visualizerHandlers, config],
  );

  const handleInput = useCallback(
    e => {
      e.persist();
      visualizerHandlers.onInput(e);
      handleInputDebounced(e);
    },
    [visualizerHandlers, handleInputDebounced],
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
      <DebounceConfigurator {...configuratorProps} />
    </Fragment>
  );
}

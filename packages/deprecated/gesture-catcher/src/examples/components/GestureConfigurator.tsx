import React, {useReducer, useCallback, useMemo} from 'react';
import {GestureConfig, Orientation} from '@hzdg/gesture-catcher';

export interface GestureConfiguratorProps {
  config: GestureConfig;
  onChange: React.ChangeEventHandler;
}

function reduceGestureConfig(
  state: GestureConfig,
  event: React.ChangeEvent<HTMLInputElement>,
): GestureConfig {
  const target = event.target as HTMLInputElement;
  switch (target.id) {
    case 'orientation': {
      let orientation:
        | typeof Orientation.HORIZONTAL
        | typeof Orientation.VERTICAL
        | undefined;
      switch (target.value) {
        case Orientation.HORIZONTAL: {
          orientation = Orientation.HORIZONTAL;
          break;
        }
        case Orientation.VERTICAL: {
          orientation = Orientation.VERTICAL;
          break;
        }
      }
      if (orientation !== state.orientation) {
        return {
          ...state,
          orientation,
          threshold:
            orientation && state.threshold != null
              ? Math.max(1, state.threshold)
              : state.threshold,
        };
      }
      break;
    }
    case 'threshold': {
      const threshold = parseInt(target.value, 10);
      if (threshold !== state.threshold) {
        return {...state, threshold};
      }
      break;
    }
    case 'cancelThreshold': {
      const cancelThreshold = parseInt(target.value, 10);
      if (cancelThreshold !== state.cancelThreshold) {
        return {...state, cancelThreshold};
      }
      break;
    }
    case 'preventDefault': {
      const preventDefault = target.checked;
      if (preventDefault !== state.preventDefault) {
        return {...state, preventDefault};
      }
      break;
    }
    case 'passive': {
      const passive = target.checked;
      if (passive !== state.passive) {
        return {...state, passive};
      }
      break;
    }
  }
  return state;
}

export function useGestureConfigurator(
  initialConfig: GestureConfig = {
    preventDefault: true,
    passive: false,
    threshold: 3,
    cancelThreshold: 0,
  },
): [
  GestureConfig,
  {config: GestureConfig; onChange: React.ChangeEventHandler},
] {
  const [config, dispatch] = useReducer(reduceGestureConfig, initialConfig);
  const onChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      event.persist();
      dispatch(event);
    },
    [dispatch],
  );
  const props = useMemo(() => ({config, onChange}), [config, onChange]);
  return [config, props];
}

function Label({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div style={{margin: '0 1em'}}>
      <label htmlFor={label} style={{marginRight: '1em'}} title={description}>
        {label}
      </label>
      {children}
    </div>
  );
}

export default function GestureConfigurator({
  config,
  onChange,
}: GestureConfiguratorProps): JSX.Element {
  return (
    <form
      style={{
        display: 'grid',
        justifyContent: 'space-between',
        gridTemplateColumns: 'repeat(auto-fill, minmax(max-content, 168px))',
      }}
    >
      <Label
        label="preventDefault"
        description="Whether or not to prevent the default action for events during a gesture"
      >
        <input
          id="preventDefault"
          type="checkbox"
          checked={config.preventDefault}
          onChange={onChange}
        />
      </Label>
      <Label
        label="passive"
        description="Whether or not to listen to events passively. If `true`, then `preventDefault` will have no effect."
      >
        <input
          id="passive"
          type="checkbox"
          checked={config.passive}
          onChange={onChange}
        />
      </Label>
      <Label
        label="threshold"
        description="How 'far' a series of events must cumulatively move in a consistent direction before a gesture is detected."
      >
        <input
          id="threshold"
          type="number"
          min={0}
          value={config.threshold}
          onChange={onChange}
        />
      </Label>
      <Label
        label="orientation"
        description="The orientation in which a series of events can move in order to be considered part of a gesture."
      >
        {/* eslint-disable-next-line jsx-a11y/no-onchange */}
        <select id="orientation" value={config.orientation} onChange={onChange}>
          <option value={undefined}>{''}</option>
          <option value={Orientation.HORIZONTAL}>
            {Orientation.HORIZONTAL}
          </option>
          <option value={Orientation.VERTICAL}>{Orientation.VERTICAL}</option>
        </select>
      </Label>
      {config.orientation && (
        <Label
          label="cancelThreshold"
          description="For a gesture with an `orientation` (i.e., 'horizontal' or 'vertical'), this is the threshold for gesture distance in the _opposing_ orientation that will be tolerated before a gesture is 'canceled'. Once a gesture is canceled, a gesture in the configured orientation will not be recognized until the canceled gesture ends."
        >
          <input
            id="cancelThreshold"
            type="number"
            min={0}
            value={config.cancelThreshold}
            onChange={onChange}
          />
        </Label>
      )}
    </form>
  );
}

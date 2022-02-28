import React, {useReducer, useCallback, useMemo} from 'react';
import {DebounceOptions} from '../src';

export interface DebounceConfiguratorProps {
  config: DebounceOptions;
  onChange: React.ChangeEventHandler;
}

function reduceGestureConfig(
  state: DebounceOptions,
  event: React.ChangeEvent<HTMLInputElement>,
): DebounceOptions {
  const target = event.target as HTMLInputElement;
  switch (target.id) {
    case 'wait': {
      const wait = parseInt(target.value, 10);
      if (wait !== state.wait) {
        return {...state, wait};
      }
      break;
    }
    case 'maxWait': {
      const maxWait = parseInt(target.value, 10) || false;
      if (maxWait !== state.maxWait) {
        return {...state, maxWait};
      }
      break;
    }
    case 'leading': {
      const leading = target.checked;
      if (leading !== state.leading) {
        return {...state, leading};
      }
      break;
    }
    case 'trailing': {
      const trailing = target.checked;
      if (trailing !== state.trailing) {
        return {...state, trailing};
      }
      break;
    }
  }
  return state;
}

export function useDebouceConfigurator(
  initialConfig: DebounceOptions = {
    wait: 0,
    maxWait: false,
    leading: false,
    trailing: true,
  },
): [
  DebounceOptions,
  {config: DebounceOptions; onChange: React.ChangeEventHandler},
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

export default function DebounceConfigurator({
  config,
  onChange,
}: DebounceConfiguratorProps): JSX.Element {
  return (
    <form
      style={{
        display: 'grid',
        justifyContent: 'space-between',
        gridTemplateColumns: 'repeat(auto-fill, minmax(max-content, 168px))',
      }}
    >
      <Label
        label="leading"
        description="Invoke the callback before debouncing"
      >
        <input
          id="leading"
          type="checkbox"
          checked={config.leading}
          onChange={onChange}
        />
      </Label>
      <Label
        label="trailing"
        description="Invoke the callback after debouncing"
      >
        <input
          id="trailing"
          type="checkbox"
          checked={config.trailing}
          onChange={onChange}
        />
      </Label>
      <Label
        label="wait"
        description="The amount of time (in ms) to wait before allowing the callback to be invoked"
      >
        <input
          id="wait"
          type="number"
          min={0}
          value={config.wait}
          onChange={onChange}
        />
      </Label>
      <Label
        label="maxWait"
        description="The maximum amount of time (in ms) to wait before allowing the callback to be invoked"
      >
        <input
          id="maxWait"
          type="number"
          min={config.wait}
          value={config.maxWait === false ? undefined : config.maxWait}
          onChange={onChange}
        />
      </Label>
    </form>
  );
}

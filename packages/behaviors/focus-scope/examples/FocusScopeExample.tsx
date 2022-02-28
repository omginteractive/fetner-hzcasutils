import React, {useState, useContext, createContext} from 'react';

const ActiveSetter = createContext<(value: boolean) => void>(() => {});

export function Activate() {
  const setActive = useContext(ActiveSetter);
  return <button onClick={() => setActive(true)}>activate</button>;
}

export function Deactivate() {
  const setActive = useContext(ActiveSetter);
  return <button onClick={() => setActive(false)}>deactivate</button>;
}

export default function FocusScopeExample(props: React.PropsWithChildren<{}>) {
  const [active, setActive] = useState(false);
  return (
    <ActiveSetter.Provider value={setActive}>
      <Activate />
      {active && (
        <div style={{margin: '1em', padding: '1em', background: '#00000020'}}>
          {props.children}
        </div>
      )}
    </ActiveSetter.Provider>
  );
}

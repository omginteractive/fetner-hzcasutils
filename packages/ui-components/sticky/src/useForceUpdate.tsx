import {useState, useCallback} from 'react';

/**
 * `useForceUpdate` will return a callback that, when called,
 * will force the calling component to rerender.
 */
export default function useForceUpdate(): () => void {
  const [, flipUpdateBit] = useState(false);
  return useCallback(() => {
    flipUpdateBit(v => !v);
  }, []);
}

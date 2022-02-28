import {useState} from 'react';

import * as Types from './types';

export type ReturnedHoverProps = Types.ReturnedHoverProps;
export type Props = Types.Props;

export default function useHover({
  mouseEnterDelayMS = 0,
  mouseLeaveDelayMS = 0,
}: Props = {}): [boolean, ReturnedHoverProps] {
  const [isHovering, setIsHovering] = useState(false);

  let mouseEnterTimer: NodeJS.Timeout;
  let mouseOutTimer: NodeJS.Timeout;

  const hoverProps = {
    onMouseEnter: () => {
      clearTimeout(mouseOutTimer);
      mouseEnterTimer = setTimeout(
        () => setIsHovering(true),
        mouseEnterDelayMS,
      );
    },
    onMouseLeave: () => {
      clearTimeout(mouseEnterTimer);
      mouseOutTimer = setTimeout(() => setIsHovering(false), mouseLeaveDelayMS);
    },
  };

  return [isHovering, hoverProps];
}

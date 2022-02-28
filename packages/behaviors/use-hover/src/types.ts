export type ReturnedHoverProps = {
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export type Props = {
  mouseEnterDelayMS?: number;
  mouseLeaveDelayMS?: number;
};

import {useState} from 'react';
import {useWindowSize} from '@hzdg/windowsize-monitor';

/**
 * Default ratio set to 16:9
 */
const DEFAULT_RATIO = 0.5625;

/**
 * The width and height of a container
 */
export interface RatioSizeProps {
  width: number | string;
  height: number | string;
}

/**
 * An object representing a responsive size alternative for a
 * given breakpoint.
 */
export interface ResponsiveBreakProps {
  breakpoint: number;
  ratioSize: RatioSizeProps;
}

/**
 * Optional optionsuration options for calculating the container size
 */
export interface RatioSizeOptionsProps {
  responsiveBreaks?: ResponsiveBreakProps[];
  ratio?: number;
  containerRef?: () => {
    current: {offsetWidth: number | null; offsetHeight: number | null} | null;
  } | null;
}

/**
 * Ratio size props
 */
export interface UseRatioProps {
  initialState?: RatioSizeProps | null;
  options?: RatioSizeOptionsProps | null;
}

/**
 * Replaces the calculated container size with any passed in
 * responsive size overrides from options. Breakpoints are
 * applied mobile-first.
 * @param ratioSize
 * @param responsiveBreaks
 */
const setResponsive = ({
  ratioSize,
  responsiveBreaks,
  containerSize,
}: {
  ratioSize: RatioSizeProps;
  responsiveBreaks?: ResponsiveBreakProps[];
  containerSize: RatioSizeProps;
}): RatioSizeProps => {
  if (!responsiveBreaks || typeof window === 'undefined') return ratioSize;
  let newRatioSize = ratioSize;

  // Shuffle responsive breakpoints from highest to lowest
  const sortedResponsiveBreaks = responsiveBreaks.sort((a, b) =>
    a.breakpoint > b.breakpoint ? -1 : 1,
  );

  for (const i in sortedResponsiveBreaks) {
    if (sortedResponsiveBreaks[i].breakpoint <= containerSize.width) {
      newRatioSize = sortedResponsiveBreaks[i].ratioSize;
    }
  }
  return newRatioSize;
};

/**
 * Calculates the size for the container based on a given (or default)
 * ratio and the current window viewport size
 * @param options optionsuration ratio size
 */
const calculateRatioSizes = (
  windowSize: RatioSizeProps | null,
  options: RatioSizeOptionsProps | null,
): RatioSizeProps => {
  let containerWidth = 0;
  let containerHeight = 0;
  const defaultWindowSize = {width: 0, height: 0};
  if (typeof window === 'undefined') return defaultWindowSize;
  /**
   * Determine whether to use window viewport size (default) or
   * passed in container size
   */
  if (options && options.containerRef) {
    const parentRef = options.containerRef();
    if (
      parentRef &&
      parentRef.current &&
      parentRef.current.offsetWidth !== null &&
      parentRef.current.offsetHeight !== null
    ) {
      containerWidth = parentRef.current.offsetWidth;
      containerHeight = parentRef.current.offsetHeight;
    } else {
      throw new Error(`
        Error: Provided containerRef does not provide a width and height for useRatioSize. Please see example in docs.
      `);
    }
  } else {
    const currWindowSize = windowSize ? windowSize : defaultWindowSize;
    if (currWindowSize && currWindowSize.width && currWindowSize.height) {
      containerWidth =
        typeof currWindowSize.width === 'number'
          ? currWindowSize.width
          : parseInt(currWindowSize.width);
      containerHeight =
        typeof currWindowSize.height === 'number'
          ? currWindowSize.height
          : parseInt(currWindowSize.height);
    } else {
      throw new Error(`
        Error: Window size cannot be calculated for useRatioSize.
      `);
    }
  }

  const ratio = options
    ? options.ratio
      ? options.ratio
      : DEFAULT_RATIO
    : DEFAULT_RATIO;
  let calculatedWidth = 0;
  let calculatedHeight = 0;
  if (containerHeight / containerWidth <= ratio) {
    calculatedWidth = containerWidth;
    calculatedHeight = Math.ceil(containerWidth * ratio);
  } else {
    calculatedWidth = Math.ceil(containerHeight / ratio);
    calculatedHeight = containerHeight;
  }
  return setResponsive({
    ratioSize: {
      width: calculatedWidth,
      height: calculatedHeight,
    },
    responsiveBreaks: options ? options.responsiveBreaks : [],
    containerSize: {width: containerWidth, height: containerHeight},
  });
};

/**
 * Hook that calculates the width and height for a given ratio
 */
export default function useRatioSize(
  settings: UseRatioProps | void,
): [RatioSizeProps, (windowSize: RatioSizeProps) => void] {
  const baseInitialState = {width: 0, height: 0};
  const initialState =
    settings && settings.initialState
      ? settings.initialState
      : baseInitialState;
  const options = settings && settings.options ? settings.options : null;

  const [ratioSize, setRatioSize] = useState(() => {
    return initialState || calculateRatioSizes(null, options);
  });

  const updateRatioSize = (windowSize: RatioSizeProps): void => {
    setRatioSize(calculateRatioSizes(windowSize, options));
  };

  useWindowSize(updateRatioSize, {throttleMs: 400});

  return [ratioSize, updateRatioSize];
}

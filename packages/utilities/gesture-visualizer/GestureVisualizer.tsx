import React, {
  forwardRef,
  useReducer,
  useCallback,
  useEffect,
  useState,
  useMemo,
} from 'react';
import {ScaleLinear, ScaleOrdinal} from 'd3-scale';
import {ScaleSVG} from '@vx/responsive';
import {scaleLinear, scaleOrdinal} from '@vx/scale';
import {schemeTableau10} from 'd3-scale-chromatic';
import useRefCallback from '@hzdg/use-ref-callback';
import MovingAverage from '@hzdg/moving-average';
import useSize from '@hzdg/use-size';
import {
  GestureState,
  GestureEndState,
  GestureEventSourceState,
} from '@hzdg/gesture-catcher';
import TooltipArea, {TooltipContent} from './TooltipArea';
import EventAreas from './EventAreas';
import EventLines from './EventLines';
import Legend from './Legend';

interface VisualizerHandler {
  (e: TimeStampedObject): void;
}

export interface VisualizerHandlers {
  onStart: VisualizerHandler;
  onMove: VisualizerHandler;
  onEnd: VisualizerHandler;
  onInput: VisualizerHandler;
  __debug: VisualizerHandler;
}

export interface MovingAverageSnapshot {
  readonly value: number;
  readonly average: number;
  readonly deviation: number;
}

export interface SnapshotState {
  readonly gesturing?: boolean;
  readonly intentional?: boolean;
  readonly blocked?: boolean;
  readonly canceled?: boolean;
}

export interface Snapshot {
  readonly eventType: string;
  readonly timeStamp: number;
  readonly delta: number;
  readonly state?: SnapshotState;
  readonly x?: number | MovingAverageSnapshot;
  readonly y?: number | MovingAverageSnapshot;
  readonly v?: number | MovingAverageSnapshot;
}

export interface GestureVisualizerState {
  readonly id: string;
  readonly continuous: boolean;
  readonly data: Snapshot[];
  readonly initialTimeStamp: number;
  readonly lastTimeStamp: number;
}

export interface GestureVisualizerProps {
  data: GestureVisualizerState | GestureVisualizerState[];
  withCount?: boolean;
  discrete?: boolean;
  onClick?: React.EventHandler<React.MouseEvent>;
  children?: React.ReactNode;
}

type TimeStampedObject =
  | {timeStamp: number; delta: number}
  | GestureState
  | GestureEndState
  | GestureEventSourceState
  | WheelEvent
  | React.WheelEvent
  | MouseEvent
  | React.MouseEvent
  | TouchEvent
  | React.TouchEvent
  | KeyboardEvent
  | React.KeyboardEvent;

type Mutable<T> = {
  -readonly [P in keyof T]: T[P];
};

const INITIAL_TIME_SCALE = 100;
const PADDING_HORIZONTAL = 0.0;
const PADDING_VERTICAL = 0.1618;

const ADD_SNAPSHOT = 'ADD_SNAPSHOT';
const RESET = 'RESET';

interface AddSnapshotAction {
  type: typeof ADD_SNAPSHOT;
  payload: Snapshot;
}

interface ResetAction {
  type: typeof RESET;
  payload: {id: string; continuous: boolean};
}

function timeExtent(
  series: GestureVisualizerState[],
  minDuration: number,
): Readonly<[number, number]> {
  const result = [0, 0] as [number, number];
  for (const {initialTimeStamp, lastTimeStamp} of series) {
    result[0] = initialTimeStamp
      ? result[0]
        ? Math.min(result[0], initialTimeStamp)
        : initialTimeStamp
      : result[0];
    result[1] = Math.max(result[1] || result[0] + minDuration, lastTimeStamp);
  }
  return result;
}

function useGestureSeries(
  data: GestureVisualizerState | GestureVisualizerState[],
): GestureVisualizerState[] {
  const [allSeries, setAllSeries] = useState(() =>
    Array.isArray(data) ? data : [data],
  );
  useEffect(
    () => {
      setAllSeries(Array.isArray(data) ? data : [data]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    Array.isArray(data) ? data : [data],
  );
  return allSeries;
}

function useTimeStampScale(
  allSeries: GestureVisualizerState[],
  width: number,
): ScaleLinear<number, number> {
  const [start, end] = timeExtent(allSeries, INITIAL_TIME_SCALE);
  const [timeStampScale] = useState(() => scaleLinear<number>({clamp: true}));
  useMemo(() => {
    timeStampScale.range([
      Math.round(width * PADDING_HORIZONTAL),
      width - Math.round(width * PADDING_HORIZONTAL),
    ]);
    timeStampScale.domain([start, end]);
  }, [timeStampScale, width, start, end]);
  return timeStampScale;
}

function useDeltaScale(
  allSeries: GestureVisualizerState[],
  height: number,
  yFactor: ScaleLinear<number, number>,
): ScaleLinear<number, number> {
  const [deltaScale] = useState(() => scaleLinear<number>({clamp: true}));
  useMemo(() => {
    deltaScale.range([
      Math.round(height * PADDING_VERTICAL),
      height - Math.round(height * PADDING_VERTICAL),
    ]);
    deltaScale.domain([1, height * yFactor(allSeries.length - 1)]);
  }, [deltaScale, height, allSeries.length, yFactor]);
  return deltaScale;
}

function usePowerScale(
  allSeries: GestureVisualizerState[],
): ScaleLinear<number, number> {
  const [factor] = useState(() => scaleLinear<number>({clamp: true}));
  useMemo(() => {
    factor.range([allSeries.length, 1]);
    factor.domain([0, allSeries.length - 1]);
  }, [factor, allSeries.length]);
  return factor;
}

function useColorScale(
  allSeries: GestureVisualizerState[],
): ScaleOrdinal<string, string> {
  const [colorScale] = useState(() =>
    scaleOrdinal<string, string>({range: schemeTableau10}),
  );
  useMemo(() => {
    colorScale.domain(allSeries.map(({id}) => String(id)));
  }, [colorScale, allSeries]);
  return colorScale;
}

const takeEventTypeSnapshot = (obj: TimeStampedObject): string => {
  if ('type' in obj) return obj.type;
  if ('event' in obj && obj.event) return obj.event.type;
  return 'unknown';
};

const takeStateSnapshot = (
  obj: TimeStampedObject,
): SnapshotState | undefined => {
  if ('gesturing' in obj || 'blocked' in obj || 'canceled' in obj) {
    const snapshot = {} as Mutable<SnapshotState>;
    if ('gesturing' in obj) {
      snapshot.gesturing = Boolean(obj.gesturing);
    }
    if ('intentional' in obj) {
      snapshot.intentional = Boolean(obj.intentional);
    }
    if ('blocked' in obj) {
      snapshot.blocked = Boolean(obj.blocked);
    }
    if ('canceled' in obj) {
      snapshot.canceled = Boolean(obj.canceled);
    }
    return snapshot;
  }
};

const absMax = (a: number, b: number): number =>
  Math.max(Math.abs(a), Math.abs(b));

const takeDeltaSnapshot = (obj: TimeStampedObject): number => {
  if ('delta' in obj) return obj.delta;
  if ('event' in obj && obj.event) obj = obj.event;
  if ('deltaX' in obj) return absMax(obj.deltaX, obj.deltaY);
  if ('movementX' in obj) return absMax(obj.movementX, obj.movementY);
  if ('xVelocity' in obj) return absMax(obj.xVelocity, obj.yVelocity);
  return 0;
};

const takeMovingAverageSnapshot = (
  obj: MovingAverage,
): MovingAverageSnapshot => ({
  value: Math.round(obj.peek() * 100) / 100,
  average: Math.round(obj.value * 100) / 100,
  deviation: Math.round(obj.deviation * 100) / 100,
});

const takeXSnapshot = (
  obj: TimeStampedObject,
): number | MovingAverageSnapshot | undefined =>
  'x' in obj
    ? typeof obj.x === 'number'
      ? obj.x
      : takeMovingAverageSnapshot(obj.x)
    : undefined;

const takeYSnapshot = (
  obj: TimeStampedObject,
): number | MovingAverageSnapshot | undefined =>
  'y' in obj
    ? typeof obj.y === 'number'
      ? obj.y
      : takeMovingAverageSnapshot(obj.y)
    : undefined;

const takeVSnapshot = (
  obj: TimeStampedObject,
): MovingAverageSnapshot | undefined =>
  'v' in obj ? takeMovingAverageSnapshot(obj.v) : undefined;

const takeTimeStampSnapshot = (obj: TimeStampedObject): number =>
  Math.round(
    'timeStamp' in obj
      ? obj.timeStamp
      : 'time' in obj
      ? obj.time
      : 'event' in obj && obj.event
      ? obj.event.timeStamp
      : 0,
  );

const takeSnapshot = (obj: TimeStampedObject): Snapshot => {
  return {
    eventType: takeEventTypeSnapshot(obj),
    timeStamp: takeTimeStampSnapshot(obj),
    state: takeStateSnapshot(obj),
    delta: takeDeltaSnapshot(obj),
    x: takeXSnapshot(obj),
    y: takeYSnapshot(obj),
    v: takeVSnapshot(obj),
  };
};

const reduceGestureVisualizerState = (
  state: GestureVisualizerState,
  action: AddSnapshotAction | ResetAction,
): GestureVisualizerState => {
  switch (action.type) {
    case RESET: {
      return {
        id: action.payload.id,
        continuous: action.payload.continuous,
        data: [],
        initialTimeStamp: 0,
        lastTimeStamp: 0,
      };
    }
    case ADD_SNAPSHOT: {
      if (!state.initialTimeStamp) {
        const initialTimeStamp = action.payload.timeStamp;
        return {
          ...state,
          data: [action.payload],
          initialTimeStamp,
          lastTimeStamp: initialTimeStamp,
        };
      } else {
        state.data.push(action.payload);
        return {
          ...state,
          lastTimeStamp: action.payload.timeStamp,
        };
      }
    }
  }
};

function useGestureData(
  id: string,
  continuous?: boolean,
): [GestureVisualizerState, (obj: TimeStampedObject) => void] {
  const [state, dispatch] = useReducer(
    reduceGestureVisualizerState,
    null,
    () => ({
      id,
      continuous: Boolean(continuous),
      initialTimeStamp: 0,
      lastTimeStamp: 0,
      data: [],
    }),
  );

  useEffect(() => {
    if (id != null) {
      dispatch({type: RESET, payload: {id, continuous: Boolean(continuous)}});
    }
  }, [id, continuous]);

  const handleEvent = useCallback((obj: TimeStampedObject) => {
    dispatch({type: ADD_SNAPSHOT, payload: takeSnapshot(obj)});
  }, []);

  return [state, handleEvent];
}

export function useGestureVisualizer(
  inputType: string,
  gestureType = 'Gesture State',
): [VisualizerHandlers, {data: GestureVisualizerState[]; onClick: () => void}] {
  const [id, setId] = useState(0);
  const onClick = useCallback(() => setId(v => v + 1), [setId]);
  const [inputData, inputHandler] = useGestureData(`${inputType}-${id}`, true);
  const [gestureData, gestureHandler] = useGestureData(`${gestureType}-${id}`);
  const gestureHandlers = useMemo(
    () => ({
      onStart: gestureHandler,
      onMove: gestureHandler,
      onEnd: gestureHandler,
      onInput: inputHandler,
      __debug: inputHandler,
    }),
    [gestureHandler, inputHandler],
  );
  const data = useMemo(() => [inputData, gestureData], [
    inputData,
    gestureData,
  ]);
  return [gestureHandlers, {data, onClick}];
}

export default forwardRef(function GestureVisualizer(
  {data, children, discrete, withCount, ...props}: GestureVisualizerProps,
  forwardedRef: React.Ref<HTMLDivElement>,
): JSX.Element {
  const [ref, setRef] = useRefCallback(null, forwardedRef);
  const {width, height} = useSize(ref);
  const allSeries = useGestureSeries(data);
  const xScale = useTimeStampScale(allSeries, width);
  const yFactor = usePowerScale(allSeries);
  const yScale = useDeltaScale(allSeries, height, yFactor);
  const colorScale = useColorScale(allSeries);

  return (
    <div
      ref={setRef}
      style={{
        overflow: 'hidden',
        position: 'relative',
        boxSizing: 'border-box',
        border: '1px solid black',
        maxWidth: 'calc(100% - 2px)',
        minHeight: 160,
        height: 320,
      }}
      {...props}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {children}
      </div>
      <div style={{position: 'absolute'}}>
        <Legend
          data={allSeries}
          withCount={withCount}
          colorScale={colorScale}
        />
      </div>
      <ScaleSVG width={width} height={height}>
        {discrete
          ? allSeries.map((series, index) => (
              <EventLines
                key={`series-discrete-${index}`}
                series={series}
                timeStampScale={xScale}
                deltaScale={yScale}
                fillColor={colorScale(String(series.id))}
                yFactor={yFactor(index)}
                height={height}
              />
            ))
          : allSeries.map((series, index) => (
              <EventAreas
                key={`series-${index}`}
                series={series}
                timeStampScale={xScale}
                deltaScale={yScale}
                fillColor={colorScale(String(series.id))}
                yFactor={yFactor(index)}
                height={height}
              />
            ))}
        <TooltipArea
          width={width}
          height={height}
          allSeries={allSeries}
          timeStampScale={xScale}
          deltaScale={yScale}
          colorScale={colorScale}
          yFactor={yFactor}
        />
      </ScaleSVG>
      <TooltipContent />
    </div>
  );
});

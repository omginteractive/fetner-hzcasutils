import React, {
  Fragment,
  useCallback,
  useState,
  useEffect,
  useMemo,
} from 'react';
import ReactDOM from 'react-dom';
import {Tooltip} from '@vx/tooltip';
import {Line, Bar} from '@vx/shape';
import {localPoint} from '@vx/event';
import {scaleQuantize} from '@vx/scale';
import {ScaleLinear, ScaleOrdinal, ScaleQuantize} from 'd3-scale';
import {bisector} from 'd3-array';
import {
  Snapshot,
  GestureVisualizerState,
  MovingAverageSnapshot,
  SnapshotState,
} from './GestureVisualizer';

interface TooltipState {
  label: string;
  height: number;
  left: number;
  top: number;
  data: Snapshot;
  strokeColor?: string;
}

interface TooltipLineProps {
  height: number;
  left: number;
  top: number;
  strokeColor?: string;
}

export interface TooltipAreaProps {
  width: number;
  height: number;
  allSeries: GestureVisualizerState[];
  timeStampScale: ScaleLinear<number, number>;
  deltaScale: ScaleLinear<number, number>;
  colorScale: ScaleOrdinal<string, string>;
  yFactor: ScaleLinear<number, number>;
  onTooltipChange?: (tooltip: TooltipState | null) => void;
}

const formatLabel = (label: string): string => `${label.split('-').shift()}`;

const bisectSnapshots = bisector((d: Snapshot) => d.timeStamp).right;

function compareTooltips(
  x: number,
  y: number,
): (a: TooltipState, b: TooltipState) => -1 | 0 | 1 {
  return (a, b) => {
    const diffAX = a.left > x ? a.left - x : x - a.left;
    const diffAY = a.top > y ? a.top - y : y - a.top;
    const diffA = Math.hypot(diffAX, diffAY);

    const diffBX = b.left > x ? b.left - x : x - b.left;
    const diffBY = b.top > y ? b.top - y : y - b.top;
    const diffB = Math.hypot(diffBX, diffBY);

    if (diffA < diffB) return 1;
    if (diffB < diffA) return -1;
    return 0;
  };
}

function createTooltip(
  label: string,
  snapshot: Snapshot,
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
  yFactor: number,
  height: number,
  strokeColor: string,
): TooltipState {
  return {
    data: snapshot,
    left: xScale(snapshot.timeStamp),
    top: height - yScale(snapshot.delta) * yFactor,
    height: height,
    strokeColor,
    label,
  };
}

function TooltipLine({
  height,
  left,
  top,
  strokeColor = 'rgba(92, 119, 235, 1.000)',
}: TooltipLineProps): JSX.Element {
  return (
    <g>
      <Line
        from={{x: left, y: 0}}
        to={{x: left, y: height}}
        stroke={strokeColor}
        strokeWidth={2}
        style={{pointerEvents: 'none'}}
        strokeDasharray="2,2"
      />
      <circle
        cx={left}
        cy={top + 1}
        r={4}
        fill="black"
        fillOpacity={0.1}
        stroke="black"
        strokeOpacity={0.1}
        strokeWidth={2}
        style={{pointerEvents: 'none'}}
      />
      <circle
        cx={left}
        cy={top}
        r={4}
        fill={strokeColor}
        stroke="white"
        strokeWidth={2}
        style={{pointerEvents: 'none'}}
      />
    </g>
  );
}

const tooltipContentRef: React.MutableRefObject<HTMLDivElement | null> = React.createRef();

export function TooltipContent(): JSX.Element {
  return (
    <div
      id="tooltip-content"
      ref={node => {
        tooltipContentRef.current = node;
      }}
    />
  );
}

function TooltipDataField({
  name,
  value,
}: {
  name: string;
  value: string | number | boolean | MovingAverageSnapshot | SnapshotState;
}): JSX.Element {
  return (
    <tr>
      <td
        style={{fontWeight: 'bold', textAlign: 'right', paddingRight: '0.5em'}}
      >
        {name}
      </td>
      {typeof value === 'object' ? (
        Object.entries(value).map(([key, nestedValue]) =>
          nestedValue === false ? null : nestedValue === true ? (
            <td key={key}>{key}</td>
          ) : (
            <td key={key}>{JSON.stringify(nestedValue)}</td>
          ),
        )
      ) : (
        <td>{JSON.stringify(value)}</td>
      )}
    </tr>
  );
}

function TooltipData(props: TooltipState): JSX.Element {
  const hasMovingAverage =
    typeof props.data.x === 'object' ||
    typeof props.data.y === 'object' ||
    typeof props.data.v === 'object';

  return (
    <figure style={{margin: '0.5em'}}>
      <h3 style={{textAlign: 'center', margin: '0.5em'}}>
        {formatLabel(props.label)}
      </h3>
      <table>
        <tbody>
          <TooltipDataField name="timeStamp" value={props.data.timeStamp} />
          <TooltipDataField name="delta" value={props.data.delta} />
          {typeof props.data.state === 'object' && (
            <TooltipDataField name="state" value={props.data.state} />
          )}
        </tbody>
      </table>
      {hasMovingAverage && (
        <table>
          <thead>
            <tr>
              <th></th>
              <th style={{paddingRight: '0.5em'}}>value</th>
              <th style={{paddingRight: '0.5em'}}>average</th>
              <th>deviation</th>
            </tr>
          </thead>
          <tbody>
            {props.data.x && <TooltipDataField name="x" value={props.data.x} />}
            {props.data.y && <TooltipDataField name="y" value={props.data.y} />}
            {props.data.v && <TooltipDataField name="v" value={props.data.v} />}
          </tbody>
        </table>
      )}
    </figure>
  );
}

function useTranslateScale(
  max: number,
  ...breaks: string[]
): ScaleQuantize<string> {
  const [transformScale] = useState(() => scaleQuantize<string>({}));
  useMemo(() => {
    transformScale.range(breaks);
    transformScale.domain([0, max]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transformScale, max, ...breaks]);
  return transformScale;
}

export default function TooltipArea({
  width,
  height,
  timeStampScale,
  deltaScale,
  colorScale,
  yFactor,
  allSeries,
  onTooltipChange,
}: TooltipAreaProps): JSX.Element {
  const translateX = useTranslateScale(width, '10%', '-110%');
  const translateY = useTranslateScale(height, '10%', '-50%', '-110%');
  const [tooltip, showTooltip] = useState<TooltipState | null>(null);
  const hideTooltip = useCallback(() => showTooltip(null), []);
  useEffect(() => {
    if (!allSeries || !allSeries.some(v => Boolean(v.data.length))) {
      hideTooltip();
    }
  }, [allSeries, hideTooltip]);
  useEffect(() => {
    if (typeof onTooltipChange === 'function') {
      onTooltipChange(tooltip);
    }
  }, [tooltip, onTooltipChange]);
  const handleTooltip = useCallback(
    (event: React.MouseEvent | React.TouchEvent): void => {
      switch (event.type) {
        case 'mouseleave': {
          hideTooltip();
          break;
        }
        default: {
          const {x, y} = localPoint(event) ?? {x: 0, y: 0};
          const approxTimeStamp = timeStampScale.invert(x);
          const candidates: TooltipState[] = [];
          for (let i = 0; i < allSeries.length; i++) {
            const series = allSeries[i];
            const snapshotIndex = bisectSnapshots(series.data, approxTimeStamp);
            const snapshotRight = series.data[snapshotIndex - 1];
            if (snapshotRight && snapshotRight.timeStamp) {
              candidates.push(
                createTooltip(
                  series.id,
                  snapshotRight,
                  timeStampScale,
                  deltaScale,
                  yFactor(i),
                  height,
                  colorScale(String(series.id)),
                ),
              );
            }
            const snapshotLeft = series.data[snapshotIndex];
            if (snapshotLeft && snapshotLeft.timeStamp) {
              candidates.push(
                createTooltip(
                  series.id,
                  snapshotLeft,
                  timeStampScale,
                  deltaScale,
                  yFactor(i),
                  height,
                  colorScale(String(series.id)),
                ),
              );
            }
          }
          const tooltipToShow = candidates.sort(compareTooltips(x, y)).pop();
          if (tooltipToShow) {
            showTooltip(tooltipToShow);
          } else {
            hideTooltip();
          }
          break;
        }
      }
    },
    [
      showTooltip,
      hideTooltip,
      allSeries,
      timeStampScale,
      deltaScale,
      colorScale,
      yFactor,
      height,
    ],
  );
  return (
    <Fragment>
      {tooltip && <TooltipLine {...tooltip} />}
      <Bar
        x={0}
        y={0}
        width={width}
        height={height}
        fill="transparent"
        onTouchStart={handleTooltip}
        onTouchMove={handleTooltip}
        onMouseMove={handleTooltip}
        onMouseLeave={handleTooltip}
      />
      {tooltip &&
        tooltipContentRef.current &&
        ReactDOM.createPortal(
          <Tooltip
            top={tooltip.top}
            left={tooltip.left}
            style={{
              transform: `translate(
                ${translateX(tooltip.left)},
                ${translateY(tooltip.top)}
              )`,
            }}
          >
            <TooltipData {...tooltip} />
          </Tooltip>,
          tooltipContentRef.current,
        )}
    </Fragment>
  );
}

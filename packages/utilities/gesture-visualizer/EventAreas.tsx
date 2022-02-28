import React, {Fragment} from 'react';
import {AreaClosed} from '@vx/shape';
import {curveMonotoneX} from '@vx/curve';
import {ScaleType} from '@vx/scale';
import {ScaleLinear} from 'd3-scale';
import {GestureVisualizerState, Snapshot} from './GestureVisualizer';

export interface EventAreasProps {
  series: GestureVisualizerState;
  timeStampScale: ScaleLinear<number, number>;
  deltaScale: ScaleLinear<number, number>;
  fillColor: string;
  yFactor: number;
  height: number;
}

function groupDataByGesture(series: GestureVisualizerState): Snapshot[][] {
  if (!series.data.length || series.data[0].state?.gesturing == null) {
    return [series.data];
  }
  const regions: Snapshot[][] = [];
  let wasGesturing = false;
  let region: Snapshot[] | null = null;
  for (const snapshot of series.data) {
    if (!wasGesturing && snapshot.state?.gesturing) {
      if (region) {
        throw new Error(
          `Unexpected gesture region start; A region was already started!`,
        );
      }
      region = [snapshot];
      regions.push(region);
    } else if (wasGesturing && snapshot.state?.gesturing) {
      if (!region) {
        throw new Error(
          `Unexpected gesture region end; No region was started!`,
        );
      }
      region.push(snapshot);
    } else if (wasGesturing && !snapshot.state?.gesturing) {
      if (!region) {
        throw new Error(
          `Unexpected gesture region end; No region was started!`,
        );
      }
      region.push(snapshot);
      region = null;
    }
    wasGesturing = Boolean(snapshot.state?.gesturing);
  }
  return regions;
}

export default function EventAreas({
  series,
  timeStampScale,
  deltaScale,
  fillColor,
  yFactor,
  height,
}: EventAreasProps): JSX.Element {
  const gestures = series.continuous
    ? [series.data]
    : groupDataByGesture(series);
  return (
    <Fragment>
      {gestures.map((data, index) => (
        <AreaClosed
          key={`gesture-${index}`}
          data={data}
          x={d => timeStampScale(d.timeStamp)}
          y0={d => height - deltaScale(d.delta) * yFactor}
          y1={height}
          yScale={deltaScale as ScaleType}
          curve={curveMonotoneX}
          fill={fillColor}
        />
      ))}
    </Fragment>
  );
}

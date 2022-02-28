import React from 'react';
import {LinePath, Line} from '@vx/shape';
import {Group} from '@vx/group';
import {curveMonotoneX} from '@vx/curve';
import {ScaleLinear} from 'd3-scale';
import {GestureVisualizerState} from './GestureVisualizer';

export interface EventAreasProps {
  series: GestureVisualizerState;
  timeStampScale: ScaleLinear<number, number>;
  deltaScale: ScaleLinear<number, number>;
  fillColor: string;
  yFactor: number;
  height: number;
}

export default function EventBars({
  series,
  timeStampScale,
  deltaScale,
  fillColor,
  yFactor,
  height,
}: EventAreasProps): JSX.Element {
  return series.continuous ? (
    <LinePath
      data={series.data}
      x={d => timeStampScale(d.timeStamp)}
      y={d => height - deltaScale(d.delta) * yFactor}
      stroke={fillColor}
      strokeWidth={2}
      curve={curveMonotoneX}
    />
  ) : (
    <Group>
      {series.data.map(d => (
        <Line
          key={d.timeStamp}
          from={{
            x: timeStampScale(d.timeStamp),
            y: height - deltaScale(d.delta) * yFactor,
          }}
          to={{x: timeStampScale(d.timeStamp), y: height}}
          stroke={fillColor}
          strokeWidth={2}
        />
      ))}
    </Group>
  );
}

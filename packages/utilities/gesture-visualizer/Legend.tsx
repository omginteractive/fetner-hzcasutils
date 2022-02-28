import React from 'react';
import {ScaleOrdinal} from 'd3-scale';
import {LegendOrdinal, LegendItem, LegendLabel} from '@vx/legend';
import {GestureVisualizerState} from './GestureVisualizer';

export interface LegendProps {
  data: GestureVisualizerState[];
  colorScale: ScaleOrdinal<string, string>;
  withCount?: boolean;
}

const getCount = (data: GestureVisualizerState[], id: string): number => {
  for (const d of data) {
    if (d.id === id) return d.data.length;
  }
  return 0;
};

const formatLabel = (data: GestureVisualizerState[], withCount?: boolean) => (
  label: string,
): string =>
  `${label.split('-').shift()}${withCount ? ` ${getCount(data, label)}` : ''}`;

export default function Legend({
  data,
  colorScale,
  withCount,
}: LegendProps): JSX.Element {
  return (
    <LegendOrdinal
      scale={colorScale}
      labelFormat={formatLabel(data, withCount)}
    >
      {labels => {
        return (
          <div style={{display: 'flex', flexDirection: 'row'}}>
            {labels.map((label, i) => {
              const size = 15;
              return (
                <LegendItem key={`legend-${i}`} margin={'0 5px'}>
                  <svg width={size} height={size}>
                    <rect fill={label.value} width={size} height={size} />
                  </svg>
                  <LegendLabel align={'left'} margin={'0 0 0 4px'}>
                    {label.text}
                  </LegendLabel>
                </LegendItem>
              );
            })}
          </div>
        );
      }}
    </LegendOrdinal>
  );
}
